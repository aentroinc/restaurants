"""SSO endpoints (OIDC + SAML) and MFA enrollment / verification.

Provides:
  GET  /api/v1/auth/oidc/{provider_id}/start
  GET  /api/v1/auth/oidc/{provider_id}/callback
  GET  /api/v1/auth/saml/{provider_id}/redirect
  POST /api/v1/auth/saml/{provider_id}/acs
  POST /api/v1/auth/mfa/enroll
  POST /api/v1/auth/mfa/verify
  GET  /api/v1/auth/identity-providers
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import create_access_token, get_current_user
from app.core.tenant_context import get_tenant_or_demo
from app.database import get_db
from app.models.identity import AccessLog, IdentityProvider, MFASecret
from app.models.user import AccessScope, User
from app.services.auth.mfa import (
    consume_backup_code, decrypt_secret, encrypt_backup_codes, encrypt_secret,
    generate_backup_codes, generate_secret, provisioning_uri, verify_totp,
)
from app.services.auth.oidc import OIDCClient, map_groups_to_role
from app.services.auth.saml import SAMLServiceProvider
from app.services.auth.saml import map_groups_to_role as saml_map_groups

router = APIRouter(prefix="/api/v1/auth", tags=["auth-sso"])


def _client_ip(request: Request) -> str | None:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else None


def _emit_access_log(db: AsyncSession, **kwargs):
    db.add(AccessLog(**kwargs))


# ---- IdP listing ----

@router.get("/identity-providers")
async def list_idps(db: AsyncSession = Depends(get_db)):
    tenant_id = get_tenant_or_demo()
    res = await db.execute(
        select(IdentityProvider).where(
            IdentityProvider.tenant_id == tenant_id,
            IdentityProvider.enabled == True,  # noqa: E712
        )
    )
    return [
        {"id": str(p.id), "name": p.name, "type": p.type, "is_default": p.is_default}
        for p in res.scalars().all()
    ]


# ---- OIDC ----

@router.get("/oidc/{provider_id}/start")
async def oidc_start(provider_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(IdentityProvider).where(IdentityProvider.id == provider_id))
    p = res.scalar_one_or_none()
    if not p or p.type != "oidc" or not p.enabled:
        raise HTTPException(404, "OIDC provider not found")
    client = OIDCClient(p.config)
    url, state, nonce = client.build_authorize_url()
    # Persist state on the IdP row (per-request); production uses a dedicated cache
    p.config = {**(p.config or {}), "_pending_state": state, "_pending_nonce": nonce}
    await db.commit()
    return {"authorize_url": url, "state": state}


class OIDCCallbackIn(BaseModel):
    code: str
    state: str


@router.post("/oidc/{provider_id}/callback")
async def oidc_callback(
    provider_id: str,
    body: OIDCCallbackIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(IdentityProvider).where(IdentityProvider.id == provider_id))
    p = res.scalar_one_or_none()
    if not p or p.type != "oidc":
        raise HTTPException(404)

    if (p.config or {}).get("_pending_state") != body.state:
        _emit_access_log(
            db, tenant_id=p.tenant_id, event="login_oidc",
            result="deny", deny_reason="state_mismatch",
            ip_address=_client_ip(request),
        )
        await db.commit()
        raise HTTPException(400, "Invalid state")

    client = OIDCClient(p.config)
    claims = await client.exchange_code(body.code)
    role = map_groups_to_role(claims.groups, p.role_mapping or {}) or "viewer"

    # Find or create user
    user = None
    if claims.email:
        u_q = await db.execute(
            select(User).where(User.tenant_id == p.tenant_id, User.email == claims.email)
        )
        user = u_q.scalar_one_or_none()
    if user is None:
        user = User(
            tenant_id=p.tenant_id,
            email=claims.email or f"{claims.sub}@oidc",
            name=claims.name or claims.email or claims.sub,
            role=role,
            active=True,
        )
        db.add(user)
        await db.flush()
    else:
        # Update role if mapping says so
        user.role = role

    scopes_q = await db.execute(select(AccessScope).where(AccessScope.user_id == user.id))
    scopes = [
        {"scope_type": s.scope_type, "scope_id": str(s.scope_id)}
        for s in scopes_q.scalars().all()
    ]
    token = create_access_token(
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
        role=user.role,
        scopes=scopes,
    )

    _emit_access_log(
        db, tenant_id=p.tenant_id, user_id=user.id,
        event="login_oidc", result="allow",
        ip_address=_client_ip(request),
        metadata_={"groups": claims.groups, "role": role},
    )
    await db.commit()
    return {"access_token": token, "token_type": "bearer"}


# ---- SAML ----

@router.get("/saml/{provider_id}/redirect")
async def saml_redirect(provider_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(IdentityProvider).where(IdentityProvider.id == provider_id))
    p = res.scalar_one_or_none()
    if not p or p.type != "saml":
        raise HTTPException(404)
    sp = SAMLServiceProvider(p.config)
    return {"redirect_url": sp.build_redirect_url()}


class SAMLAcsIn(BaseModel):
    saml_response: str  # base64-encoded


@router.post("/saml/{provider_id}/acs")
async def saml_acs(
    provider_id: str,
    body: SAMLAcsIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(IdentityProvider).where(IdentityProvider.id == provider_id))
    p = res.scalar_one_or_none()
    if not p or p.type != "saml":
        raise HTTPException(404)
    sp = SAMLServiceProvider(p.config)
    attrs = sp.parse_assertion(body.saml_response)
    if not attrs.name_id:
        _emit_access_log(
            db, tenant_id=p.tenant_id, event="login_saml",
            result="deny", deny_reason="invalid_assertion",
            ip_address=_client_ip(request),
        )
        await db.commit()
        raise HTTPException(400, "invalid SAML assertion")

    role = saml_map_groups(attrs.groups, p.role_mapping or {}) or "viewer"
    email = attrs.email or attrs.name_id

    u_q = await db.execute(
        select(User).where(User.tenant_id == p.tenant_id, User.email == email)
    )
    user = u_q.scalar_one_or_none()
    if user is None:
        user = User(
            tenant_id=p.tenant_id,
            email=email,
            name=attrs.name or email,
            role=role,
            active=True,
        )
        db.add(user)
        await db.flush()
    else:
        user.role = role

    scopes_q = await db.execute(select(AccessScope).where(AccessScope.user_id == user.id))
    scopes = [
        {"scope_type": s.scope_type, "scope_id": str(s.scope_id)}
        for s in scopes_q.scalars().all()
    ]
    token = create_access_token(
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
        role=user.role,
        scopes=scopes,
    )

    _emit_access_log(
        db, tenant_id=p.tenant_id, user_id=user.id,
        event="login_saml", result="allow",
        ip_address=_client_ip(request),
        metadata_={"groups": attrs.groups, "role": role},
    )
    await db.commit()
    return {"access_token": token, "token_type": "bearer"}


# ---- MFA ----

class MFAEnrollOut(BaseModel):
    secret: str
    provisioning_uri: str
    backup_codes: list[str]


@router.post("/mfa/enroll", response_model=MFAEnrollOut)
async def mfa_enroll(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    user_uuid = uuid.UUID(user["sub"])
    tenant_id = user["tenant_id"]

    secret = generate_secret()
    backup = generate_backup_codes()

    enc_secret = encrypt_secret(tenant_id, secret)
    enc_backup = encrypt_backup_codes(tenant_id, backup)

    res = await db.execute(select(MFASecret).where(MFASecret.user_id == user_uuid))
    row = res.scalar_one_or_none()
    if row is None:
        row = MFASecret(
            user_id=user_uuid,
            secret_encrypted=enc_secret,
            method="totp",
            backup_codes_encrypted=enc_backup,
            enrolled_at=datetime.now(timezone.utc),
        )
        db.add(row)
    else:
        row.secret_encrypted = enc_secret
        row.backup_codes_encrypted = enc_backup
        row.enrolled_at = datetime.now(timezone.utc)
        row.failed_attempts = 0
    await db.commit()

    u_q = await db.execute(select(User).where(User.id == user_uuid))
    u = u_q.scalar_one()
    uri = provisioning_uri(secret=secret, account_name=u.email or str(user_uuid))
    return MFAEnrollOut(secret=secret, provisioning_uri=uri, backup_codes=backup)


class MFAVerifyIn(BaseModel):
    code: str  # 6-digit TOTP or 8-char backup


@router.post("/mfa/verify")
async def mfa_verify(
    body: MFAVerifyIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    user_uuid = uuid.UUID(user["sub"])
    tenant_id = user["tenant_id"]

    res = await db.execute(select(MFASecret).where(MFASecret.user_id == user_uuid))
    row = res.scalar_one_or_none()
    if not row:
        raise HTTPException(400, "MFA not enrolled")

    if row.failed_attempts >= 5:
        _emit_access_log(
            db, tenant_id=uuid.UUID(tenant_id), user_id=user_uuid,
            event="mfa_lockout", result="deny", deny_reason="too_many_failures",
            ip_address=_client_ip(request),
        )
        await db.commit()
        raise HTTPException(429, "MFA locked. Contact admin.")

    code = body.code.strip()
    is_totp = len(code) == 6 and code.isdigit()

    if is_totp:
        secret = decrypt_secret(tenant_id, row.secret_encrypted)
        ok = verify_totp(secret, code)
    else:
        ok, new_backup = consume_backup_code(tenant_id, row.backup_codes_encrypted or "", code)
        if ok and new_backup:
            row.backup_codes_encrypted = new_backup

    if ok:
        row.last_used_at = datetime.now(timezone.utc)
        row.failed_attempts = 0
        _emit_access_log(
            db, tenant_id=uuid.UUID(tenant_id), user_id=user_uuid,
            event="mfa_pass", result="allow",
            ip_address=_client_ip(request),
            metadata_={"method": "totp" if is_totp else "backup"},
        )
        # Reissue token with mfa_verified=true
        scopes_q = await db.execute(select(AccessScope).where(AccessScope.user_id == user_uuid))
        scopes = [
            {"scope_type": s.scope_type, "scope_id": str(s.scope_id), "mfa_verified": True}
            for s in scopes_q.scalars().all()
        ]
        token = create_access_token(
            user_id=str(user_uuid),
            tenant_id=tenant_id,
            role=user["role"],
            scopes=scopes,
        )
        await db.commit()
        return {"access_token": token, "token_type": "bearer", "mfa_verified": True}

    row.failed_attempts += 1
    _emit_access_log(
        db, tenant_id=uuid.UUID(tenant_id), user_id=user_uuid,
        event="mfa_fail", result="deny", deny_reason="invalid_code",
        ip_address=_client_ip(request),
    )
    await db.commit()
    raise HTTPException(401, "Invalid MFA code")
