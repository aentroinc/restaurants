"""Cost-variance (food cost analytics) router.

Endpoints:
  POST /api/v1/cost-variance/inventory-count   batch upsert stocktake rows
  POST /api/v1/cost-variance/compute            run theoretical + variance for a store/period
  GET  /api/v1/cost-variance/heatmap            store x ingredient grid for a period
  GET  /api/v1/cost-variance/store/{store_id}/details   waterfall for one store/period
  GET  /api/v1/cost-variance/alerts             severity=high alerts across stores
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_tenant_id
from app.database import get_db
from app.schemas.common import APIResponse
from app.services import cost_variance_engine as cve
from app.models.cost_variance import InventoryCount


router = APIRouter(prefix="/api/v1/cost-variance", tags=["cost-variance"])


# ---------------------------------------------------------------------------
# request / response models
# ---------------------------------------------------------------------------

class InventoryCountRow(BaseModel):
    store_id: UUID
    count_date: date
    ingredient_id: UUID
    qty_actual: float
    unit_cost: float = 0
    notes: Optional[str] = None


class InventoryCountBatch(BaseModel):
    rows: list[InventoryCountRow] = Field(default_factory=list)


class ComputeRequest(BaseModel):
    store_id: UUID
    period: date
    period_start: Optional[date] = None


# ---------------------------------------------------------------------------
# inventory ingest
# ---------------------------------------------------------------------------

@router.post("/inventory-count", response_model=APIResponse[dict])
async def submit_inventory_count(
    payload: InventoryCountBatch,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    inserted = 0
    for row in payload.rows:
        rec = InventoryCount(
            tenant_id=UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
            store_id=row.store_id,
            count_date=row.count_date,
            ingredient_id=row.ingredient_id,
            qty_actual=row.qty_actual,
            unit_cost=row.unit_cost,
            notes=row.notes,
        )
        db.add(rec)
        inserted += 1
    await db.commit()
    return APIResponse(data={"inserted": inserted})


# ---------------------------------------------------------------------------
# compute
# ---------------------------------------------------------------------------

@router.post("/compute", response_model=APIResponse[dict])
async def compute_cost_variance(
    payload: ComputeRequest,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    period_start = payload.period_start or (payload.period - timedelta(days=6))
    theoretical = await cve.compute_theoretical(
        db, tenant_id, payload.store_id, period_start, payload.period, persist=True
    )
    variance = await cve.compute_variance(
        db, tenant_id, payload.store_id, payload.period, period_start
    )
    await db.commit()
    return APIResponse(data={
        "store_id": str(payload.store_id),
        "period": payload.period.isoformat(),
        "period_start": period_start.isoformat(),
        "theoretical_count": len(theoretical),
        "variance_count": len(variance),
        "theoretical": theoretical,
        "variance": variance,
    })


# ---------------------------------------------------------------------------
# read endpoints
# ---------------------------------------------------------------------------

@router.get("/heatmap", response_model=APIResponse[dict])
async def heatmap(
    period: date = Query(...),
    brand_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    data = await cve.heatmap_data(db, tenant_id, period, brand_id)
    return APIResponse(data=data)


@router.get("/store/{store_id}/details", response_model=APIResponse[dict])
async def store_details(
    store_id: UUID,
    period: date = Query(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    data = await cve.store_details(db, tenant_id, store_id, period)
    return APIResponse(data=data)


@router.get("/alerts", response_model=APIResponse[list[dict]])
async def alerts(
    severity: str = Query("high"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    rows = await cve.list_alerts(db, tenant_id, severity=severity, limit=limit)
    return APIResponse(data=rows)
