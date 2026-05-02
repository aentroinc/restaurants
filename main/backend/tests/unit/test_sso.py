"""Unit tests for OIDC + SAML helpers (stub mode)."""
import pytest

from app.services.auth.oidc import OIDCClient, map_groups_to_role
from app.services.auth.saml import SAMLServiceProvider, map_groups_to_role as saml_map


def test_oidc_authorize_url_contains_client_id():
    c = OIDCClient({
        "issuer": "https://login.example.com",
        "client_id": "abc",
        "redirect_uri": "http://localhost/cb",
    })
    url, state, nonce = c.build_authorize_url()
    assert "client_id=abc" in url
    assert state in url
    assert "nonce=" in url


@pytest.mark.asyncio
async def test_oidc_stub_exchange_returns_test_identity():
    c = OIDCClient({"issuer": "https://example", "client_id": "x", "redirect_uri": "y"})
    claims = await c.exchange_code("CODE12345")
    assert claims.email is not None
    assert "stub" in claims.raw or claims.email.endswith("@example.com")
    assert claims.groups


def test_role_mapping_returns_first_match():
    mapping = {"aentro-admin": "admin", "_default": "viewer"}
    assert map_groups_to_role(["aentro-admin"], mapping) == "admin"
    assert map_groups_to_role(["unknown-group"], mapping) == "viewer"


def test_saml_stub_returns_attrs():
    sp = SAMLServiceProvider({"stub": True})
    attrs = sp.parse_assertion("ignored")
    assert attrs.email
    assert attrs.groups


def test_saml_role_mapping_default():
    assert saml_map([], {"_default": "store_staff"}) == "store_staff"
