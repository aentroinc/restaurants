from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.database import get_db
from app.models.audit import AuditLog
from app.schemas.common import APIResponse, PaginationMeta
from app.auth import get_tenant_id
from pydantic import BaseModel
from datetime import datetime as dt
from uuid import UUID

router = APIRouter(prefix="/api/v1/audit", tags=["audit"])


class AuditLogResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    user_id: UUID | None
    action: str
    resource_type: str
    resource_id: UUID | None
    metadata_: dict | None
    ip_address: str | None
    created_at: dt


class ActionSummary(BaseModel):
    action: str
    count: int


@router.get("/logs", response_model=APIResponse[list[AuditLogResponse]])
async def list_audit_logs(
    action: str | None = Query(None),
    resource_type: str | None = Query(None),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(AuditLog).where(AuditLog.tenant_id == tenant_id)
    count_q = select(func.count(AuditLog.id)).where(AuditLog.tenant_id == tenant_id)

    if action:
        q = q.where(AuditLog.action == action)
        count_q = count_q.where(AuditLog.action == action)
    if resource_type:
        q = q.where(AuditLog.resource_type == resource_type)
        count_q = count_q.where(AuditLog.resource_type == resource_type)
    if start_date:
        q = q.where(AuditLog.created_at >= start_date)
        count_q = count_q.where(AuditLog.created_at >= start_date)
    if end_date:
        end_dt = dt.combine(end_date, dt.max.time())
        q = q.where(AuditLog.created_at <= end_dt)
        count_q = count_q.where(AuditLog.created_at <= end_dt)

    total = (await db.execute(count_q)).scalar() or 0
    q = q.order_by(AuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)

    logs = []
    for log in result.scalars().all():
        logs.append(AuditLogResponse(
            id=log.id, tenant_id=log.tenant_id, user_id=log.user_id,
            action=log.action, resource_type=log.resource_type,
            resource_id=log.resource_id, metadata_=log.metadata_,
            ip_address=log.ip_address, created_at=log.created_at,
        ))

    meta = PaginationMeta(total=total, page=page, page_size=page_size,
                          total_pages=(total + page_size - 1) // page_size)
    return APIResponse(data=logs, meta=meta.model_dump())


@router.get("/logs/summary", response_model=APIResponse[list[ActionSummary]])
async def audit_summary(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    cutoff = date.today() - timedelta(days=days)

    result = await db.execute(
        select(AuditLog.action, func.count(AuditLog.id).label("cnt"))
        .where(and_(
            AuditLog.tenant_id == tenant_id,
            AuditLog.created_at >= cutoff,
        ))
        .group_by(AuditLog.action)
        .order_by(func.count(AuditLog.id).desc())
    )

    summaries = [ActionSummary(action=row[0], count=row[1]) for row in result.all()]
    return APIResponse(data=summaries)
