"""Smoke tests for /auth/me + /auth/switch-store.

These exercise the auth helpers + JWT shape directly so they don't require a
running DB. The full integration is covered by the seed + e2e harness.
"""
from __future__ import annotations

from app.auth import create_access_token, decode_token


def test_jwt_includes_current_store_and_purpose_token():
    token = create_access_token(
        user_id="00000000-0000-0000-0000-000000000aaa",
        tenant_id="00000000-0000-0000-0000-000000000001",
        role="manager",
        scopes=[],
        current_store_id="11111111-1111-1111-1111-111111111111",
        purpose_token="deadbeef",
    )
    payload = decode_token(token)
    assert payload["sub"] == "00000000-0000-0000-0000-000000000aaa"
    assert payload["role"] == "manager"
    assert payload["current_store_id"] == "11111111-1111-1111-1111-111111111111"
    assert payload["purpose_token"] == "deadbeef"


def test_jwt_omits_optional_when_unset():
    token = create_access_token(
        user_id="u",
        tenant_id="t",
        role="staff",
        scopes=[],
    )
    payload = decode_token(token)
    assert "current_store_id" not in payload
    assert "purpose_token" not in payload


def test_resolve_current_store_prefers_jwt_when_assigned():
    from app.api.v1.auth import _resolve_current_store_id
    assigned = [
        {"id": "s1", "is_default": True},
        {"id": "s2", "is_default": False},
    ]
    assert _resolve_current_store_id({"current_store_id": "s2"}, assigned) == "s2"


def test_resolve_current_store_falls_back_to_default_then_first():
    from app.api.v1.auth import _resolve_current_store_id
    assigned = [
        {"id": "s1", "is_default": False},
        {"id": "s2", "is_default": True},
    ]
    # JWT value not in assigned list → ignored.
    assert _resolve_current_store_id({"current_store_id": "ghost"}, assigned) == "s2"
    # Empty JWT → default flag wins.
    assert _resolve_current_store_id({}, assigned) == "s2"
    # No defaults → first.
    assigned2 = [{"id": "a", "is_default": False}, {"id": "b", "is_default": False}]
    assert _resolve_current_store_id({}, assigned2) == "a"
    # Empty list → None.
    assert _resolve_current_store_id({}, []) is None


def test_user_store_assignment_model_imports():
    from app.models.user_assignment import UserStoreAssignment
    assert UserStoreAssignment.__tablename__ == "user_store_assignments"
    cols = {c.name for c in UserStoreAssignment.__table__.columns}
    assert {"user_id", "store_id", "role", "is_default", "tenant_id"} <= cols


def test_users_model_has_default_store_id():
    from app.models.user import User
    cols = {c.name for c in User.__table__.columns}
    assert "default_store_id" in cols
