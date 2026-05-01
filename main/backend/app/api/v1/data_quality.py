from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.database import get_db
from app.models.data_quality import DataQualityIssue
from app.schemas.common import APIResponse
from app.schemas.data_quality import DataQualityResponse, DataQualitySummary
from app.auth import get_tenant_id

router = APIRouter(prefix="/api/v1/data-quality", tags=["data_quality"])


@router.get("/issues", response_model=APIResponse[list[DataQualityResponse]])
async def list_issues(
    severity: str | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(100),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(DataQualityIssue).where(DataQualityIssue.tenant_id == tenant_id)
    if severity:
        q = q.where(DataQualityIssue.severity == severity)
    if status:
        q = q.where(DataQualityIssue.status == status)
    q = q.order_by(DataQualityIssue.detected_at.desc()).limit(limit)

    result = await db.execute(q)
    items = [DataQualityResponse(
        id=i.id, entity_type=i.entity_type, entity_id=i.entity_id,
        field_name=i.field_name, severity=i.severity, rule_key=i.rule_key,
        description=i.description, status=i.status,
        detected_at=i.detected_at, resolved_at=i.resolved_at,
    ) for i in result.scalars().all()]
    return APIResponse(data=items)


@router.get("/summary", response_model=APIResponse[DataQualitySummary])
async def summary(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    base = DataQualityIssue.tenant_id == tenant_id

    total_q = await db.execute(select(func.count(DataQualityIssue.id)).where(base))
    total = total_q.scalar() or 0

    severity_q = await db.execute(
        select(DataQualityIssue.severity, func.count(DataQualityIssue.id))
        .where(base)
        .group_by(DataQualityIssue.severity)
    )
    sev_counts = {r[0]: r[1] for r in severity_q.all()}

    status_q = await db.execute(
        select(DataQualityIssue.status, func.count(DataQualityIssue.id))
        .where(base)
        .group_by(DataQualityIssue.status)
    )
    status_counts = {r[0]: r[1] for r in status_q.all()}

    return APIResponse(data=DataQualitySummary(
        total=total,
        critical=sev_counts.get("critical", 0),
        high=sev_counts.get("high", 0),
        medium=sev_counts.get("medium", 0),
        low=sev_counts.get("low", 0),
        open=status_counts.get("open", 0),
        resolved=status_counts.get("resolved", 0),
    ))
