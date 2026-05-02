"""Unit tests for embedder + cosine."""
import math

import pytest

from app.services.ai.embedder import EMBEDDING_DIM, _hash_to_vec, cosine, embed_text


def test_hash_vec_dimension_and_norm():
    v = _hash_to_vec("hello world")
    assert len(v) == EMBEDDING_DIM
    norm = math.sqrt(sum(x * x for x in v))
    assert abs(norm - 1.0) < 1e-6


def test_hash_vec_deterministic():
    v1 = _hash_to_vec("identical text")
    v2 = _hash_to_vec("identical text")
    assert v1 == v2


def test_cosine_self_is_one():
    v = _hash_to_vec("hello")
    score = cosine(v, v)
    assert abs(score - 1.0) < 1e-6


def test_cosine_different_texts_lt_one():
    a = _hash_to_vec("first text")
    b = _hash_to_vec("totally different content")
    s = cosine(a, b)
    assert s < 0.99


@pytest.mark.asyncio
async def test_embed_text_returns_dim():
    v = await embed_text("テスト")
    assert len(v) == EMBEDDING_DIM
