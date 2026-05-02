import csv
import io
import uuid
from datetime import datetime, date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from app.database import get_db
from app.auth import get_current_user, require_role
from app.models.auth_enterprise import AccessLog
from app.middleware.tenant import get_tenant_id_from_context

router = APIRouter(prefix="/api/v1/access-logs", tags=["access-logs"])


@router.get("/")
async def list_access_logs(
    user_id: Optional[uuid.UUID] = Query(None),
    action: Optional[str] = Query(None),
    resource: Optional[str] = Query(None),
    result_filter: Optional[str] = Query(None, alias="result"),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    limit: int = Query(50, le=500),
    offset: int = Query(0),
    user: dict = Depends(require_role("admin", "executive")),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = get_tenant_id_from_context()
    q = select(AccessLog).where(AccessLog.tenant_id == tenant_id)

    if user_id:
        q = q.where(AccessLog.user_id == user_id)
    if action:
        q = q.where(AccessLog.action == action)
    if resource:
        q = q.where(AccessLog.resource == resource)
    if result_filter:
        q = q.where(AccessLog.result == result_filter)
    if date_from:
        q = q.where(AccessLog.timestamp >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        q = q.where(AccessLog.timestamp <= datetime.combine(date_to, datetime.max.time()))

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar()

    q = q.order_by(desc(AccessLog.timestamp)).limit(limit).offset(offset)
    result = await db.execute(q)
    logs = result.scalars().all()

    return {
        "total": total,
        "items": [
            {
                "id": str(log.id),
                "user_id": str(log.user_id) if log.user_id else None,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "method": log.method,
                "path": log.path,
                "resource": log.resource,
                "action": log.action,
                "object_ids": log.object_ids,
                "columns_accessed": log.columns_accessed,
                "result": log.result,
                "deny_reason": log.deny_reason,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "request_id": log.request_id,
            }
            for log in logs
        ],
    }


@router.get("/summary")
async def access_log_summary(
    days: int = Query(30, le=90),
    user: dict = Depends(require_role("admin", "executive")),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = get_tenant_id_from_context()
    from datetime import timedelta, timezone
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # By action
    action_counts = await db.execute(
        select(AccessLog.action, func.count(AccessLog.id))
        .where(AccessLog.tenant_id == tenant_id, AccessLog.timestamp > cutoff)
        .group_by(AccessLog.action)
    )

    # By resource
    resource_counts = await db.execute(
        select(AccessLog.resource, func.count(AccessLog.id))
        .where(AccessLog.tenant_id == tenant_id, AccessLog.timestamp > cutoff)
        .group_by(AccessLog.resource)
    )

    # By result
    result_counts = await db.execute(
        select(AccessLog.result, func.count(AccessLog.id))
        .where(AccessLog.tenant_id == tenant_id, AccessLog.timestamp > cutoff)
        .group_by(AccessLog.result)
    )

    return {
        "period_days": days,
        "by_action": {row[0]: row[1] for row in action_counts if row[0]},
        "by_resource": {row[0]: row[1] for row in resource_counts if row[0]},
        "by_result": {row[0]: row[1] for row in result_counts if row[0]},
    }


@router.get("/export")
async def export_access_logs(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = get_tenant_id_from_context()
    q = select(AccessLog).where(AccessLog.tenant_id == tenant_id)
    if date_from:
        q = q.where(AccessLog.timestamp >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        q = q.where(AccessLog.timestamp <= datetime.combine(date_to, datetime.max.time()))
    q = q.order_by(desc(AccessLog.timestamp)).limit(10000)

    result = await db.execute(q)
    logs = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "user_id", "timestamp", "method", "path", "resource", "action", "result", "ip_address"])
    for log in logs:
        writer.writerow([
            str(log.id),
            str(log.user_id) if log.user_id else "",
            log.timestamp.isoformat() if log.timestamp else "",
            log.method,
            log.path,
            log.resource or "",
            log.action or "",
            log.result,
            log.ip_address or "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=access_logs.csv"},
    )
