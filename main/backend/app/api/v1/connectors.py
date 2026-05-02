import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_tenant_id
from app.schemas.common import APIResponse
from app.models.data_source import DataSourceV2, IngestionJob
from app.connectors.registry import get_connector, list_connectors
from app.services.ingestion_runner import run_sync_job
from app.middleware.audit import log_audit

router = APIRouter(prefix="/api/v1/connectors", tags=["connectors"])


@router.get("/available")
async def get_available_connectors(
    tenant_id: str = Depends(get_tenant_id),
):
    return APIResponse(data=list_connectors())


@router.get("/data-sources")
async def get_data_sources(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    result = await db.execute(
        select(DataSourceV2)
        .where(DataSourceV2.tenant_id == tenant_id)
        .order_by(DataSourceV2.created_at)
    )
    sources = result.scalars().all()
    data = []
    for s in sources:
        data.append({
            "id": str(s.id),
            "name": s.name,
            "source_type": s.source_type,
            "system_category": s.system_category,
            "auth_type": s.auth_type,
            "status": s.status,
            "config": s.config,
            "last_sync_at": s.last_sync_at.isoformat() if s.last_sync_at else None,
            "last_error": s.last_error,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        })
    return APIResponse(data=data)


@router.post("/data-sources")
async def create_data_source(
    body: dict,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    source_type = body.get("source_type")
    if not source_type:
        raise HTTPException(400, "source_type is required")

    try:
        connector = get_connector(source_type)
    except ValueError:
        raise HTTPException(400, f"Unknown connector type: {source_type}")

    # Encrypt credentials if provided
    credentials_encrypted = None
    credentials_raw = body.get("credentials")
    if credentials_raw:
        import json
        from app.services.secrets import encrypt_value
        cred_str = json.dumps(credentials_raw) if isinstance(credentials_raw, dict) else str(credentials_raw)
        credentials_encrypted = encrypt_value(cred_str)

    ds = DataSourceV2(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        name=body.get("name", connector.name),
        source_type=source_type,
        system_category=connector.system_category,
        auth_type=connector.auth_type,
        credentials_encrypted=credentials_encrypted,
        config=body.get("config", {}),
        status="disconnected",
    )
    db.add(ds)
    await db.commit()
    await db.refresh(ds)

    log_audit(tenant_id, None, "create", "data_source", str(ds.id))

    return APIResponse(data={
        "id": str(ds.id),
        "name": ds.name,
        "source_type": ds.source_type,
        "status": ds.status,
    })


@router.get("/data-sources/{data_source_id}")
async def get_data_source(
    data_source_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    result = await db.execute(
        select(DataSourceV2).where(
            DataSourceV2.id == data_source_id,
            DataSourceV2.tenant_id == tenant_id,
        )
    )
    ds = result.scalar_one_or_none()
    if not ds:
        raise HTTPException(404, "Data source not found")

    return APIResponse(data={
        "id": str(ds.id),
        "name": ds.name,
        "source_type": ds.source_type,
        "system_category": ds.system_category,
        "auth_type": ds.auth_type,
        "status": ds.status,
        "config": ds.config,
        "last_sync_at": ds.last_sync_at.isoformat() if ds.last_sync_at else None,
        "last_error": ds.last_error,
        "created_at": ds.created_at.isoformat() if ds.created_at else None,
        "updated_at": ds.updated_at.isoformat() if ds.updated_at else None,
    })


@router.post("/data-sources/{data_source_id}/test")
async def test_data_source(
    data_source_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    result = await db.execute(
        select(DataSourceV2).where(
            DataSourceV2.id == data_source_id,
            DataSourceV2.tenant_id == tenant_id,
        )
    )
    ds = result.scalar_one_or_none()
    if not ds:
        raise HTTPException(404, "Data source not found")

    connector = get_connector(ds.source_type)
    config = ds.config or {}

    try:
        ok = connector.test_connection(config)
        if ok:
            ds.status = "connected"
            await db.commit()
        return APIResponse(data={"success": ok, "source_type": ds.source_type})
    except Exception as e:
        ds.status = "error"
        ds.last_error = str(e)
        await db.commit()
        return APIResponse(data={"success": False, "error": str(e)})


@router.post("/data-sources/{data_source_id}/sync")
async def sync_data_source(
    data_source_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    result = await run_sync_job(db, tenant_id, data_source_id)

    log_audit(tenant_id, None, "sync", "data_source", data_source_id, {"job_id": result.get("job_id")})

    return APIResponse(data=result)


@router.get("/data-sources/{data_source_id}/jobs")
async def get_data_source_jobs(
    data_source_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    result = await db.execute(
        select(IngestionJob)
        .where(
            IngestionJob.data_source_id == data_source_id,
            IngestionJob.tenant_id == tenant_id,
        )
        .order_by(desc(IngestionJob.created_at))
        .limit(50)
    )
    jobs = result.scalars().all()
    data = []
    for j in jobs:
        data.append({
            "id": str(j.id),
            "job_type": j.job_type,
            "status": j.status,
            "started_at": j.started_at.isoformat() if j.started_at else None,
            "finished_at": j.finished_at.isoformat() if j.finished_at else None,
            "rows_fetched": j.rows_fetched,
            "rows_loaded": j.rows_loaded,
            "rows_rejected": j.rows_rejected,
            "error_log": j.error_log,
            "created_at": j.created_at.isoformat() if j.created_at else None,
        })
    return APIResponse(data=data)


@router.get("/data-sources/{data_source_id}/schema")
async def get_data_source_schema(
    data_source_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    result = await db.execute(
        select(DataSourceV2).where(
            DataSourceV2.id == data_source_id,
            DataSourceV2.tenant_id == tenant_id,
        )
    )
    ds = result.scalar_one_or_none()
    if not ds:
        raise HTTPException(404, "Data source not found")

    connector = get_connector(ds.source_type)
    s = connector.schema()

    return APIResponse(data={
        "source_type": ds.source_type,
        "source_fields": s.source_fields,
        "canonical_mapping": s.canonical_mapping,
    })
