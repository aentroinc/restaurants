"""労務コンプライアンス API。

GET  /api/v1/labor/compliance/violations  — 違反一覧 (store / period 絞込)
POST /api/v1/labor/compliance/check       — { employee_id } を即時 evaluate_all
GET  /api/v1/labor/compliance/dashboard   — 違反集計 (severity別 / rule別 / 推移)
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_tenant_id
from app.database import get_db
from app.models.compliance_violation import ComplianceViolation
from app.schemas.common import APIResponse
from app.services.labor_compliance_engine import evaluate_all


router = APIRouter(prefix="/api/v1/labor/compliance", tags=["labor-compliance"])


# ---- Schemas ----
class CheckRequest(BaseModel):
    employee_id: UUID
    store_id: UUID | None = None
    prefecture: str = "13"
    deep_night_allowed: bool = False


class ViolationOut(BaseModel):
    id: str
    employee_id: str
    store_id: str | None
    rule_code: str
    severity: str
    detail: dict[str, Any]
    occurred_at: datetime
    resolved_at: datetime | None


# ---- Endpoints ----
@router.get("/violations", response_model=APIResponse[list[ViolationOut]])
async def list_violations(
    store_id: UUID | None = Query(None),
    period_days: int = Query(30, ge=1, le=365),
    severity: str | None = Query(None, pattern="^(warn|block)$"),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    since = datetime.now(timezone.utc) - timedelta(days=period_days)
    q = select(ComplianceViolation).where(
        and_(
            ComplianceViolation.tenant_id == UUID(tenant_id),
            ComplianceViolation.occurred_at >= since,
        )
    )
    if store_id:
        q = q.where(ComplianceViolation.store_id == store_id)
    if severity:
        q = q.where(ComplianceViolation.severity == severity)
    q = q.order_by(ComplianceViolation.occurred_at.desc()).limit(500)

    res = await db.execute(q)
    rows = res.scalars().all()
    out = [
        ViolationOut(
            id=str(r.id),
            employee_id=str(r.employee_id),
            store_id=str(r.store_id) if r.store_id else None,
            rule_code=r.rule_code,
            severity=r.severity,
            detail=dict(r.detail_json or {}),
            occurred_at=r.occurred_at,
            resolved_at=r.resolved_at,
        )
        for r in rows
    ]
    return APIResponse(data=out)


@router.post("/check", response_model=APIResponse[list[dict[str, Any]]])
async def check_compliance(
    body: CheckRequest,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    results = await evaluate_all(
        body.employee_id,
        db=db,
        tenant_id=tenant_id,
        store_id=body.store_id,
        prefecture=body.prefecture,
        deep_night_allowed=body.deep_night_allowed,
    )
    # 違反だけ DB に永続化
    for r in results:
        if r.status in ("warn", "block"):
            db.add(ComplianceViolation(
                tenant_id=UUID(tenant_id),
                employee_id=body.employee_id,
                store_id=body.store_id,
                rule_code=r.rule_code,
                severity=r.status,
                detail_json={"message": r.message, **r.detail},
            ))
    await db.commit()
    return APIResponse(data=[r.to_dict() for r in results])


@router.get("/dashboard", response_model=APIResponse[dict[str, Any]])
async def dashboard(
    store_id: UUID | None = Query(None),
    period_days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    since = datetime.now(timezone.utc) - timedelta(days=period_days)
    base = and_(
        ComplianceViolation.tenant_id == UUID(tenant_id),
        ComplianceViolation.occurred_at >= since,
    )
    if store_id:
        base = and_(base, ComplianceViolation.store_id == store_id)

    # severity別
    res = await db.execute(
        select(ComplianceViolation.severity, func.count()).where(base).group_by(ComplianceViolation.severity)
    )
    by_severity = {row[0]: row[1] for row in res.all()}

    # rule別
    res = await db.execute(
        select(ComplianceViolation.rule_code, func.count()).where(base).group_by(ComplianceViolation.rule_code)
    )
    by_rule = {row[0]: row[1] for row in res.all()}

    # 未解決
    res = await db.execute(
        select(func.count()).where(and_(base, ComplianceViolation.resolved_at.is_(None)))
    )
    open_count = res.scalar() or 0

    # 直近7日推移
    res = await db.execute(
        select(
            func.date(ComplianceViolation.occurred_at).label("d"),
            func.count(),
        ).where(base).group_by("d").order_by("d")
    )
    trend = [{"date": str(r[0]), "count": r[1]} for r in res.all()]

    return APIResponse(data={
        "period_days": period_days,
        "by_severity": by_severity,
        "by_rule": by_rule,
        "open_count": open_count,
        "trend": trend,
        "total": sum(by_severity.values()),
    })
