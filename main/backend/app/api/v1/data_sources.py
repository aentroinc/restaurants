"""Data sources API: list / create / connect / sync.

Backed by app.connectors registry — connector ids are stable strings like
"smaregi" / "csv". OAuth flows are exposed under /oauth/{connector}/...
"""
from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user_optional
from app.connectors.base import ConnectorRegistry
from app.connectors.smaregi.auth import build_authorize_url, exchange_code
from app.core.secrets import encrypt_for_tenant
from app.core.tenant_context import get_tenant_or_demo
from app.database import get_db
from app.middleware.audit import log_audit
from app.models.data_source import DataSource, IngestionJob
from app.services.ingestion_runner import run_sync
import app.connectors.smaregi  # noqa: F401  registers SmaregiConnector
import app.connectors.square  # noqa: F401  registers SquareConnector

router = APIRouter(prefix="/api/v1/data-sources", tags=["data-sources"])


class DataSourceCreate(BaseModel):
    type: str
    name: str
    config: dict[str, Any] = {}


class DataSourceOut(BaseModel):
    id: str
    type: str
    name: str
    status: str
    last_sync_at: datetime | None = None
    last_error: str | None = None


class JobOut(BaseModel):
    id: str
    status: str
    job_type: str
    started_at: datetime | None
    finished_at: datetime | None
    rows_fetched: int
    rows_loaded: int
    rows_rejected: int


@router.get("/catalog")
async def catalog():
    """List available connector types."""
    return {"connectors": ConnectorRegistry.list()}


@router.get("", response_model=list[DataSourceOut])
async def list_sources(db: AsyncSession = Depends(get_db)):
    tenant_id = get_tenant_or_demo()
    res = await db.execute(
        select(DataSource).where(DataSource.tenant_id == tenant_id)
        .order_by(DataSource.created_at.desc())
    )
    return [
        DataSourceOut(
            id=str(s.id), type=s.type, name=s.name, status=s.status,
            last_sync_at=s.last_sync_at, last_error=s.last_error,
        )
        for s in res.scalars().all()
    ]


@router.post("", response_model=DataSourceOut)
async def create_source(
    body: DataSourceCreate,
    db: AsyncSession = Depends(get_db),
    user: dict | None = Depends(get_current_user_optional),
):
    tenant_id = get_tenant_or_demo()
    try:
        ConnectorRegistry.get(body.type)
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Unknown connector type: {body.type}")
    s = DataSource(
        tenant_id=tenant_id,
        type=body.type,
        name=body.name,
        status="disconnected",
        auth_type=ConnectorRegistry.get(body.type).auth_type,
        config=body.config or {},
    )
    db.add(s)
    await db.commit()
    await db.refresh(s)
    log_audit(tenant_id, user.get("sub") if user else None, "create", "data_source", str(s.id))
    return DataSourceOut(
        id=str(s.id), type=s.type, name=s.name, status=s.status,
        last_sync_at=s.last_sync_at, last_error=s.last_error,
    )


@router.delete("/{source_id}")
async def delete_source(
    source_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict | None = Depends(get_current_user_optional),
):
    tenant_id = get_tenant_or_demo()
    res = await db.execute(
        select(DataSource).where(DataSource.id == source_id, DataSource.tenant_id == tenant_id)
    )
    s = res.scalar_one_or_none()
    if not s:
        raise HTTPException(404)
    await db.delete(s)
    await db.commit()
    log_audit(tenant_id, user.get("sub") if user else None, "delete", "data_source", source_id)
    return {"deleted": True}


@router.post("/{source_id}/sync")
async def trigger_sync(
    source_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict | None = Depends(get_current_user_optional),
):
    tenant_id = get_tenant_or_demo()
    res = await db.execute(
        select(DataSource).where(DataSource.id == source_id, DataSource.tenant_id == tenant_id)
    )
    s = res.scalar_one_or_none()
    if not s:
        raise HTTPException(404)
    job = await run_sync(db, data_source_id=str(s.id), job_type="manual_backfill")
    await db.commit()
    log_audit(tenant_id, user.get("sub") if user else None, "sync", "data_source", source_id)
    return JobOut(
        id=str(job.id), status=job.status, job_type=job.job_type,
        started_at=job.started_at, finished_at=job.finished_at,
        rows_fetched=job.rows_fetched, rows_loaded=job.rows_loaded,
        rows_rejected=job.rows_rejected,
    )


@router.get("/{source_id}/jobs", response_model=list[JobOut])
async def list_jobs(source_id: str, db: AsyncSession = Depends(get_db)):
    tenant_id = get_tenant_or_demo()
    res = await db.execute(
        select(IngestionJob).where(
            IngestionJob.data_source_id == source_id,
            IngestionJob.tenant_id == tenant_id,
        ).order_by(IngestionJob.created_at.desc()).limit(50)
    )
    return [
        JobOut(
            id=str(j.id), status=j.status, job_type=j.job_type,
            started_at=j.started_at, finished_at=j.finished_at,
            rows_fetched=j.rows_fetched, rows_loaded=j.rows_loaded,
            rows_rejected=j.rows_rejected,
        )
        for j in res.scalars().all()
    ]


# ---- OAuth flow (Smaregi) ----

class OAuthStartIn(BaseModel):
    data_source_id: str
    redirect_uri: str
    contract_id: str


@router.post("/oauth/smaregi/start")
async def smaregi_oauth_start(body: OAuthStartIn, db: AsyncSession = Depends(get_db)):
    tenant_id = get_tenant_or_demo()
    res = await db.execute(
        select(DataSource).where(
            DataSource.id == body.data_source_id,
            DataSource.tenant_id == tenant_id,
        )
    )
    s = res.scalar_one_or_none()
    if not s:
        raise HTTPException(404)
    state = secrets.token_urlsafe(24)
    url, _ = build_authorize_url(
        contract_id=body.contract_id,
        redirect_uri=body.redirect_uri,
        state=state,
    )
    s.config = {**(s.config or {}), "contract_id": body.contract_id, "oauth_state": state}
    await db.commit()
    return {"authorize_url": url, "state": state}


class OAuthCallbackIn(BaseModel):
    data_source_id: str
    code: str
    state: str
    redirect_uri: str


@router.post("/oauth/smaregi/callback")
async def smaregi_oauth_callback(body: OAuthCallbackIn, db: AsyncSession = Depends(get_db)):
    tenant_id = get_tenant_or_demo()
    res = await db.execute(
        select(DataSource).where(
            DataSource.id == body.data_source_id,
            DataSource.tenant_id == tenant_id,
        )
    )
    s = res.scalar_one_or_none()
    if not s:
        raise HTTPException(404)
    if (s.config or {}).get("oauth_state") != body.state:
        raise HTTPException(400, detail="Invalid OAuth state")

    contract_id = (s.config or {}).get("contract_id", "")
    tokens = await exchange_code(body.code, contract_id=contract_id, redirect_uri=body.redirect_uri)
    encrypted = encrypt_for_tenant(
        str(tenant_id),
        {
            "access_token": tokens.access_token,
            "refresh_token": tokens.refresh_token,
            "expires_at": tokens.expires_at.isoformat(),
        },
    )
    s.credentials_encrypted = encrypted
    s.status = "connected"
    s.last_error = None
    await db.commit()
    return {"connected": True}
