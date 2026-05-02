"""SCIM v2 helper + auth tests."""
import os

import pytest
from httpx import AsyncClient, ASGITransport


@pytest.fixture
def client():
    from app.main import app
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


def test_user_to_scim_shape():
    from app.services.scim import USER_SCHEMA, user_to_scim
    from datetime import datetime, timezone
    import uuid as _uuid

    class FakeUser:
        id = _uuid.uuid4()
        email = "a@b.com"
        name = "A B"
        role = "viewer"
        active = True
        created_at = datetime.now(timezone.utc)
        updated_at = datetime.now(timezone.utc)

    out = user_to_scim(FakeUser())
    assert USER_SCHEMA in out["schemas"]
    assert out["userName"] == "a@b.com"
    assert out["emails"][0]["value"] == "a@b.com"
    assert out["meta"]["resourceType"] == "User"


def test_parse_filter_eq():
    from app.services.scim import parse_filter
    assert parse_filter('userName eq "alice@example.com"') == ("userName", "alice@example.com")
    assert parse_filter("userName eq alice") == ("userName", "alice")
    assert parse_filter(None) is None
    assert parse_filter("invalid filter") is None


def test_scim_to_user_fields_basic():
    from app.services.scim import scim_to_user_fields
    payload = {
        "userName": "bob@example.com",
        "displayName": "Bob",
        "active": True,
        "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": {"department": "manager"},
    }
    f = scim_to_user_fields(payload)
    assert f["email"] == "bob@example.com"
    assert f["name"] == "Bob"
    assert f["active"] is True
    assert f["role"] == "manager"


def test_apply_patch_replace_active():
    from app.services.scim import apply_patch_ops

    class U:
        active = True
        name = "x"
        email = "x@y.z"

    u = U()
    apply_patch_ops(u, [{"op": "replace", "path": "active", "value": False}])
    assert u.active is False


def test_list_response_envelope():
    from app.services.scim import LIST_RESPONSE, list_response
    body = list_response([{"id": "1"}], total=1, start=1, count=1)
    assert LIST_RESPONSE in body["schemas"]
    assert body["totalResults"] == 1
    assert body["Resources"] == [{"id": "1"}]


@pytest.mark.asyncio
async def test_scim_requires_auth(client, monkeypatch):
    monkeypatch.setenv("SCIM_TOKEN", "test-token")
    async with client as c:
        r = await c.get("/scim/v2/Users")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_scim_503_when_not_configured(client, monkeypatch):
    monkeypatch.delenv("SCIM_TOKEN", raising=False)
    async with client as c:
        r = await c.get("/scim/v2/Users", headers={"Authorization": "Bearer x"})
    assert r.status_code == 503


@pytest.mark.asyncio
async def test_scim_service_provider_config(client, monkeypatch):
    monkeypatch.setenv("SCIM_TOKEN", "test-token")
    async with client as c:
        r = await c.get(
            "/scim/v2/ServiceProviderConfig",
            headers={"Authorization": "Bearer test-token"},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["patch"]["supported"] is True
    assert body["filter"]["supported"] is True


@pytest.mark.asyncio
async def test_scim_invalid_token_rejected(client, monkeypatch):
    monkeypatch.setenv("SCIM_TOKEN", "test-token")
    async with client as c:
        r = await c.get(
            "/scim/v2/Users",
            headers={"Authorization": "Bearer wrong-token"},
        )
    assert r.status_code == 401
