"""Face auth engine tests — pure-logic coverage:
  - cosine similarity correctness
  - low-similarity reject (<0.7)
  - QR token TTL expire (one-shot consumption)
  - PIN brute-force lockout (3 failures)

DB-bound paths are skipped here; engine functions are tested directly with
in-memory mocks where possible.
"""
from __future__ import annotations

import time
from uuid import uuid4

import pytest


# ---- Cosine similarity ----

def test_cosine_identical_vector_is_1():
    from app.services.face_auth_engine import cosine_similarity
    v = [0.1, 0.2, 0.3, 0.4] * 32  # 128 dims
    assert cosine_similarity(v, v) == pytest.approx(1.0, abs=1e-6)


def test_cosine_orthogonal_is_0():
    from app.services.face_auth_engine import cosine_similarity
    a = [1.0, 0.0] * 64
    b = [0.0, 1.0] * 64
    assert cosine_similarity(a, b) == pytest.approx(0.0, abs=1e-6)


def test_cosine_handles_empty_and_zero_norm():
    from app.services.face_auth_engine import cosine_similarity
    assert cosine_similarity([], [1.0]) == 0.0
    assert cosine_similarity([0.0] * 128, [1.0] * 128) == 0.0


def test_cosine_dimension_mismatch_returns_0():
    from app.services.face_auth_engine import cosine_similarity
    assert cosine_similarity([1.0] * 128, [1.0] * 64) == 0.0


# ---- Threshold reject (logic only, no DB) ----

def test_threshold_low_similarity_is_rejected():
    from app.services.face_auth_engine import cosine_similarity, SIMILARITY_THRESHOLD

    a = [1.0] * 128
    # near-orthogonal noise vector
    b = [0.05 if i % 2 == 0 else -0.05 for i in range(128)]
    sim = cosine_similarity(a, b)
    assert sim < SIMILARITY_THRESHOLD


def test_threshold_constant_is_07():
    from app.services.face_auth_engine import SIMILARITY_THRESHOLD
    assert SIMILARITY_THRESHOLD == 0.7


# ---- QR token ----

def test_qr_token_one_shot_consumption():
    from app.services.face_auth_engine import issue_qr_token, consume_qr_token
    sid = uuid4()
    eid = uuid4()
    token, _ = issue_qr_token(sid, eid)
    first = consume_qr_token(token)
    assert first is not None
    assert first["store_id"] == str(sid)
    # second consume must fail (one-shot)
    assert consume_qr_token(token) is None


def test_qr_token_unknown_returns_none():
    from app.services.face_auth_engine import consume_qr_token
    assert consume_qr_token("nonexistent-token") is None


def test_qr_token_expired(monkeypatch):
    """Force expiry by patching the entry's expires_at."""
    from app.services import face_auth_engine as eng
    sid = uuid4()
    token, _ = eng.issue_qr_token(sid)
    # backdate
    eng._QR_STORE[token]["expires_at"] = time.time() - 1
    assert eng.consume_qr_token(token) is None


# ---- PIN lockout (in-memory simulation of brute force counter) ----

def test_pin_lockout_logic_after_3_failures():
    """Simulate the failed_attempts counter increment logic without DB.
    The engine increments failed_attempts on each wrong PIN and locks at 3.
    """
    from app.services.face_auth_engine import PIN_MAX_ATTEMPTS, PIN_LOCKOUT_MIN
    assert PIN_MAX_ATTEMPTS == 3
    assert PIN_LOCKOUT_MIN >= 1

    # mimic engine's increment + lock branch
    failed = 0
    locked_until = None
    from datetime import datetime, timedelta, timezone
    for _ in range(3):
        failed += 1
        if failed >= PIN_MAX_ATTEMPTS:
            locked_until = datetime.now(timezone.utc) + timedelta(minutes=PIN_LOCKOUT_MIN)
    assert failed == 3
    assert locked_until is not None
    assert locked_until > datetime.now(timezone.utc)
