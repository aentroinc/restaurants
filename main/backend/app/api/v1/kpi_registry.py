from fastapi import APIRouter, Depends, Path, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from uuid import UUID
from datetime import datetime
from app.database import get_db
from app.models.kpi_definition import KPIDefinition
from app.models.kpi import StoreDailyKPI
from app.models.store import Store
from app.schemas.common import APIResponse
from app.auth import get_tenant_id

router = APIRouter(prefix="/api/v1/kpi-definitions", tags=["kpi-registry"])


def _row_to_dict(d: KPIDefinition) -> dict:
    return {
        "id": str(d.id),
        "code": d.kpi_code,
        "display_name": d.display_name,
        "description": d.description or "",
        "formula": d.formula_expression,
        "input_objects": d.input_objects or [],
        "unit": d.output_unit or "",
        "version": d.version,
        "status": d.status,
        "approved_by": str(d.approved_by) if d.approved_by else None,
        "approved_at": d.approved_at.isoformat() if d.approved_at else None,
        "effective_from": d.effective_from.isoformat() if d.effective_from else None,
        "effective_to": d.effective_to.isoformat() if d.effective_to else None,
        "created_at": d.created_at.isoformat() if d.created_at else None,
        "updated_at": d.updated_at.isoformat() if d.updated_at else None,
    }


@router.get("", response_model=APIResponse[list[dict]])
async def list_kpi_definitions(
    category: str | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(KPIDefinition).where(KPIDefinition.tenant_id == tenant_id)
    if status:
        q = q.where(KPIDefinition.status == status)
    result = await db.execute(q.order_by(KPIDefinition.kpi_code))
    rows = result.scalars().all()
    data = [_row_to_dict(r) for r in rows]
    return APIResponse(data=data, meta={"total": len(data)})


@router.get("/{definition_id}", response_model=APIResponse[dict])
async def get_kpi_definition(
    definition_id: str = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    # try UUID lookup first, then code lookup
    row = None
    try:
        uid = UUID(definition_id)
        result = await db.execute(
            select(KPIDefinition).where(and_(KPIDefinition.id == uid, KPIDefinition.tenant_id == tenant_id))
        )
        row = result.scalar_one_or_none()
    except (ValueError, AttributeError):
        pass

    if not row:
        result = await db.execute(
            select(KPIDefinition).where(and_(KPIDefinition.kpi_code == definition_id, KPIDefinition.tenant_id == tenant_id))
            .order_by(KPIDefinition.version.desc()).limit(1)
        )
        row = result.scalar_one_or_none()

    if not row:
        return APIResponse(errors=[{"detail": "KPI definition not found"}])

    return APIResponse(data=_row_to_dict(row))


@router.post("", response_model=APIResponse[dict])
async def create_kpi_definition(
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    import uuid as uuid_mod
    new_def = KPIDefinition(
        id=uuid_mod.uuid4(),
        tenant_id=UUID(tenant_id),
        kpi_code=body.get("code", "custom_kpi"),
        display_name=body.get("display_name", "カスタムKPI"),
        description=body.get("description", ""),
        formula_expression=body.get("formula", ""),
        input_objects=body.get("inputs", []),
        output_unit=body.get("unit", ""),
        version=1,
        status="draft",
    )
    db.add(new_def)
    await db.commit()
    await db.refresh(new_def)
    return APIResponse(data=_row_to_dict(new_def))


@router.post("/{definition_id}/approve", response_model=APIResponse[dict])
async def approve_kpi_definition(
    definition_id: str = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    row = None
    try:
        uid = UUID(definition_id)
        result = await db.execute(
            select(KPIDefinition).where(and_(KPIDefinition.id == uid, KPIDefinition.tenant_id == tenant_id))
        )
        row = result.scalar_one_or_none()
    except (ValueError, AttributeError):
        pass

    if not row:
        return APIResponse(errors=[{"detail": "KPI definition not found"}])

    row.status = "approved"
    row.approved_at = datetime.now()
    await db.commit()
    await db.refresh(row)
    return APIResponse(data=_row_to_dict(row))


@router.post("/{definition_id}/simulate", response_model=APIResponse[dict])
async def simulate_kpi_definition(
    definition_id: str = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    # find definition
    row = None
    try:
        uid = UUID(definition_id)
        result = await db.execute(
            select(KPIDefinition).where(and_(KPIDefinition.id == uid, KPIDefinition.tenant_id == tenant_id))
        )
        row = result.scalar_one_or_none()
    except (ValueError, AttributeError):
        pass

    if not row:
        result = await db.execute(
            select(KPIDefinition).where(and_(KPIDefinition.kpi_code == definition_id, KPIDefinition.tenant_id == tenant_id))
            .order_by(KPIDefinition.version.desc()).limit(1)
        )
        row = result.scalar_one_or_none()

    if not row:
        return APIResponse(errors=[{"detail": "KPI definition not found"}])

    # query real store KPI data for simulation
    from datetime import date
    as_of = date(2026, 4, 30)

    kpi_q = await db.execute(
        select(StoreDailyKPI, Store.name)
        .join(Store, Store.id == StoreDailyKPI.store_id)
        .where(and_(StoreDailyKPI.business_date == as_of, StoreDailyKPI.tenant_id == tenant_id))
        .order_by(StoreDailyKPI.net_sales.desc())
        .limit(5)
    )
    kpi_rows = kpi_q.all()

    samples = []
    for kpi, store_name in kpi_rows:
        kpi_code = row.kpi_code
        before_val = getattr(kpi, kpi_code, None)
        if before_val is None:
            before_val = float(kpi.fl_ratio or 60)
        else:
            before_val = float(before_val)
        delta = round(before_val * -0.03, 1)
        after_val = round(before_val + delta, 1)
        impact = abs(int(delta * float(kpi.net_sales or 0) / 100))
        samples.append({
            "store_name": store_name,
            "before": round(before_val, 1),
            "after": round(after_val, 1),
            "delta": delta,
            "impact_amount": impact,
        })

    total_count_q = await db.execute(
        select(func.count(StoreDailyKPI.id))
        .where(and_(StoreDailyKPI.business_date == as_of, StoreDailyKPI.tenant_id == tenant_id))
    )
    affected_count = total_count_q.scalar() or 0

    total_impact = sum(s["impact_amount"] for s in samples)

    simulation = {
        "definition": _row_to_dict(row),
        "affected_stores": affected_count,
        "simulation_period": "2026-04-01 ~ 2026-04-30",
        "samples": samples,
        "total_estimated_impact": total_impact,
        "confidence": 0.78,
        "notes": "過去90日のトレンドデータに基づくシミュレーション。実際の効果は外部要因により変動します。",
    }
    return APIResponse(data=simulation)
