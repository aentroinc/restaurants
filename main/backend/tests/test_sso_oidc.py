"""OIDC flow tests with mocked IdP (token endpoint + JWKS)."""
from __future__ import annotations

import base64
import json
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

pyjwt = pytest.importorskip("jwt", reason="PyJWT required for OIDC signature tests")


def _b64u(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _make_signed_id_token(claims: dict, private_key, kid: str = "test-kid") -> str:
    """Use PyJWT to create a real RS256-signed id_token."""
    import jwt as pyjwt
    return pyjwt.encode(claims, private_key, algorithm="RS256", headers={"kid": kid})


def _rsa_keypair():
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_numbers = private_key.public_key().public_numbers()
    n = _b64u(public_numbers.n.to_bytes((public_numbers.n.bit_length() + 7) // 8, "big"))
    e = _b64u(public_numbers.e.to_bytes((public_numbers.e.bit_length() + 7) // 8, "big"))
    jwk = {"kty": "RSA", "kid": "test-kid", "alg": "RS256", "use": "sig", "n": n, "e": e}
    return private_key, jwk


@pytest.mark.asyncio
async def test_oidc_state_signing():
    from app.services.sso_oidc import _sign_state, _verify_state_sig
    raw = "abc:def:ghi"
    signed = _sign_state(raw)
    assert _verify_state_sig(signed) == raw


@pytest.mark.asyncio
async def test_oidc_state_tampering_rejected():
    from app.services.sso_oidc import OIDCError, _sign_state, _verify_state_sig
    signed = _sign_state("abc:def")
    tampered = signed[:-2] + "ZZ"
    with pytest.raises(OIDCError):
        _verify_state_sig(tampered)


@pytest.mark.asyncio
async def test_id_token_verify_with_jwks():
    """End-to-end signature verification with a freshly generated RSA key."""
    private_key, jwk = _rsa_keypair()
    now = int(time.time())
    claims = {
        "iss": "https://idp.example.com",
        "aud": "client-123",
        "sub": "user-1",
        "email": "alice@example.com",
        "iat": now,
        "exp": now + 600,
        "nonce": "n-abc",
    }
    token = _make_signed_id_token(claims, private_key)
    from app.services.sso_oidc import _verify_id_token
    result = _verify_id_token(token, [jwk], audience="client-123", issuer="https://idp.example.com", nonce="n-abc")
    assert result["email"] == "alice@example.com"


@pytest.mark.asyncio
async def test_id_token_wrong_audience_rejected():
    private_key, jwk = _rsa_keypair()
    now = int(time.time())
    claims = {"iss": "https://idp.example.com", "aud": "wrong", "sub": "u1", "iat": now, "exp": now + 60}
    token = _make_signed_id_token(claims, private_key)
    from app.services.sso_oidc import OIDCError, _verify_id_token
    with pytest.raises(OIDCError):
        _verify_id_token(token, [jwk], audience="client-123", issuer="https://idp.example.com", nonce=None)


@pytest.mark.asyncio
async def test_id_token_wrong_nonce_rejected():
    private_key, jwk = _rsa_keypair()
    now = int(time.time())
    claims = {"iss": "iss", "aud": "aud", "sub": "u", "iat": now, "exp": now + 60, "nonce": "real"}
    token = _make_signed_id_token(claims, private_key)
    from app.services.sso_oidc import OIDCError, _verify_id_token
    with pytest.raises(OIDCError):
        _verify_id_token(token, [jwk], audience="aud", issuer="iss", nonce="fake")


def test_jwks_cache_module_present():
    from app.services import sso_oidc
    assert hasattr(sso_oidc, "_JWKS_CACHE")
    assert hasattr(sso_oidc, "_fetch_jwks")
