"""Budget targets API — CRUD + variance vs actual lookup."""
from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_tenant_id
from app.auth_rbac import require_permission
from app.database import get_db
from app.models.budget import BudgetTarget
from app.models.store_pl import StorePL


router = APIRouter(prefix="/api/v1/budget", tags=["budget"])


class BudgetTargetIn(BaseModel):
    store_id: UUID
    period_start: date
    period_end: date
    period_type: str = "month"
    target_sales: Decimal
    target_cogs_rate: Decimal = Decimal("30.00")
    target_labor_rate: Decimal = Decimal("28.00")
    target_operating_profit: Decimal = Decimal("0")
    notes: Optional[str] = None


class BudgetTargetOut(BaseModel):
    id: UUID
    store_id: UUID
    period_start: date
    period_end: date
    period_type: str
    target_sales: Decimal
    target_cogs_rate: Decimal
    target_labor_rate: Decimal
    target_operating_profit: Decimal
    notes: Optional[str]


def _to_dict(b: BudgetTarget) -> dict:
    return {
        "id": str(b.id),
        "store_id": str(b.store_id),
        "period_start": b.period_start.isoformat(),
        "period_end": b.period_end.isoformat(),
        "period_type": b.period_type,
        "target_sales": float(b.target_sales),
        "target_cogs_rate": float(b.target_cogs_rate),
        "target_labor_rate": float(b.target_labor_rate),
        "target_operating_profit": float(b.target_operating_profit),
        "notes": b.notes,
    }


@router.get("/targets")
async def list_targets(
    store_id: Optional[UUID] = None,
    period_start: Optional[date] = None,
    period_end: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _user: dict = Depends(require_permission("budget", "read")),
):
    q = select(BudgetTarget).where(BudgetTarget.tenant_id == tenant_id)
    if store_id:
        q = q.where(BudgetTarget.store_id == store_id)
    if period_start:
        q = q.where(BudgetTarget.period_start >= period_start)
    if period_end:
        q = q.where(BudgetTarget.period_end <= period_end)
    q = q.order_by(BudgetTarget.period_start.desc())

    rows = (await db.execute(q)).scalars().all()
    return {"data": [_to_dict(r) for r in rows]}


@router.post("/targets", status_code=201)
async def create_target(
    body: BudgetTargetIn,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _user: dict = Depends(require_permission("budget", "write")),
):
    obj = BudgetTarget(
        id=uuid4(),
        tenant_id=tenant_id,
        store_id=body.store_id,
        period_start=body.period_start,
        period_end=body.period_end,
        period_type=body.period_type,
        target_sales=body.target_sales,
        target_cogs_rate=body.target_cogs_rate,
        target_labor_rate=body.target_labor_rate,
        target_operating_profit=body.target_operating_profit,
        notes=body.notes,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return {"data": _to_dict(obj)}


@router.put("/targets/{target_id}")
async def update_target(
    target_id: UUID,
    body: BudgetTargetIn,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _user: dict = Depends(require_permission("budget", "write")),
):
    obj = (await db.execute(
        select(BudgetTarget).where(
            and_(BudgetTarget.id == target_id, BudgetTarget.tenant_id == tenant_id)
        )
    )).scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "Target not found")
    for k, v in body.model_dump().items():
        setattr(obj, k, v)
    await db.commit()
    return {"data": _to_dict(obj)}


@router.delete("/targets/{target_id}", status_code=204)
async def delete_target(
    target_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _user: dict = Depends(require_permission("budget", "write")),
):
    obj = (await db.execute(
        select(BudgetTarget).where(
            and_(BudgetTarget.id == target_id, BudgetTarget.tenant_id == tenant_id)
        )
    )).scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "Target not found")
    await db.delete(obj)
    await db.commit()


@router.get("/variance")
async def variance_report(
    period_start: date = Query(...),
    period_end: date = Query(...),
    store_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    _user: dict = Depends(require_permission("budget", "read")),
):
    """Budget vs actual variance for the period — joins BudgetTarget with StorePL."""
    bq = select(BudgetTarget).where(
        and_(
            BudgetTarget.tenant_id == tenant_id,
            BudgetTarget.period_start >= period_start,
            BudgetTarget.period_end <= period_end,
        )
    )
    if store_id:
        bq = bq.where(BudgetTarget.store_id == store_id)
    targets = (await db.execute(bq)).scalars().all()

    pq = select(StorePL).where(
        and_(
            StorePL.tenant_id == tenant_id,
            StorePL.period_start >= period_start,
            StorePL.period_end <= period_end,
        )
    )
    if store_id:
        pq = pq.where(StorePL.store_id == store_id)
    pls = (await db.execute(pq)).scalars().all()

    pl_by_key = {(p.store_id, p.period_start): p for p in pls}
    out = []
    for t in targets:
        pl = pl_by_key.get((t.store_id, t.period_start))
        actual_sales = float(pl.sales) if pl else None
        actual_op = float(pl.operating_profit) if pl else None
        out.append({
            "store_id": str(t.store_id),
            "period_start": t.period_start.isoformat(),
            "period_end": t.period_end.isoformat(),
            "target_sales": float(t.target_sales),
            "actual_sales": actual_sales,
            "sales_variance": (actual_sales - float(t.target_sales)) if actual_sales is not None else None,
            "sales_attainment_pct": (actual_sales / float(t.target_sales) * 100) if actual_sales is not None and t.target_sales else None,
            "target_operating_profit": float(t.target_operating_profit),
            "actual_operating_profit": actual_op,
            "op_variance": (actual_op - float(t.target_operating_profit)) if actual_op is not None else None,
        })
    return {"data": out}
