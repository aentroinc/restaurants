"""Connector credential persistence — Fernet-encrypted token store.

Wraps `app.services.secrets.encrypt_value/decrypt_value` and provides a
single per-tenant per-connector row in `connector_credentials`.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.connector_credential import ConnectorCredential
from app.services.secrets import encrypt_value, decrypt_value


# 認識する connector_type 一覧 (バリデーション用)
SUPPORTED_CONNECTOR_TYPES: tuple[str, ...] = (
    # POS
    "square",
    "smaregi",
    "airregi",
    # 勤怠
    "king_of_time",
    "kot",
    # 会計
    "freee",
    # デリバリー
    "ubereats",
    # IoT センサー
    "td",
)


def _enc(v: str | None) -> str | None:
    return encrypt_value(v) if v else None


def _dec(v: str | None) -> str | None:
    return decrypt_value(v) if v else None


async def get_credential(
    db: AsyncSession,
    tenant_id: str,
    connector_type: str,
) -> ConnectorCredential | None:
    result = await db.execute(
        select(ConnectorCredential).where(
            ConnectorCredential.tenant_id == tenant_id,
            ConnectorCredential.connector_type == connector_type,
        )
    )
    return result.scalar_one_or_none()


async def get_by_state(
    db: AsyncSession,
    state_token: str,
    connector_type: str,
) -> ConnectorCredential | None:
    result = await db.execute(
        select(ConnectorCredential).where(
            ConnectorCredential.state_token == state_token,
            ConnectorCredential.connector_type == connector_type,
        )
    )
    return result.scalar_one_or_none()


async def upsert_pending_state(
    db: AsyncSession,
    tenant_id: str,
    connector_type: str,
    state_token: str,
    code_verifier: str | None = None,
    auth_type: str = "oauth2",
) -> ConnectorCredential:
    """Create/update a pending OAuth row before redirecting to authorize URL."""
    cred = await get_credential(db, tenant_id, connector_type)
    if cred is None:
        cred = ConnectorCredential(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            connector_type=connector_type,
            auth_type=auth_type,
            status="pending",
        )
        db.add(cred)
    cred.state_token = state_token
    cred.code_verifier = code_verifier
    cred.status = "pending"
    cred.last_error = None
    await db.flush()
    return cred


async def save_oauth_tokens(
    db: AsyncSession,
    cred: ConnectorCredential,
    *,
    access_token: str,
    refresh_token: str | None = None,
    expires_in: int | None = None,
    token_type: str | None = None,
    scope: str | None = None,
    merchant_id: str | None = None,
    contract_id: str | None = None,
    extra: dict | None = None,
) -> ConnectorCredential:
    cred.access_token_enc = _enc(access_token)
    if refresh_token:
        cred.refresh_token_enc = _enc(refresh_token)
    if token_type:
        cred.token_type = token_type
    if scope:
        cred.scope = scope
    if merchant_id:
        cred.merchant_id = merchant_id
    if contract_id:
        cred.contract_id = contract_id
    if expires_in:
        cred.expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))
    if extra:
        merged = dict(cred.extra or {})
        merged.update(extra)
        cred.extra = merged
    cred.state_token = None
    cred.code_verifier = None
    cred.status = "connected"
    cred.last_error = None
    await db.flush()
    return cred


async def save_api_key(
    db: AsyncSession,
    tenant_id: str,
    connector_type: str,
    *,
    api_key: str,
    api_secret: str | None = None,
    extra: dict | None = None,
) -> ConnectorCredential:
    cred = await get_credential(db, tenant_id, connector_type)
    if cred is None:
        cred = ConnectorCredential(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            connector_type=connector_type,
            auth_type="api_key",
        )
        db.add(cred)
    cred.api_key_enc = _enc(api_key)
    if api_secret:
        cred.api_secret_enc = _enc(api_secret)
    if extra:
        merged = dict(cred.extra or {})
        merged.update(extra)
        cred.extra = merged
    cred.status = "connected"
    cred.last_error = None
    await db.flush()
    return cred


def decrypt_credential(cred: ConnectorCredential) -> dict[str, Any]:
    """Return plaintext credential dict for runtime use. Caller must not log."""
    return {
        "access_token": _dec(cred.access_token_enc),
        "refresh_token": _dec(cred.refresh_token_enc),
        "api_key": _dec(cred.api_key_enc),
        "api_secret": _dec(cred.api_secret_enc),
        "token_type": cred.token_type,
        "scope": cred.scope,
        "expires_at": cred.expires_at,
        "merchant_id": cred.merchant_id,
        "contract_id": cred.contract_id,
        "extra": cred.extra or {},
    }


def is_expired(cred: ConnectorCredential, leeway_sec: int = 60) -> bool:
    if cred.expires_at is None:
        return False
    return datetime.now(timezone.utc) >= cred.expires_at - timedelta(seconds=leeway_sec)


async def mark_error(
    db: AsyncSession,
    cred: ConnectorCredential,
    error: str,
) -> ConnectorCredential:
    cred.status = "error"
    cred.last_error = error[:1000]
    await db.flush()
    return cred
