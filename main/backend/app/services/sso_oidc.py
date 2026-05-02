"""OIDC SSO service — minimal self-built (httpx + PyJWT) implementation.

Flow:
  start_oidc_login -> {authorize_url, state, nonce}
  complete_oidc_login(state, code, db) -> {access_token, user}

Dependencies: httpx, PyJWT (jwt.algorithms.RSAAlgorithm for JWKS).
JWKS is fetched and cached in-process for 10 min.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import secrets
import time
import uuid
from typing import Any
from urllib.parse import urlencode

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import ALGORITHM, SECRET_KEY, create_access_token
from app.config import settings
from app.models.auth_enterprise import IdentityProvider
from app.models.user import AccessScope, User

# in-process state cache: state -> {provider_id, tenant_id, nonce, expires_at}
_STATE_CACHE: dict[str, dict[str, Any]] = {}
_STATE_TTL = 600  # 10 min

# in-process JWKS cache: jwks_uri -> {keys, expires_at}
_JWKS_CACHE: dict[str, dict[str, Any]] = {}
_JWKS_TTL = 600


class OIDCError(Exception):
    pass


def _now() -> int:
    return int(time.time())


def _gc_state() -> None:
    now = _now()
    expired = [k for k, v in _STATE_CACHE.items() if v["expires_at"] < now]
    for k in expired:
        _STATE_CACHE.pop(k, None)


def _sign_state(raw: str) -> str:
    sig = hmac.new(SECRET_KEY.encode(), raw.encode(), hashlib.sha256).hexdigest()[:16]
    return f"{raw}.{sig}"


def _verify_state_sig(state: str) -> str:
    if "." not in state:
        raise OIDCError("invalid state format")
    raw, sig = state.rsplit(".", 1)
    expected = hmac.new(SECRET_KEY.encode(), raw.encode(), hashlib.sha256).hexdigest()[:16]
    if not hmac.compare_digest(sig, expected):
        raise OIDCError("invalid state signature")
    return raw


async def _fetch_jwks(jwks_uri: str) -> list[dict]:
    cached = _JWKS_CACHE.get(jwks_uri)
    if cached and cached["expires_at"] > _now():
        return cached["keys"]
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(jwks_uri)
        if resp.status_code != 200:
            raise OIDCError(f"jwks fetch failed: {resp.status_code}")
        keys = resp.json().get("keys", [])
    _JWKS_CACHE[jwks_uri] = {"keys": keys, "expires_at": _now() + _JWKS_TTL}
    return keys


def _select_jwk(keys: list[dict], kid: str | None) -> dict:
    if kid:
        for k in keys:
            if k.get("kid") == kid:
                return k
    # fallback: first signing key
    for k in keys:
        if k.get("use", "sig") == "sig":
            return k
    raise OIDCError("no matching JWK found")


def _verify_id_token(id_token: str, jwks_keys: list[dict], audience: str, issuer: str, nonce: str | None) -> dict:
    """Verify JWS-signed id_token using PyJWT + JWKS."""
    try:
        import jwt as pyjwt
        from jwt.algorithms import RSAAlgorithm
    except ImportError as e:
        raise OIDCError(f"PyJWT not installed: {e}")

    headers = pyjwt.get_unverified_header(id_token)
    kid = headers.get("kid")
    alg = headers.get("alg", "RS256")
    jwk = _select_jwk(jwks_keys, kid)
    public_key = RSAAlgorithm.from_jwk(json.dumps(jwk))

    try:
        claims = pyjwt.decode(
            id_token,
            public_key,
            algorithms=[alg],
            audience=audience,
            issuer=issuer,
            options={"require": ["exp", "iat", "iss", "sub"]},
        )
    except pyjwt.PyJWTError as e:
        raise OIDCError(f"id_token verification failed: {e}")

    if nonce is not None and claims.get("nonce") != nonce:
        raise OIDCError("nonce mismatch")
    return claims


async def start_oidc_login(
    db: AsyncSession,
    tenant_id: str,
    idp_id: str,
    redirect_uri: str | None = None,
) -> dict[str, str]:
    """Generate state + nonce, return authorize URL."""
    result = await db.execute(
        select(IdentityProvider).where(
            IdentityProvider.id == idp_id,
            IdentityProvider.tenant_id == tenant_id,
            IdentityProvider.type == "oidc",
            IdentityProvider.enabled == True,
        )
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise OIDCError("OIDC provider not found")

    config = provider.config or {}
    if not config.get("authorize_url") or not config.get("client_id"):
        raise OIDCError("provider misconfigured: authorize_url/client_id required")

    nonce = secrets.token_urlsafe(16)
    raw_state = f"{provider.id}:{tenant_id}:{secrets.token_urlsafe(8)}"
    state = _sign_state(raw_state)

    _gc_state()
    _STATE_CACHE[state] = {
        "provider_id": str(provider.id),
        "tenant_id": str(tenant_id),
        "nonce": nonce,
        "redirect_uri": redirect_uri or config.get("redirect_uri"),
        "expires_at": _now() + _STATE_TTL,
    }

    params = {
        "response_type": "code",
        "client_id": config["client_id"],
        "redirect_uri": redirect_uri or config.get("redirect_uri", ""),
        "scope": config.get("scope", "openid email profile"),
        "state": state,
        "nonce": nonce,
    }
    authorize_url = f"{config['authorize_url']}?{urlencode(params)}"
    return {"authorize_url": authorize_url, "state": state, "nonce": nonce}


async def complete_oidc_login(
    db: AsyncSession,
    state: str,
    code: str,
) -> dict[str, Any]:
    """Exchange code, verify id_token, upsert user, mint local JWT."""
    _verify_state_sig(state)
    cached = _STATE_CACHE.pop(state, None)
    if not cached:
        raise OIDCError("state expired or unknown")
    if cached["expires_at"] < _now():
        raise OIDCError("state expired")

    provider_id = cached["provider_id"]
    tenant_id = cached["tenant_id"]
    nonce = cached["nonce"]
    redirect_uri = cached["redirect_uri"]

    result = await db.execute(
        select(IdentityProvider).where(IdentityProvider.id == provider_id)
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise OIDCError("provider not found")
    config = provider.config or {}

    # Token exchange
    async with httpx.AsyncClient(timeout=15.0) as client:
        token_resp = await client.post(
            config["token_url"],
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri or "",
                "client_id": config["client_id"],
                "client_secret": config.get("client_secret", ""),
            },
            headers={"Accept": "application/json"},
        )
        if token_resp.status_code != 200:
            raise OIDCError(f"token endpoint failed: {token_resp.status_code} {token_resp.text[:200]}")
        token_data = token_resp.json()

    id_token = token_data.get("id_token")
    if not id_token:
        raise OIDCError("no id_token in token response")

    # JWKS verify
    jwks_uri = config.get("jwks_uri")
    issuer = config.get("issuer", "")
    if jwks_uri:
        jwks_keys = await _fetch_jwks(jwks_uri)
        claims = _verify_id_token(
            id_token,
            jwks_keys,
            audience=config["client_id"],
            issuer=issuer,
            nonce=nonce,
        )
    else:
        # No JWKS configured — decode without verification (dev only).
        # Production providers MUST set jwks_uri.
        try:
            import jwt as pyjwt
            claims = pyjwt.decode(id_token, options={"verify_signature": False})
        except Exception as e:
            raise OIDCError(f"id_token decode failed: {e}")
        if nonce is not None and claims.get("nonce") != nonce:
            raise OIDCError("nonce mismatch")

    email = claims.get("email") or claims.get("preferred_username")
    if not email:
        raise OIDCError("no email/preferred_username in id_token")

    # Role mapping from groups
    groups = claims.get("groups") or []
    role_mapping = provider.role_mapping or {}
    target_role = "viewer"
    for g in groups:
        if g in role_mapping:
            target_role = role_mapping[g]
            break

    # Upsert user
    user_q = await db.execute(
        select(User).where(User.email == email, User.tenant_id == tenant_id)
    )
    user = user_q.scalar_one_or_none()
    if not user:
        user = User(
            tenant_id=uuid.UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
            email=email,
            name=claims.get("name", email),
            role=target_role,
            active=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        user.role = target_role
        await db.commit()

    scopes_q = await db.execute(select(AccessScope).where(AccessScope.user_id == user.id))
    scopes = [
        {"scope_type": s.scope_type, "scope_id": str(s.scope_id)}
        for s in scopes_q.scalars().all()
    ]
    access_token = create_access_token(
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
        role=user.role,
        scopes=scopes,
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "role": user.role,
            "name": user.name,
        },
        "claims": {"sub": claims.get("sub"), "iss": claims.get("iss")},
    }
