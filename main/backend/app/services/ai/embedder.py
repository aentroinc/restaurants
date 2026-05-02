"""Text embedding service.

Backend selectable via EMBEDDING_BACKEND env var:
- hash   : local hash-based 1024-dim (no API). Default fallback.
- voyage : voyage-3 (1024-dim) via VOYAGE_API_KEY.
- openai : text-embedding-3-small (1536-dim, padded/truncated to 1024 to keep DB schema).
- anthropic : reserved; Anthropic does not yet ship a public embeddings API,
              so this falls back to hash so the contract stays intact.

Public API (kept stable):
- embed_text(text, dim=1024) -> list[float]
- embed_batch(texts, dim=1024) -> list[list[float]]   (new — batched calls)
"""
import hashlib
import math
import os
from typing import Iterable

import httpx


DEFAULT_DIM = 1024


def _backend() -> str:
    return (os.environ.get("EMBEDDING_BACKEND") or "hash").lower().strip()


def _hash_embed(text: str, dim: int = DEFAULT_DIM) -> list[float]:
    tokens: set[str] = set()
    for i in range(len(text) - 1):
        tokens.add(text[i:i + 2])
    for word in text.split():
        tokens.add(word[:4])

    vec = [0.0] * dim
    for token in tokens:
        h = hashlib.md5(token.encode()).hexdigest()
        for j in range(0, min(len(h), 8), 2):
            idx = int(h[j:j + 2], 16) % dim
            val = int(h[j + 2:j + 4] if j + 4 <= len(h) else h[:2], 16) / 255.0 - 0.5
            vec[idx] += val

    norm = math.sqrt(sum(v * v for v in vec))
    if norm > 0:
        vec = [v / norm for v in vec]
    return vec


def _resize(vec: list[float], dim: int) -> list[float]:
    if len(vec) == dim:
        return vec
    if len(vec) > dim:
        out = vec[:dim]
    else:
        out = list(vec) + [0.0] * (dim - len(vec))
    norm = math.sqrt(sum(v * v for v in out))
    if norm > 0:
        out = [v / norm for v in out]
    return out


def _voyage_embed(texts: list[str], dim: int) -> list[list[float]]:
    api_key = os.environ.get("VOYAGE_API_KEY", "")
    if not api_key:
        raise RuntimeError("VOYAGE_API_KEY not set")
    url = "https://api.voyageai.com/v1/embeddings"
    payload = {"input": texts, "model": "voyage-3", "input_type": "document"}
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    with httpx.Client(timeout=30.0) as client:
        r = client.post(url, json=payload, headers=headers)
        r.raise_for_status()
        data = r.json()
    return [_resize(item["embedding"], dim) for item in data["data"]]


def _openai_embed(texts: list[str], dim: int) -> list[list[float]]:
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set")
    url = "https://api.openai.com/v1/embeddings"
    payload = {"input": texts, "model": "text-embedding-3-small"}
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    with httpx.Client(timeout=30.0) as client:
        r = client.post(url, json=payload, headers=headers)
        r.raise_for_status()
        data = r.json()
    return [_resize(item["embedding"], dim) for item in data["data"]]


def _dispatch_batch(texts: list[str], dim: int) -> list[list[float]]:
    backend = _backend()
    if not texts:
        return []
    try:
        if backend == "voyage":
            return _voyage_embed(texts, dim)
        if backend == "openai":
            return _openai_embed(texts, dim)
        return [_hash_embed(t, dim) for t in texts]
    except Exception:
        # graceful fallback so RAG keeps working in demo mode even if API call fails
        return [_hash_embed(t, dim) for t in texts]


def embed_text(text: str, dim: int = DEFAULT_DIM) -> list[float]:
    """Embed a single text. Signature preserved for backwards compatibility."""
    return _dispatch_batch([text], dim)[0]


def embed_batch(texts: Iterable[str], dim: int = DEFAULT_DIM) -> list[list[float]]:
    """Embed many texts in one call when the backend supports batching."""
    arr = list(texts)
    return _dispatch_batch(arr, dim)


def active_backend() -> str:
    return _backend()
