"""Connector productionization API — health, schedules, contracts, credentials"""
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_tenant_id
from app.models.data_source import DataSourceV2, IngestionJob
from app.models.connector_extras import ConnectorCredentialRef, ConnectorSchedule, DataContractRule
from app.models.ingestion import DataContract

router = APIRouter(prefix="/api/v1/connector-health", tags=["connector-health"])


@router.get("/")
async def list_connector_health(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """全 data source の health badge + last sync + freshness + error 数"""
    sources = (await db.execute(
        select(DataSourceV2).where(DataSourceV2.tenant_id == tenant_id)
    )).scalars().all()

    out = []
    for ds in sources:
        last_job = (await db.execute(
            select(IngestionJob).where(
                IngestionJob.data_source_id == ds.id,
            ).order_by(IngestionJob.started_at.desc()).limit(1)
        )).scalar_one_or_none()

        recent_failures = (await db.execute(
            select(func.count(IngestionJob.id)).where(
                IngestionJob.data_source_id == ds.id,
                IngestionJob.status == "failed",
                IngestionJob.started_at > datetime.now(timezone.utc) - timedelta(days=7),
            )
        )).scalar() or 0

        freshness_hours = None
        if ds.last_sync_at:
            freshness_hours = (datetime.now(timezone.utc) - ds.last_sync_at).total_seconds() / 3600

        # health score: 0-100
        health = 100
        if ds.status == "error":
            health -= 50
        if ds.status == "disconnected":
            health -= 80
        if freshness_hours and freshness_hours > 48:
            health -= 30
        if recent_failures > 2:
            health -= 20
        health = max(0, health)

        out.append({
            "data_source_id": str(ds.id),
            "name": ds.name,
            "source_type": ds.source_type,
            "status": ds.status,
            "health_score": health,
            "health_badge": "good" if health >= 80 else "warning" if health >= 50 else "critical",
            "last_sync_at": ds.last_sync_at.isoformat() if ds.last_sync_at else None,
            "freshness_hours": round(freshness_hours, 1) if freshness_hours else None,
            "last_error": ds.last_error,
            "recent_failures_7d": recent_failures,
            "last_job": {
                "id": str(last_job.id),
                "status": last_job.status,
                "rows_loaded": last_job.rows_loaded,
                "rows_rejected": last_job.rows_rejected,
                "started_at": last_job.started_at.isoformat() if last_job.started_at else None,
                "finished_at": last_job.finished_at.isoformat() if last_job.finished_at else None,
            } if last_job else None,
        })
    return {"data": out}


@router.get("/{data_source_id}/jobs")
async def list_jobs(
    data_source_id: UUID,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    rows = (await db.execute(
        select(IngestionJob)
        .where(IngestionJob.tenant_id == tenant_id, IngestionJob.data_source_id == data_source_id)
        .order_by(IngestionJob.started_at.desc())
        .limit(limit)
    )).scalars().all()
    return {"data": [
        {
            "id": str(j.id),
            "job_type": j.job_type,
            "status": j.status,
            "started_at": j.started_at.isoformat() if j.started_at else None,
            "finished_at": j.finished_at.isoformat() if j.finished_at else None,
            "rows_fetched": j.rows_fetched,
            "rows_loaded": j.rows_loaded,
            "rows_rejected": j.rows_rejected,
            "error_log": j.error_log,
        }
        for j in rows
    ]}


# --- Schedules ---

class ScheduleCreate(BaseModel):
    data_source_id: UUID
    frequency: str = "daily"
    cron_expression: str | None = None
    timezone: str = "Asia/Tokyo"
    enabled: bool = True


@router.post("/schedules", status_code=201)
async def create_schedule(
    body: ScheduleCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    sched = ConnectorSchedule(
        id=uuid4(), tenant_id=tenant_id, data_source_id=body.data_source_id,
        frequency=body.frequency, cron_expression=body.cron_expression,
        timezone=body.timezone, enabled=body.enabled,
    )
    db.add(sched)
    await db.commit()
    return {"data": _schedule_dict(sched)}


@router.get("/schedules")
async def list_schedules(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    rows = (await db.execute(
        select(ConnectorSchedule).where(ConnectorSchedule.tenant_id == tenant_id)
    )).scalars().all()
    return {"data": [_schedule_dict(s) for s in rows]}


# --- Data Contracts ---

@router.get("/contracts")
async def list_contracts(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    rows = (await db.execute(
        select(DataContract).where(DataContract.tenant_id == tenant_id)
    )).scalars().all()
    out = []
    for c in rows:
        rules = (await db.execute(
            select(DataContractRule).where(DataContractRule.data_contract_id == c.id)
        )).scalars().all()
        out.append({
            "id": str(c.id),
            "name": c.name if hasattr(c, "name") else None,
            "rules": [_rule_dict(r) for r in rules],
        })
    return {"data": out}


@router.post("/contracts/{contract_id}/rules", status_code=201)
async def add_rule(
    contract_id: UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    rule = DataContractRule(
        id=uuid4(), tenant_id=tenant_id, data_contract_id=contract_id,
        rule_type=body["rule_type"], field_name=body.get("field_name"),
        expected_value=body.get("expected_value", {}), severity=body.get("severity", "warning"),
    )
    db.add(rule)
    await db.commit()
    return {"data": _rule_dict(rule)}


def _schedule_dict(s):
    return {
        "id": str(s.id),
        "data_source_id": str(s.data_source_id),
        "frequency": s.frequency,
        "cron_expression": s.cron_expression,
        "timezone": s.timezone,
        "enabled": s.enabled,
        "last_run_at": s.last_run_at.isoformat() if s.last_run_at else None,
        "next_run_at": s.next_run_at.isoformat() if s.next_run_at else None,
    }


def _rule_dict(r):
    return {
        "id": str(r.id),
        "rule_type": r.rule_type,
        "field_name": r.field_name,
        "expected_value": r.expected_value,
        "severity": r.severity,
        "enabled": r.enabled,
    }
