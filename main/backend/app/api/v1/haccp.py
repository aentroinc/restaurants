"""HACCP monitoring API + AllergenMatrix view.

Designed for tablet input (POST /monitoring) — single record < 5 sec.
"""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_tenant_id
from app.database import get_db
from app.middleware.audit import log_audit
from app.models.haccp import AllergenMatrix, CCPDefinition, HACCPMonitoring

router = APIRouter(prefix="/api/v1/haccp", tags=["haccp"])


class CCPDefinitionOut(BaseModel):
    id: str
    name: str
    threshold_min: float | None
    threshold_max: float | None
    monitoring_frequency: str | None


class MonitoringIn(BaseModel):
    store_id: str
    ccp_id: str
    measured_value: Decimal
    note: str | None = None


class MonitoringOut(BaseModel):
    id: str
    store_id: str
    ccp_id: str
    measured_value: float
    is_compliant: bool
    deviation_action: str | None
    monitoring_date_time: str


@router.get("/ccp/{store_id}", response_model=list[CCPDefinitionOut])
async def list_ccps_for_store(
    store_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    res = await db.execute(
        select(CCPDefinition).where(CCPDefinition.tenant_id == tenant_id)
    )
    return [
        CCPDefinitionOut(
            id=str(c.id),
            name=c.name,
            threshold_min=float(c.threshold_min) if c.threshold_min is not None else None,
            threshold_max=float(c.threshold_max) if c.threshold_max is not None else None,
            monitoring_frequency=c.monitoring_frequency,
        )
        for c in res.scalars().all()
    ]


@router.post("/monitoring", response_model=MonitoringOut)
async def submit_monitoring(
    body: MonitoringIn,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    ccp_q = await db.execute(
        select(CCPDefinition).where(
            CCPDefinition.id == body.ccp_id, CCPDefinition.tenant_id == tenant_id
        )
    )
    ccp = ccp_q.scalar_one_or_none()
    if not ccp:
        raise HTTPException(404, "ccp not found")

    is_ok = True
    if ccp.threshold_min is not None and body.measured_value < Decimal(str(ccp.threshold_min)):
        is_ok = False
    if ccp.threshold_max is not None and body.measured_value > Decimal(str(ccp.threshold_max)):
        is_ok = False

    rec = HACCPMonitoring(
        tenant_id=tenant_id,
        store_id=body.store_id,
        ccp_id=ccp.id,
        monitoring_date_time=datetime.now(timezone.utc),
        measured_value=body.measured_value,
        threshold_min=ccp.threshold_min,
        threshold_max=ccp.threshold_max,
        is_compliant=is_ok,
        deviation_action=None if is_ok else (body.note or "fix required"),
    )
    db.add(rec)
    await db.commit()
    await db.refresh(rec)
    log_audit(
        tenant_id, None, "monitor", "haccp", str(rec.id),
        {"ccp": ccp.name, "compliant": is_ok},
    )
    return MonitoringOut(
        id=str(rec.id),
        store_id=str(rec.store_id),
        ccp_id=str(rec.ccp_id),
        measured_value=float(rec.measured_value),
        is_compliant=rec.is_compliant,
        deviation_action=rec.deviation_action,
        monitoring_date_time=rec.monitoring_date_time.isoformat(),
    )


@router.get("/monitoring/recent")
async def recent_monitoring(
    store_id: str | None = Query(None),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    stmt = select(HACCPMonitoring).where(HACCPMonitoring.tenant_id == tenant_id)
    if store_id:
        stmt = stmt.where(HACCPMonitoring.store_id == store_id)
    stmt = stmt.order_by(desc(HACCPMonitoring.monitoring_date_time)).limit(limit)
    res = await db.execute(stmt)
    return [
        {
            "id": str(r.id),
            "store_id": str(r.store_id),
            "ccp_id": str(r.ccp_id),
            "measured_value": float(r.measured_value),
            "is_compliant": r.is_compliant,
            "monitoring_date_time": r.monitoring_date_time.isoformat() if r.monitoring_date_time else None,
        }
        for r in res.scalars().all()
    ]


@router.get("/allergen-matrix")
async def allergen_matrix(
    product_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """28 品目アレルゲン マトリクス view."""
    stmt = select(AllergenMatrix).where(AllergenMatrix.tenant_id == tenant_id)
    if product_id:
        stmt = stmt.where(AllergenMatrix.product_id == product_id)
    res = await db.execute(stmt.limit(2000))
    rows = res.scalars().all()
    by_product: dict[str, dict] = {}
    for r in rows:
        key = str(r.product_id)
        by_product.setdefault(key, {})[r.allergen_code] = {
            "presence": r.presence,
            "cross_contamination_risk": r.cross_contamination_risk,
        }
    return {"products": by_product, "count": len(rows)}


# 28 品目（特定原材料 7 + 特定原材料に準ずる 21）
ALLERGEN_28 = [
    "egg", "milk", "wheat", "buckwheat", "peanut", "shrimp", "crab",  # 特定 7
    "almond", "abalone", "squid", "salmon_roe", "orange", "cashew", "kiwi",
    "beef", "walnut", "sesame", "salmon", "mackerel", "soybean", "chicken",
    "banana", "pork", "matsutake", "peach", "yam", "apple", "gelatin",
]


@router.get("/allergen-codes")
async def list_allergen_codes():
    return {"codes": ALLERGEN_28, "count": len(ALLERGEN_28)}
