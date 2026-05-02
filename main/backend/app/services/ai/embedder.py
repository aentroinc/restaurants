"""Hash-based text embedding for demo use (no external API needed).

Produces 1024-dim vectors where texts sharing bi-grams/words get similar
vectors.  Good enough for demo RAG; swap for voyage-3 or
text-embedding-3-small in production.
"""
import hashlib
import math


def embed_text(text: str, dim: int = 1024) -> list[float]:
    tokens = set()
    # bi-grams (works for Japanese)
    for i in range(len(text) - 1):
        tokens.add(text[i:i + 2])
    # word-level prefixes
    for word in text.split():
        tokens.add(word[:4])

    vec = [0.0] * dim
    for token in tokens:
        h = hashlib.md5(token.encode()).hexdigest()
        for j in range(0, min(len(h), 8), 2):
            idx = int(h[j:j + 2], 16) % dim
            val = int(h[j + 2:j + 4] if j + 4 <= len(h) else h[:2], 16) / 255.0 - 0.5
            vec[idx] += val

    # L2 normalize
    norm = math.sqrt(sum(v * v for v in vec))
    if norm > 0:
        vec = [v / norm for v in vec]

    return vec
