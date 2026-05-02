"""
労務需要予測 → 必要人時 → シフトドラフト API。
店長の3時間手動シフト編成を15分にする。
"""
from __future__ import annotations
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Query, Path, HTTPException
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_tenant_id
from app.database import get_db
from app.models.brand import Brand
from app.models.employee import Employee
from app.models.labor_forecast import DemandForecast30m, LaborRequirement, ShiftDraft
from app.models.store import Store
from app.schemas.common import APIResponse
from app.schemas.labor_forecast import (
    ForecastSlotRead, RequirementSlotRead, ShiftDraftCreate, ShiftDraftRead, ShiftDraftUpdate,
)
from app.services.demand_forecaster import predict
from app.services.labor_optimizer import compute_requirements, estimate_cost
from app.services.shift_draft import EmployeeInput, generate_draft

router = APIRouter(prefix="/api/v1/labor", tags=["labor-forecast"])


async def _resolve_brand_name(db: AsyncSession, store_id: UUID) -> str | None:
    q = await db.execute(
        select(Brand.name).join(Store, Store.brand_id == Brand.id).where(Store.id == store_id)
    )
    row = q.first()
    return row[0] if row else None


@router.get("/forecast", response_model=APIResponse[list[ForecastSlotRead]])
async def get_forecast(
    store_id: UUID = Query(...),
    date_from: date = Query(..., alias="from"),
    date_to: date = Query(..., alias="to"),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    if (date_to - date_from).days > 30:
        raise HTTPException(status_code=400, detail="range too large (max 30 days)")
    preds = await predict(db, tenant_id, store_id, date_from, date_to)
    items = [
        ForecastSlotRead(
            slot_start=p.slot_start,
            predicted_customers=p.predicted_customers,
            predicted_sales=p.predicted_sales,
            confidence=p.confidence,
            factors=p.factors,
        )
        for p in preds
    ]
    return APIResponse(data=items, meta={"count": len(items)})


@router.get("/requirements", response_model=APIResponse[list[RequirementSlotRead]])
async def get_requirements(
    store_id: UUID = Query(...),
    date_from: date = Query(..., alias="from"),
    date_to: date = Query(..., alias="to"),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    if (date_to - date_from).days > 30:
        raise HTTPException(status_code=400, detail="range too large (max 30 days)")
    brand_name = await _resolve_brand_name(db, store_id)
    preds = await predict(db, tenant_id, store_id, date_from, date_to)
    reqs = compute_requirements(preds, brand_name=brand_name)
    items = [
        RequirementSlotRead(
            slot_start=r.slot_start,
            required_fte=r.required_fte,
            role_split=r.role_split,
            hourly_wage_yen=r.hourly_wage_yen,
        )
        for r in reqs
    ]
    return APIResponse(data=items, meta={"count": len(items), "brand": brand_name, "estimated_cost_yen": estimate_cost(reqs)})


@router.post("/shifts/draft", response_model=APIResponse[ShiftDraftRead])
async def create_shift_draft(
    payload: ShiftDraftCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    store_id = payload.store_id
    week_start = payload.week_start
    week_end = week_start + timedelta(days=6)
    brand_name = payload.brand_name or await _resolve_brand_name(db, store_id)

    # 1) 予測
    preds = await predict(db, tenant_id, store_id, week_start, week_end)
    # 2) 必要人時
    reqs = compute_requirements(preds, brand_name=brand_name)
    # 3) 従業員ロード
    eq = await db.execute(
        select(Employee).where(and_(Employee.tenant_id == tenant_id, Employee.active == True))  # noqa: E712
    )
    emps_raw = eq.scalars().all()
    if not emps_raw:
        # 合成データで動かす場合: ダミー従業員を生成
        emps_raw = []
    employees: list[EmployeeInput] = []
    for e in emps_raw:
        # role mapping (社員 master の role -> 担当ロール集合)
        role_map = {
            "store_manager": ["ホール", "キッチン", "レジ"],
            "shift_leader": ["ホール", "キッチン", "レジ"],
            "hall": ["ホール", "レジ"],
            "kitchen": ["キッチン"],
            "cashier": ["レジ", "ホール"],
        }
        roles = role_map.get(e.role, ["ホール", "キッチン", "レジ"])
        employees.append(EmployeeInput(
            id=str(e.id),
            name=e.name,
            roles=roles,
            max_hours_per_week=40.0,
            min_hours_per_week=20.0,
        ))
    if not employees:
        # フォールバック: 8人ダミー (デモ動作のため)
        roles_pool = [["ホール"], ["キッチン"], ["レジ", "ホール"], ["ホール", "キッチン", "レジ"]]
        for i in range(8):
            employees.append(EmployeeInput(
                id=f"demo-emp-{i+1}",
                name=f"スタッフ{i+1}",
                roles=roles_pool[i % len(roles_pool)],
                max_hours_per_week=40.0,
                min_hours_per_week=15.0,
            ))

    # 4) ドラフト生成
    draft = generate_draft(str(store_id), week_start, employees, reqs)
    cost = draft["summary"]["cost_estimate_yen"]

    # 5) DB保存
    sd = ShiftDraft(
        id=uuid4(),
        tenant_id=tenant_id,
        store_id=store_id,
        week_start=week_start,
        draft_json=draft,
        status="draft",
        cost_estimate=Decimal(cost),
    )
    db.add(sd)
    await db.commit()
    await db.refresh(sd)

    return APIResponse(data=ShiftDraftRead(
        id=sd.id, store_id=sd.store_id, week_start=sd.week_start,
        status=sd.status, cost_estimate=int(sd.cost_estimate),
        draft_json=sd.draft_json or {},
        created_at=sd.created_at, updated_at=sd.updated_at, published_at=sd.published_at,
    ))


@router.get("/shifts/drafts/{draft_id}", response_model=APIResponse[ShiftDraftRead])
async def get_shift_draft(
    draft_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = await db.execute(select(ShiftDraft).where(and_(
        ShiftDraft.id == draft_id, ShiftDraft.tenant_id == tenant_id,
    )))
    sd = q.scalar_one_or_none()
    if not sd:
        return APIResponse(errors=[{"detail": "Shift draft not found"}])
    return APIResponse(data=ShiftDraftRead(
        id=sd.id, store_id=sd.store_id, week_start=sd.week_start,
        status=sd.status, cost_estimate=int(sd.cost_estimate),
        draft_json=sd.draft_json or {},
        created_at=sd.created_at, updated_at=sd.updated_at, published_at=sd.published_at,
    ))


@router.put("/shifts/drafts/{draft_id}", response_model=APIResponse[ShiftDraftRead])
async def update_shift_draft(
    payload: ShiftDraftUpdate,
    draft_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = await db.execute(select(ShiftDraft).where(and_(
        ShiftDraft.id == draft_id, ShiftDraft.tenant_id == tenant_id,
    )))
    sd = q.scalar_one_or_none()
    if not sd:
        return APIResponse(errors=[{"detail": "Shift draft not found"}])
    if sd.status == "published":
        raise HTTPException(status_code=409, detail="published draft cannot be edited")
    sd.draft_json = payload.draft_json
    # 再見積コスト
    summary = (payload.draft_json or {}).get("summary", {})
    if "cost_estimate_yen" in summary:
        sd.cost_estimate = Decimal(int(summary["cost_estimate_yen"]))
    await db.commit()
    await db.refresh(sd)
    return APIResponse(data=ShiftDraftRead(
        id=sd.id, store_id=sd.store_id, week_start=sd.week_start,
        status=sd.status, cost_estimate=int(sd.cost_estimate),
        draft_json=sd.draft_json or {},
        created_at=sd.created_at, updated_at=sd.updated_at, published_at=sd.published_at,
    ))


@router.post("/shifts/drafts/{draft_id}/publish", response_model=APIResponse[ShiftDraftRead])
async def publish_shift_draft(
    draft_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = await db.execute(select(ShiftDraft).where(and_(
        ShiftDraft.id == draft_id, ShiftDraft.tenant_id == tenant_id,
    )))
    sd = q.scalar_one_or_none()
    if not sd:
        return APIResponse(errors=[{"detail": "Shift draft not found"}])
    sd.status = "published"
    sd.published_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(sd)
    return APIResponse(data=ShiftDraftRead(
        id=sd.id, store_id=sd.store_id, week_start=sd.week_start,
        status=sd.status, cost_estimate=int(sd.cost_estimate),
        draft_json=sd.draft_json or {},
        created_at=sd.created_at, updated_at=sd.updated_at, published_at=sd.published_at,
    ))


@router.get("/shifts/drafts", response_model=APIResponse[list[ShiftDraftRead]])
async def list_shift_drafts(
    store_id: UUID | None = Query(None),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(ShiftDraft).where(ShiftDraft.tenant_id == tenant_id)
    if store_id:
        q = q.where(ShiftDraft.store_id == store_id)
    if status:
        q = q.where(ShiftDraft.status == status)
    q = q.order_by(ShiftDraft.created_at.desc()).limit(50)
    rows = (await db.execute(q)).scalars().all()
    items = [
        ShiftDraftRead(
            id=r.id, store_id=r.store_id, week_start=r.week_start,
            status=r.status, cost_estimate=int(r.cost_estimate),
            draft_json=r.draft_json or {},
            created_at=r.created_at, updated_at=r.updated_at, published_at=r.published_at,
        )
        for r in rows
    ]
    return APIResponse(data=items, meta={"count": len(items)})
