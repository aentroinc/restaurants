"""OAuth + connector test/sync endpoints.

Endpoints:
  GET  /api/v1/oauth/{connector}/authorize       -> 302 to provider authorize URL
  GET  /api/v1/oauth/{connector}/callback        -> exchange code, persist tokens
  POST /api/v1/oauth/{connector}/test            -> hit provider test endpoint
  POST /api/v1/oauth/{connector}/sync            -> kick a real IngestionBatch sync
  POST /api/v1/oauth/{connector}/api-key         -> save API key creds (airregi/kot/td)
  POST /api/v1/oauth/{connector}/webhook         -> webhook receive (td)
  GET  /api/v1/oauth/{connector}/status          -> connection status

`{connector}` ∈ {square, smaregi, airregi, king_of_time, kot, freee, ubereats, td}.
"""
from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_tenant_id
from app.database import get_db
from app.schemas.common import APIResponse
from app.connectors.oauth_base import OAuth2ConnectorBase, gen_pkce_pair, gen_state
from app.connectors.oauth_square import SquareOAuth
from app.connectors.oauth_smaregi import SmaregiOAuth
from app.connectors.oauth_airregi import AirregiAPIKey
from app.connectors.oauth_kot import KOTAPIKey
from app.connectors.kot_attendance import KOTAttendance
from app.connectors.freee_accounting import FreeeAccounting
from app.connectors.ubereats import UberEatsMerchant
from app.connectors.td_temperature import TDTemperature
from app.models.data_source import DataSourceV2
from app.services import connector_secrets as cs
from app.services.ingestion_runner import run_sync_job
from app.middleware.audit import log_audit


router = APIRouter(prefix="/api/v1/oauth", tags=["oauth"])


OAUTH_PROVIDERS: dict[str, type[OAuth2ConnectorBase]] = {
    "square": SquareOAuth,
    "smaregi": SmaregiOAuth,
    "freee": FreeeAccounting,
}

API_KEY_PROVIDERS: dict[str, type] = {
    "airregi": AirregiAPIKey,
    "king_of_time": KOTAPIKey,
    "kot": KOTAttendance,
    "td": TDTemperature,
}

# Client Credentials 系 (browser flow なし)
CLIENT_CREDENTIAL_PROVIDERS: dict[str, type] = {
    "ubereats": UberEatsMerchant,
}

# Direct sync handlers (新コネクタは IngestionBatch を独自に作るので、
# run_sync_job ではなく connector.sync(db, tenant_id) を呼ぶ)
DIRECT_SYNC_PROVIDERS: dict[str, type] = {
    "kot": KOTAttendance,
    "freee": FreeeAccounting,
    "ubereats": UberEatsMerchant,
    "td": TDTemperature,
}


def _get_oauth(connector: str) -> OAuth2ConnectorBase:
    cls = OAUTH_PROVIDERS.get(connector)
    if not cls:
        raise HTTPException(400, f"Unknown OAuth connector: {connector}")
    return cls()


def _get_apikey(connector: str):
    cls = API_KEY_PROVIDERS.get(connector)
    if not cls:
        raise HTTPException(400, f"Unknown API-key connector: {connector}")
    return cls()


@router.get("/{connector}/authorize")
async def authorize(
    connector: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """Return the provider authorize URL. Stores `state` (and PKCE verifier)
    against the tenant so the callback can correlate.
    Returns JSON `{authorize_url}` so SPAs can redirect on the client; or set
    `?redirect=1` to issue a 302."""
    impl = _get_oauth(connector)
    state = gen_state()
    code_verifier = None
    code_challenge = None
    if impl.use_pkce:
        code_verifier, code_challenge = gen_pkce_pair()

    await cs.upsert_pending_state(
        db, tenant_id, connector, state_token=state, code_verifier=code_verifier
    )
    await db.commit()

    try:
        url = impl.build_authorize_url(state=state, code_challenge=code_challenge)
    except RuntimeError as e:
        raise HTTPException(500, str(e))

    return APIResponse(data={"authorize_url": url, "state": state})


@router.get("/{connector}/authorize/redirect")
async def authorize_redirect(
    connector: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    impl = _get_oauth(connector)
    state = gen_state()
    code_verifier = None
    code_challenge = None
    if impl.use_pkce:
        code_verifier, code_challenge = gen_pkce_pair()

    await cs.upsert_pending_state(
        db, tenant_id, connector, state_token=state, code_verifier=code_verifier
    )
    await db.commit()
    url = impl.build_authorize_url(state=state, code_challenge=code_challenge)
    return RedirectResponse(url=url, status_code=302)


@router.get("/{connector}/callback")
async def callback(
    connector: str,
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """OAuth provider redirects here with `?code=&state=`.

    Note: provider redirects from a browser session that doesn't carry our JWT.
    We therefore look up the pending row by state_token alone and trust it
    (state is opaque and single-use). On success, tokens are encrypted+stored.
    """
    impl = _get_oauth(connector)
    cred = await cs.get_by_state(db, state_token=state, connector_type=connector)
    if cred is None:
        raise HTTPException(400, "Invalid or expired state")

    try:
        tokens = await impl.exchange_code(code, code_verifier=cred.code_verifier)
    except Exception as e:
        await cs.mark_error(db, cred, str(e))
        await db.commit()
        raise HTTPException(400, f"Token exchange failed: {e}")

    await cs.save_oauth_tokens(
        db,
        cred,
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        expires_in=tokens.expires_in,
        token_type=tokens.token_type,
        scope=tokens.scope,
        merchant_id=tokens.merchant_id,
        contract_id=tokens.contract_id,
        extra={"raw_keys": list((tokens.raw or {}).keys())},
    )
    await _ensure_data_source(db, str(cred.tenant_id), connector)
    await db.commit()

    log_audit(str(cred.tenant_id), None, "oauth_connect", "connector", connector)

    return APIResponse(data={
        "connector": connector,
        "status": "connected",
        "merchant_id": tokens.merchant_id,
        "contract_id": tokens.contract_id,
        "expires_in": tokens.expires_in,
    })


@router.post("/{connector}/test")
async def test_connection(
    connector: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """Verify credentials by hitting a low-cost provider endpoint."""
    if connector in OAUTH_PROVIDERS:
        impl = _get_oauth(connector)
        cred = await cs.get_credential(db, tenant_id, connector)
        if cred is None or not cred.access_token_enc:
            raise HTTPException(404, "Not connected — run authorize flow first")
        plain = cs.decrypt_credential(cred)
        try:
            if connector == "smaregi":
                result = await impl.test_token(plain["access_token"], cred.contract_id)
            else:
                result = await impl.test_token(plain["access_token"])
        except Exception as e:
            await cs.mark_error(db, cred, str(e))
            await db.commit()
            return APIResponse(data={"ok": False, "error": str(e)})
        if not result.get("ok"):
            await cs.mark_error(db, cred, f"test failed: {result}")
            await db.commit()
        return APIResponse(data=result)

    if connector in API_KEY_PROVIDERS:
        impl = _get_apikey(connector)
        cred = await cs.get_credential(db, tenant_id, connector)
        if cred is None or not cred.api_key_enc:
            raise HTTPException(404, "Not connected — POST /api-key first")
        plain = cs.decrypt_credential(cred)
        result = await impl.test_credentials(plain["api_key"], plain.get("api_secret"))
        if not result.get("ok"):
            await cs.mark_error(db, cred, f"test failed: {result}")
            await db.commit()
        return APIResponse(data=result)

    if connector in CLIENT_CREDENTIAL_PROVIDERS:
        impl = CLIENT_CREDENTIAL_PROVIDERS[connector]()
        try:
            tokens = await impl.get_client_credentials_token()
            result = await impl.test_token(tokens.access_token)
        except Exception as e:
            return APIResponse(data={"ok": False, "error": str(e)[:200]})
        return APIResponse(data=result)

    raise HTTPException(400, f"Unknown connector: {connector}")


@router.post("/{connector}/api-key")
async def save_api_key(
    connector: str,
    body: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """Save API key + secret for non-OAuth connectors."""
    if connector not in API_KEY_PROVIDERS:
        raise HTTPException(400, f"Connector {connector} does not support API key auth")
    api_key = body.get("api_key")
    if not api_key:
        raise HTTPException(400, "api_key is required")
    api_secret = body.get("api_secret")

    cred = await cs.save_api_key(
        db, tenant_id, connector,
        api_key=api_key, api_secret=api_secret,
        extra=body.get("extra"),
    )
    await _ensure_data_source(db, tenant_id, connector)
    await db.commit()
    log_audit(tenant_id, None, "api_key_save", "connector", connector)
    return APIResponse(data={"connector": connector, "status": cred.status})


@router.post("/{connector}/sync")
async def sync_now(
    connector: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """Trigger an IngestionBatch run.

    新4 connector (kot/freee/ubereats/td) は connector.sync() を直接呼ぶ。
    既存4本 (square/smaregi/airregi/king_of_time) は ingestion_runner 経由。
    """
    # 新コネクタ: 直接 sync
    if connector in DIRECT_SYNC_PROVIDERS:
        cred = await cs.get_credential(db, tenant_id, connector)
        sandbox = True if cred is None else cred.status == "connected" and bool((cred.extra or {}).get("sandbox_mode", True))
        impl = DIRECT_SYNC_PROVIDERS[connector]()
        try:
            result = await impl.sync(db, tenant_id, sandbox_mode=True)
        except Exception as e:
            await db.rollback()
            raise HTTPException(500, f"sync failed: {e}")
        await _ensure_data_source(db, tenant_id, connector)
        await db.commit()
        log_audit(tenant_id, None, "oauth_sync", "connector", connector, {"batch_id": result.get("batch_id")})
        # 軽減税率 (8%/10%) 集計を SalesTaxBreakdown に反映
        await _post_sync_tax_breakdown(db, tenant_id, connector, result)
        return APIResponse(data=result)

    # 既存パス
    cred = await cs.get_credential(db, tenant_id, connector)
    if cred is None or cred.status != "connected":
        raise HTTPException(400, f"Connector {connector} is not connected")

    ds_id = await _ensure_data_source(db, tenant_id, connector)
    await db.commit()

    result = await run_sync_job(db, tenant_id, str(ds_id), job_type="incremental")
    log_audit(tenant_id, None, "oauth_sync", "connector", connector, {"job_id": result.get("job_id")})
    # 軽減税率 (8%/10%) 集計を SalesTaxBreakdown に反映
    await _post_sync_tax_breakdown(db, tenant_id, connector, result)
    return APIResponse(data=result)


@router.post("/{connector}/webhook")
async def webhook(
    connector: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """Webhook 受信 — 現状は T&D 温度ロガーのみ対応。"""
    if connector != "td":
        raise HTTPException(400, f"Connector {connector} does not support webhooks")
    payload = await request.json()
    impl = TDTemperature()
    try:
        result = await impl.receive_webhook(db, tenant_id, payload)
    except Exception as e:
        await db.rollback()
        raise HTTPException(500, f"webhook processing failed: {e}")
    await db.commit()
    log_audit(tenant_id, None, "webhook_receive", "connector", connector, {"batch_id": result.get("batch_id")})
    return APIResponse(data=result)


@router.get("/{connector}/status")
async def status(
    connector: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    cred = await cs.get_credential(db, tenant_id, connector)
    if cred is None:
        return APIResponse(data={"connector": connector, "status": "disconnected"})
    return APIResponse(data={
        "connector": connector,
        "status": cred.status,
        "auth_type": cred.auth_type,
        "expires_at": cred.expires_at.isoformat() if cred.expires_at else None,
        "merchant_id": cred.merchant_id,
        "contract_id": cred.contract_id,
        "last_error": cred.last_error,
        "refresh_count": cred.refresh_count,
    })


# ── helpers ─────────────────────────────────────────────────────

_NEW_CONNECTOR_META: dict[str, dict[str, str]] = {
    "kot": {"name": "KING OF TIME (勤怠)", "system_category": "labor", "auth_type": "api_key"},
    "freee": {"name": "freee 会計", "system_category": "accounting", "auth_type": "oauth2"},
    "ubereats": {"name": "Uber Eats Merchant", "system_category": "delivery", "auth_type": "oauth2_client_credentials"},
    "td": {"name": "T&D 温度ロガー", "system_category": "iot_sensor", "auth_type": "api_key"},
}


async def _post_sync_tax_breakdown(
    db: AsyncSession,
    tenant_id: str,
    connector: str,
    sync_result: dict[str, Any] | None,
) -> None:
    """POS 系コネクタ (square/smaregi/airregi/ubereats) の sync 後に
    軽減税率 (8%/10%) の日次集計を SalesTaxBreakdown に投入する。
    エラーは握りつぶす — 集計失敗で sync 全体を落とさない。
    """
    if connector not in {"square", "smaregi", "airregi", "ubereats"}:
        return
    try:
        from datetime import date as _date
        from sqlalchemy import select
        from app.models.daily_sales import DailyStoreSales
        from app.services import tax_calculator as _tc

        target_date = _date.today()
        rows = await db.execute(
            select(DailyStoreSales.store_id).where(
                DailyStoreSales.tenant_id == tenant_id,
                DailyStoreSales.business_date == target_date,
            )
        )
        store_ids = [str(r[0]) for r in rows.all()]
        for sid in store_ids:
            await _tc.breakdown_daily_sales(db, tenant_id, sid, target_date)
        await db.commit()
    except Exception:
        await db.rollback()


async def _ensure_data_source(
    db: AsyncSession,
    tenant_id: str,
    connector: str,
) -> uuid.UUID:
    """Create a DataSourceV2 row for this connector if one doesn't exist."""
    result = await db.execute(
        select(DataSourceV2).where(
            DataSourceV2.tenant_id == tenant_id,
            DataSourceV2.source_type == connector,
        ).limit(1)
    )
    ds = result.scalar_one_or_none()
    if ds is not None:
        return ds.id

    if connector in _NEW_CONNECTOR_META:
        meta = _NEW_CONNECTOR_META[connector]
        name = meta["name"]
        system_category = meta["system_category"]
        auth_type = meta["auth_type"]
    else:
        from app.connectors.registry import get_connector
        base = get_connector(connector)
        name = base.name
        system_category = base.system_category
        auth_type = base.auth_type

    ds = DataSourceV2(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        name=f"{name} (OAuth)",
        source_type=connector,
        system_category=system_category,
        auth_type=auth_type,
        config={"sandbox_mode": True, "via": "oauth_flow"},
        status="connected",
    )
    db.add(ds)
    await db.flush()
    return ds.id
