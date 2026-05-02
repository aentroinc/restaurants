from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from datetime import date, timedelta
from uuid import UUID
from app.database import get_db
from app.models.demand import SKU, InventorySnapshot, DemandForecast, ReplenishmentRecommendation
from app.models.store import Store
from app.schemas.common import APIResponse
from app.schemas.demand import (
    SKURead,
    InventorySnapshotRead,
    DemandForecastRead,
    ReplenishmentRead,
    SKUForecastTimeseries,
    WasteAnalysis,
    WasteAnalysisItem,
    ScenarioBundle,
    ReplenishmentScenario,
)
from app.auth import get_tenant_id

router = APIRouter(prefix="/api/v1/demand", tags=["demand"])


@router.get("/skus", response_model=APIResponse[list[SKURead]])
async def list_skus(
    category: str | None = Query(None),
    storage_type: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(SKU).where(SKU.tenant_id == tenant_id)
    if category:
        q = q.where(SKU.category == category)
    if storage_type:
        q = q.where(SKU.storage_type == storage_type)
    q = q.order_by(SKU.code).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(q)).scalars().all()
    items = [
        SKURead(
            id=s.id, code=s.code, name=s.name, category=s.category,
            storage_type=s.storage_type, shelf_life_days=s.shelf_life_days,
            unit_cost=s.unit_cost, unit=s.unit,
            factory_id=s.factory_id, primary_dc_id=s.primary_dc_id,
            created_at=s.created_at,
        ) for s in rows
    ]
    return APIResponse(data=items)


@router.get("/skus/{sku_id}", response_model=APIResponse[SKURead])
async def get_sku(
    sku_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = await db.execute(select(SKU).where(and_(SKU.id == sku_id, SKU.tenant_id == tenant_id)))
    s = q.scalar_one_or_none()
    if not s:
        return APIResponse(errors=[{"detail": "SKU not found"}])
    return APIResponse(data=SKURead(
        id=s.id, code=s.code, name=s.name, category=s.category,
        storage_type=s.storage_type, shelf_life_days=s.shelf_life_days,
        unit_cost=s.unit_cost, unit=s.unit,
        factory_id=s.factory_id, primary_dc_id=s.primary_dc_id,
        created_at=s.created_at,
    ))


@router.get("/forecast/timeseries", response_model=APIResponse[SKUForecastTimeseries])
async def forecast_timeseries(
    sku_id: UUID = Query(...),
    store_id: UUID | None = Query(None),
    past_days: int = Query(14, ge=0, le=180),
    future_days: int = Query(7, ge=0, le=90),
    as_of: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    if as_of is None:
        as_of = date(2026, 4, 30)
    start = as_of - timedelta(days=past_days)
    end = as_of + timedelta(days=future_days)

    q = select(DemandForecast).where(and_(
        DemandForecast.tenant_id == tenant_id,
        DemandForecast.sku_id == sku_id,
        DemandForecast.forecast_date >= start,
        DemandForecast.forecast_date <= end,
    ))
    if store_id:
        q = q.where(DemandForecast.store_id == store_id)
    else:
        q = q.where(DemandForecast.store_id.is_(None))
    q = q.order_by(DemandForecast.forecast_date)
    rows = (await db.execute(q)).scalars().all()

    dates = [r.forecast_date for r in rows]
    forecast = [r.forecasted_quantity for r in rows]
    lower = [r.confidence_lower for r in rows]
    upper = [r.confidence_upper for r in rows]
    actual = [r.actual_quantity for r in rows]

    return APIResponse(data=SKUForecastTimeseries(
        sku_id=sku_id, store_id=store_id,
        dates=dates, forecast=forecast, lower=lower, upper=upper, actual=actual,
    ))


@router.get("/inventory/snapshot", response_model=APIResponse[list[InventorySnapshotRead]])
async def inventory_snapshot(
    snapshot_date: date | None = Query(None, alias="date"),
    store_id: UUID | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(InventorySnapshot, SKU.name).join(SKU, SKU.id == InventorySnapshot.sku_id).where(
        InventorySnapshot.tenant_id == tenant_id
    )
    if snapshot_date:
        q = q.where(InventorySnapshot.snapshot_date == snapshot_date)
    if store_id:
        q = q.where(InventorySnapshot.store_id == store_id)
    q = q.order_by(InventorySnapshot.snapshot_date.desc(), InventorySnapshot.waste_risk_pct.desc())
    q = q.offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(q)).all()
    items = [
        InventorySnapshotRead(
            id=r[0].id, store_id=r[0].store_id, sku_id=r[0].sku_id, sku_name=r[1],
            snapshot_date=r[0].snapshot_date,
            on_hand_quantity=r[0].on_hand_quantity, days_of_supply=r[0].days_of_supply,
            waste_risk_pct=r[0].waste_risk_pct, stockout_risk_pct=r[0].stockout_risk_pct,
        ) for r in rows
    ]
    return APIResponse(data=items)


@router.get("/replenishment/recommendations", response_model=APIResponse[list[ReplenishmentRead]])
async def list_replenishment(
    priority: str | None = Query(None),
    status: str | None = Query(None),
    store_id: UUID | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(ReplenishmentRecommendation, SKU.name, Store.name).join(
        SKU, SKU.id == ReplenishmentRecommendation.sku_id
    ).join(
        Store, Store.id == ReplenishmentRecommendation.store_id
    ).where(ReplenishmentRecommendation.tenant_id == tenant_id)
    if priority:
        q = q.where(ReplenishmentRecommendation.priority == priority)
    if status:
        q = q.where(ReplenishmentRecommendation.status == status)
    if store_id:
        q = q.where(ReplenishmentRecommendation.store_id == store_id)
    q = q.order_by(ReplenishmentRecommendation.created_at.desc())
    q = q.offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(q)).all()
    items = [
        ReplenishmentRead(
            id=r[0].id, store_id=r[0].store_id, sku_id=r[0].sku_id,
            sku_name=r[1], store_name=r[2],
            recommended_quantity=r[0].recommended_quantity,
            recommended_units=r[0].recommended_units,
            reason=r[0].reason, priority=r[0].priority, status=r[0].status,
            created_at=r[0].created_at,
        ) for r in rows
    ]
    return APIResponse(data=items)


@router.post("/replenishment/{rec_id}/apply", response_model=APIResponse[ReplenishmentRead])
async def apply_replenishment(
    rec_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = await db.execute(select(ReplenishmentRecommendation).where(and_(
        ReplenishmentRecommendation.id == rec_id,
        ReplenishmentRecommendation.tenant_id == tenant_id,
    )))
    rec = q.scalar_one_or_none()
    if not rec:
        return APIResponse(errors=[{"detail": "Recommendation not found"}])
    rec.status = "applied"
    await db.commit()
    await db.refresh(rec)
    return APIResponse(data=ReplenishmentRead(
        id=rec.id, store_id=rec.store_id, sku_id=rec.sku_id,
        recommended_quantity=rec.recommended_quantity,
        recommended_units=rec.recommended_units,
        reason=rec.reason, priority=rec.priority, status=rec.status,
        created_at=rec.created_at,
    ))


@router.get("/waste-analysis", response_model=APIResponse[WasteAnalysis])
async def waste_analysis(
    period: str = Query("7d"),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    days = 7
    if period.endswith("d"):
        try:
            days = int(period[:-1])
        except ValueError:
            days = 7
    as_of = date(2026, 4, 30)
    start = as_of - timedelta(days=days)

    q = await db.execute(
        select(
            InventorySnapshot.sku_id,
            SKU.name,
            func.sum(InventorySnapshot.on_hand_quantity * InventorySnapshot.waste_risk_pct / 100.0).label("waste_qty"),
            func.sum(InventorySnapshot.on_hand_quantity * InventorySnapshot.waste_risk_pct / 100.0 * SKU.unit_cost).label("waste_cost"),
        )
        .join(SKU, SKU.id == InventorySnapshot.sku_id)
        .where(and_(
            InventorySnapshot.tenant_id == tenant_id,
            InventorySnapshot.snapshot_date >= start,
            InventorySnapshot.snapshot_date <= as_of,
        ))
        .group_by(InventorySnapshot.sku_id, SKU.name)
        .order_by(func.sum(InventorySnapshot.on_hand_quantity * InventorySnapshot.waste_risk_pct / 100.0 * SKU.unit_cost).desc())
        .limit(10)
    )
    rows = q.all()
    top = [
        WasteAnalysisItem(
            sku_id=r[0], sku_name=r[1],
            waste_quantity=float(r[2] or 0), waste_cost_yen=float(r[3] or 0),
            primary_reason="過剰発注" if (r[2] or 0) > 0 else "需要減",
        ) for r in rows
    ]
    reason_distribution = {
        "過剰発注": 0.42,
        "需要減": 0.23,
        "賞味期限切れ": 0.18,
        "オペミス": 0.10,
        "その他": 0.07,
    }
    return APIResponse(data=WasteAnalysis(period=period, top_skus=top, reason_distribution=reason_distribution))


@router.get("/scenarios", response_model=APIResponse[ScenarioBundle])
async def replenishment_scenarios(
    sku_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    sku_q = await db.execute(select(SKU).where(and_(SKU.id == sku_id, SKU.tenant_id == tenant_id)))
    sku = sku_q.scalar_one_or_none()
    base_cost = float(sku.unit_cost) if sku else 1000.0
    scenarios = [
        ReplenishmentScenario(
            name="積極案",
            description="欠品ゼロ優先。安全在庫を1.5倍に。",
            expected_waste_pct=8.5,
            expected_stockout_pct=0.5,
            expected_cost_yen=base_cost * 150,
        ),
        ReplenishmentScenario(
            name="バランス案",
            description="廃棄と欠品の最適点。AI推奨。",
            expected_waste_pct=4.2,
            expected_stockout_pct=2.1,
            expected_cost_yen=base_cost * 100,
        ),
        ReplenishmentScenario(
            name="抑制案",
            description="廃棄極小化。多少の欠品リスク容認。",
            expected_waste_pct=1.8,
            expected_stockout_pct=6.3,
            expected_cost_yen=base_cost * 70,
        ),
    ]
    return APIResponse(data=ScenarioBundle(sku_id=sku_id, scenarios=scenarios))
