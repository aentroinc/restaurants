import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Body, Depends, HTTPException, Path
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_tenant_id
from app.database import get_db
from app.models.pos_connector import POSConnectorConfig
from app.schemas.common import APIResponse
from app.services.japan_pos_connectors import (
    JAPAN_POS_PROVIDERS,
    POSConnectorError,
    connector_to_dict,
    sync_pos_daily_sales,
    test_pos_connection,
)

router = APIRouter(prefix="/api/v1/connectors", tags=["connectors"])


class POSConnectorCreate(BaseModel):
    provider: str
    display_name: str
    status: str = "disconnected"
    credentials: dict = Field(default_factory=dict)
    settings: dict = Field(default_factory=dict)
    store_mappings: dict = Field(default_factory=dict)


class POSConnectorUpdate(BaseModel):
    display_name: str | None = None
    status: str | None = None
    credentials: dict | None = None
    settings: dict | None = None
    store_mappings: dict | None = None


class POSSyncRequest(BaseModel):
    date_from: date
    date_to: date


@router.get("/pos/providers", response_model=APIResponse[list[dict]])
async def list_pos_providers():
    return APIResponse(data=JAPAN_POS_PROVIDERS, meta={"total": len(JAPAN_POS_PROVIDERS)})


@router.get("/pos/configs", response_model=APIResponse[list[dict]])
async def list_pos_configs(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    result = await db.execute(
        select(POSConnectorConfig)
        .where(POSConnectorConfig.tenant_id == uuid.UUID(tenant_id))
        .order_by(POSConnectorConfig.created_at.desc())
    )
    rows = [connector_to_dict(row) for row in result.scalars().all()]
    return APIResponse(data=rows, meta={"total": len(rows)})


@router.post("/pos/configs", response_model=APIResponse[dict], status_code=201)
async def create_pos_config(
    body: POSConnectorCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    provider_ids = {p["provider"] for p in JAPAN_POS_PROVIDERS}
    if body.provider not in provider_ids:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {body.provider}")

    config = POSConnectorConfig(
        tenant_id=uuid.UUID(tenant_id),
        provider=body.provider,
        display_name=body.display_name,
        status=body.status,
        credentials=body.credentials,
        settings=body.settings,
        store_mappings=body.store_mappings,
    )
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return APIResponse(data=connector_to_dict(config))


@router.put("/pos/configs/{config_id}", response_model=APIResponse[dict])
async def update_pos_config(
    config_id: uuid.UUID = Path(...),
    body: POSConnectorUpdate = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    config = await _get_config_or_404(db, tenant_id, config_id)
    for field in ("display_name", "status", "credentials", "settings", "store_mappings"):
        value = getattr(body, field)
        if value is not None:
            setattr(config, field, value)
    await db.commit()
    await db.refresh(config)
    return APIResponse(data=connector_to_dict(config))


@router.post("/pos/configs/{config_id}/test", response_model=APIResponse[dict])
async def test_config(
    config_id: uuid.UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    config = await _get_config_or_404(db, tenant_id, config_id)
    try:
        result = await test_pos_connection(config)
    except POSConnectorError as exc:
        config.status = "error"
        config.last_tested_at = datetime.now(timezone.utc)
        config.last_failure_at = datetime.now(timezone.utc)
        config.last_error = str(exc)
        await db.commit()
        return APIResponse(data={"connected": False, "error": str(exc)})

    config.status = "connected"
    config.last_tested_at = datetime.now(timezone.utc)
    config.last_success_at = datetime.now(timezone.utc)
    config.last_error = None
    await db.commit()
    return APIResponse(data=result)


@router.post("/pos/configs/{config_id}/sync", response_model=APIResponse[dict])
async def sync_config(
    config_id: uuid.UUID = Path(...),
    body: POSSyncRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    if body.date_to < body.date_from:
        raise HTTPException(status_code=400, detail="date_to must be after date_from")
    if (body.date_to - body.date_from).days > 31:
        raise HTTPException(status_code=400, detail="Smaregi transaction sync supports up to 31 days per run")

    config = await _get_config_or_404(db, tenant_id, config_id)
    try:
        result = await sync_pos_daily_sales(db, tenant_id, config, body.date_from, body.date_to)
    except POSConnectorError as exc:
        config.status = "error"
        config.last_failure_at = datetime.now(timezone.utc)
        config.last_error = str(exc)
        await db.commit()
        return APIResponse(data={"status": "failed", "error": str(exc)})
    return APIResponse(data=result)


async def _get_config_or_404(db: AsyncSession, tenant_id: str, config_id: uuid.UUID) -> POSConnectorConfig:
    result = await db.execute(
        select(POSConnectorConfig).where(
            POSConnectorConfig.id == config_id,
            POSConnectorConfig.tenant_id == uuid.UUID(tenant_id),
        )
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="POS connector config not found")
    return config
