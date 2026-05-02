"""AI governance API.

Surfaces:
  - GET  /api/v1/ai-governance/budget
  - PUT  /api/v1/ai-governance/budget       (admin only)
  - GET  /api/v1/ai-governance/usage        (per-month aggregate)
  - GET  /api/v1/ai-governance/role-tools   (role x tool matrix)
  - GET  /api/v1/ai-governance/refusals     (recent refusals)
  - GET  /api/v1/ai-governance/eval/latest  (latest eval run summary)
"""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user_optional
from app.core.tenant_context import get_tenant_or_demo
from app.database import get_db
from app.models.ai_budget import (
    AIRedTeamResult, AIRefusalLog, AIUsageLog, TenantAIBudget,
)
from app.services.ai.cost_guard import check_budget, get_or_create_budget
from app.services.ai.governance import ROLE_TOOL_MATRIX
from app.services.ai.tools import TOOL_DEFINITIONS

router = APIRouter(prefix="/api/v1/ai-governance", tags=["ai-governance"])


@router.get("/budget")
async def get_budget(db: AsyncSession = Depends(get_db)):
    tenant_id = get_tenant_or_demo()
    b = await get_or_create_budget(db, tenant_id)
    status = await check_budget(db, tenant_id)
    return {
        "monthly_budget_jpy": b.monthly_budget_jpy,
        "soft_limit_pct": float(b.soft_limit_pct),
        "hard_limit_pct": float(b.hard_limit_pct),
        "overage_policy": b.overage_policy,
        "used_jpy": float(status.used_jpy),
        "ratio": status.ratio,
        "status": status.reason,
    }


class BudgetIn(BaseModel):
    monthly_budget_jpy: int
    soft_limit_pct: float | None = None
    hard_limit_pct: float | None = None
    overage_policy: str | None = None


@router.put("/budget")
async def update_budget(
    body: BudgetIn,
    db: AsyncSession = Depends(get_db),
    user: dict | None = Depends(get_current_user_optional),
):
    if user and user.get("role") not in ("admin",):
        raise HTTPException(403, detail="admin only")
    tenant_id = get_tenant_or_demo()
    b = await get_or_create_budget(db, tenant_id)
    b.monthly_budget_jpy = body.monthly_budget_jpy
    if body.soft_limit_pct is not None:
        b.soft_limit_pct = Decimal(str(body.soft_limit_pct))
    if body.hard_limit_pct is not None:
        b.hard_limit_pct = Decimal(str(body.hard_limit_pct))
    if body.overage_policy:
        b.overage_policy = body.overage_policy
    await db.commit()
    return {"updated": True}


@router.get("/usage")
async def get_usage(db: AsyncSession = Depends(get_db)):
    tenant_id = get_tenant_or_demo()
    res = await db.execute(
        select(
            func.date_trunc("month", AIUsageLog.timestamp).label("month"),
            AIUsageLog.model,
            func.count().label("calls"),
            func.coalesce(func.sum(AIUsageLog.input_tokens), 0).label("in_tokens"),
            func.coalesce(func.sum(AIUsageLog.output_tokens), 0).label("out_tokens"),
            func.coalesce(func.sum(AIUsageLog.cost_jpy), 0).label("cost_jpy"),
        )
        .where(AIUsageLog.tenant_id == tenant_id)
        .group_by("month", AIUsageLog.model)
        .order_by(desc("month"))
        .limit(36)
    )
    rows = []
    for r in res.all():
        rows.append({
            "month": r.month.isoformat() if r.month else None,
            "model": r.model,
            "calls": r.calls,
            "input_tokens": int(r.in_tokens),
            "output_tokens": int(r.out_tokens),
            "cost_jpy": float(r.cost_jpy),
        })
    return {"usage": rows}


@router.get("/role-tools")
async def get_role_tools():
    return {
        "tools": [
            {"name": t["name"], "description": t.get("description", "")}
            for t in TOOL_DEFINITIONS
        ],
        "matrix": {role: sorted(list(tools)) for role, tools in ROLE_TOOL_MATRIX.items()},
    }


@router.get("/refusals")
async def get_refusals(db: AsyncSession = Depends(get_db), limit: int = 50):
    tenant_id = get_tenant_or_demo()
    res = await db.execute(
        select(AIRefusalLog)
        .where(AIRefusalLog.tenant_id == tenant_id)
        .order_by(desc(AIRefusalLog.timestamp))
        .limit(limit)
    )
    return {
        "refusals": [
            {
                "id": str(r.id),
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                "user_message": r.user_message[:500],
                "reason": r.refusal_reason,
                "is_false_positive": r.is_false_positive,
            }
            for r in res.scalars().all()
        ]
    }


@router.get("/red-team/latest")
async def get_latest_red_team(db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(
            AIRedTeamResult.run_id,
            func.count().label("total"),
            func.sum(func.cast(AIRedTeamResult.passed, type_=func.Integer().type)).label("passed"),
        )
        .group_by(AIRedTeamResult.run_id)
        .order_by(desc(AIRedTeamResult.run_id))
        .limit(1)
    )
    row = res.first()
    if not row:
        return {"run_id": None, "total": 0, "passed": 0, "fail_rate": None}
    return {
        "run_id": row.run_id,
        "total": int(row.total),
        "passed": int(row.passed or 0),
        "fail_rate": (1 - (int(row.passed or 0) / max(1, int(row.total)))),
    }
