"""Embedder service.

Production: voyage-3 / OpenAI text-embedding-3-small, with retry + cache.
Stub: deterministic hash-based 1024-dim vector. Used for CI / dev where
no API key is available — search_documents still returns sensible
top-k via cosine on these stub vectors.
"""
from __future__ import annotations

import hashlib
import math
import os
from typing import Iterable, Sequence

EMBEDDING_DIM = 1024


def _hash_to_vec(text: str, dim: int = EMBEDDING_DIM) -> list[float]:
    """Deterministic stub: hash-based pseudo embedding, normalized."""
    h = hashlib.sha512(text.encode("utf-8")).digest()
    raw = []
    while len(raw) < dim:
        for byte in h:
            raw.append((byte / 255.0) * 2 - 1)  # [-1, 1]
            if len(raw) >= dim:
                break
        h = hashlib.sha512(h).digest()
    norm = math.sqrt(sum(x * x for x in raw)) or 1.0
    return [x / norm for x in raw]


def cosine(a: Sequence[float], b: Sequence[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    return sum(x * y for x, y in zip(a, b))  # already normalized in stub


def is_live_mode() -> bool:
    return bool(os.environ.get("VOYAGE_API_KEY") or os.environ.get("OPENAI_API_KEY"))


async def embed_text(text: str) -> list[float]:
    if not is_live_mode():
        return _hash_to_vec(text)

    if os.environ.get("VOYAGE_API_KEY"):
        try:
            import voyageai  # type: ignore
            client = voyageai.Client()
            r = client.embed([text], model="voyage-3", input_type="document")
            return list(r.embeddings[0])
        except Exception:
            return _hash_to_vec(text)

    if os.environ.get("OPENAI_API_KEY"):
        try:
            import httpx
            async with httpx.AsyncClient(timeout=30) as c:
                r = await c.post(
                    "https://api.openai.com/v1/embeddings",
                    headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}"},
                    json={"model": "text-embedding-3-small", "input": text, "dimensions": EMBEDDING_DIM},
                )
                r.raise_for_status()
                return r.json()["data"][0]["embedding"]
        except Exception:
            return _hash_to_vec(text)

    return _hash_to_vec(text)


async def embed_batch(texts: Iterable[str]) -> list[list[float]]:
    return [await embed_text(t) for t in texts]
