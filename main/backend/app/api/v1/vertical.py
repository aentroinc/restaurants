from fastapi import APIRouter, Depends, Query, Path, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, case, func as sqlfunc, extract, Integer as SAInt
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel
from app.database import get_db
from app.auth import get_tenant_id
from app.schemas.common import APIResponse
from app.models.recipe import Ingredient, Recipe, RecipeBOM, IngredientPriceHistory
from app.models.shift import Shift, LaborLawProfile
from app.models.qsc import QSCTemplate, QSCAudit
from app.models.haccp import CCPDefinition, HACCPMonitoring, AllergenMatrix
from app.models.franchise import FranchiseAgreement, FranchiseRoyaltyCalc
from app.models.benchmark import IndustryBenchmark
from app.services.labor_compliance import check_shift_violations
from app.services.recipe_costing import calculate_theoretical_food_cost, calculate_actual_vs_theoretical_variance
from app.services.royalty_engine import calculate_monthly_royalties

router = APIRouter(prefix="/api/v1/vertical", tags=["vertical"])


# --- Pydantic schemas ---

class IngredientCreate(BaseModel):
    name: str
    unit: str
    standard_cost_per_unit: float
    supplier_id: UUID | None = None
    allergen_codes: list[str] = []
    storage_temperature: str = "常温"
    shelf_life_days: int | None = None

class RecipeCreate(BaseModel):
    product_id: UUID
    version: int = 1
    yield_quantity: int = 1
    cooking_time_minutes: int | None = None
    instructions: str | None = None
    bom: list[dict] = []

class ShiftCreate(BaseModel):
    store_id: UUID
    employee_id: UUID
    role: str
    start_at: datetime
    end_at: datetime
    break_minutes: int = 0

class QSCAuditCreate(BaseModel):
    store_id: UUID
    audit_date: date
    quality_score: float
    service_score: float
    cleanliness_score: float
    template_id: UUID | None = None
    answers: dict = {}
    notes: str | None = None

class HACCPMonitoringCreate(BaseModel):
    store_id: UUID
    ccp_id: UUID
    monitoring_date_time: datetime
    measured_value: float
    deviation_action: str | None = None

class RoyaltyCalcRequest(BaseModel):
    year: int
    month: int


# --- Recipe / BOM ---

@router.get("/recipes")
async def list_recipes(
    product_id: UUID | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(Recipe).where(Recipe.tenant_id == tenant_id)
    if product_id:
        q = q.where(Recipe.product_id == product_id)
    if status:
        q = q.where(Recipe.status == status)
    q = q.order_by(Recipe.created_at.desc())
    q = q.offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(q)).scalars().all()
    return APIResponse(data=[{
        "id": str(r.id), "product_id": str(r.product_id), "version": r.version,
        "yield_quantity": r.yield_quantity, "cooking_time_minutes": r.cooking_time_minutes,
        "status": r.status, "valid_from": r.valid_from.isoformat() if r.valid_from else None,
    } for r in rows])


@router.get("/recipes/{recipe_id}")
async def get_recipe(
    recipe_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = await db.execute(select(Recipe).where(
        and_(Recipe.id == recipe_id, Recipe.tenant_id == tenant_id)
    ))
    recipe = q.scalar_one_or_none()
    if not recipe:
        return APIResponse(errors=[{"detail": "Recipe not found"}])

    bom_q = await db.execute(
        select(RecipeBOM, Ingredient.name).outerjoin(
            Ingredient, Ingredient.id == RecipeBOM.ingredient_id
        ).where(RecipeBOM.recipe_id == recipe_id)
    )
    bom_rows = bom_q.all()
    bom = [{
        "id": str(b.id), "ingredient_id": str(b.ingredient_id),
        "ingredient_name": name, "quantity": float(b.quantity),
        "unit": b.unit, "notes": b.notes,
    } for b, name in bom_rows]

    return APIResponse(data={
        "id": str(recipe.id), "product_id": str(recipe.product_id),
        "version": recipe.version, "yield_quantity": recipe.yield_quantity,
        "cooking_time_minutes": recipe.cooking_time_minutes,
        "instructions": recipe.instructions, "status": recipe.status,
        "valid_from": recipe.valid_from.isoformat() if recipe.valid_from else None,
        "bom": bom,
    })


@router.post("/recipes")
async def create_recipe(
    payload: RecipeCreate = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    recipe = Recipe(
        tenant_id=tenant_id,
        product_id=payload.product_id,
        version=payload.version,
        yield_quantity=payload.yield_quantity,
        cooking_time_minutes=payload.cooking_time_minutes,
        instructions=payload.instructions,
    )
    db.add(recipe)
    await db.flush()

    for item in payload.bom:
        bom = RecipeBOM(
            tenant_id=tenant_id,
            recipe_id=recipe.id,
            ingredient_id=item["ingredient_id"],
            quantity=Decimal(str(item["quantity"])),
            unit=item.get("unit", "g"),
            notes=item.get("notes"),
        )
        db.add(bom)

    await db.commit()
    await db.refresh(recipe)
    return APIResponse(data={"id": str(recipe.id), "status": "created"})


@router.get("/ingredients")
async def list_ingredients(
    page: int = Query(1, ge=1),
    page_size: int = Query(200, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(Ingredient).where(Ingredient.tenant_id == tenant_id)
    q = q.order_by(Ingredient.name).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(q)).scalars().all()
    return APIResponse(data=[{
        "id": str(i.id), "name": i.name, "unit": i.unit,
        "standard_cost_per_unit": float(i.standard_cost_per_unit),
        "allergen_codes": i.allergen_codes or [],
        "storage_temperature": i.storage_temperature,
        "shelf_life_days": i.shelf_life_days,
    } for i in rows])


@router.post("/ingredients")
async def create_ingredient(
    payload: IngredientCreate = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    ing = Ingredient(
        tenant_id=tenant_id,
        name=payload.name,
        unit=payload.unit,
        standard_cost_per_unit=Decimal(str(payload.standard_cost_per_unit)),
        supplier_id=payload.supplier_id,
        allergen_codes=payload.allergen_codes,
        storage_temperature=payload.storage_temperature,
        shelf_life_days=payload.shelf_life_days,
    )
    db.add(ing)
    await db.commit()
    await db.refresh(ing)
    return APIResponse(data={"id": str(ing.id), "name": ing.name})


@router.get("/recipe-costing/summary")
async def recipe_costing_summary(
    product_id: str | None = Query(None),
    period_start: date | None = Query(None),
    period_end: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    if period_start and period_end:
        result = await calculate_actual_vs_theoretical_variance(db, tenant_id, period_start, period_end)
        return APIResponse(data=result)
    result = await calculate_theoretical_food_cost(db, tenant_id, product_id)
    return APIResponse(data=result)


# --- Labor Compliance ---

@router.get("/labor/compliance-report")
async def labor_compliance_report(
    store_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    violations = await check_shift_violations(db, tenant_id, store_id)
    by_type: dict[str, int] = {}
    for v in violations:
        by_type[v["violation_type"]] = by_type.get(v["violation_type"], 0) + 1
    return APIResponse(data={
        "total_violations": len(violations),
        "by_type": by_type,
        "violations": violations[:200],
    })


@router.get("/labor/shifts")
async def list_shifts(
    store_id: UUID | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(Shift).where(Shift.tenant_id == tenant_id)
    if store_id:
        q = q.where(Shift.store_id == store_id)
    if date_from:
        q = q.where(sqlfunc.date(Shift.start_at) >= date_from)
    if date_to:
        q = q.where(sqlfunc.date(Shift.start_at) <= date_to)
    q = q.order_by(Shift.start_at.desc())
    q = q.offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(q)).scalars().all()
    return APIResponse(data=[{
        "id": str(s.id), "store_id": str(s.store_id),
        "employee_id": str(s.employee_id), "role": s.role,
        "start_at": s.start_at.isoformat(), "end_at": s.end_at.isoformat(),
        "break_minutes": s.break_minutes,
        "overtime_hours": float(s.overtime_hours or 0),
        "night_hours": float(s.night_hours or 0),
        "legal_violations": s.legal_violations or [],
    } for s in rows])


@router.post("/labor/shifts")
async def create_shift(
    payload: ShiftCreate = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    work_hours = (payload.end_at - payload.start_at).total_seconds() / 3600
    overtime = max(0, work_hours - payload.break_minutes / 60 - 8)

    night_hours = 0.0
    start_h = payload.start_at.hour
    end_h = payload.end_at.hour
    if start_h >= 22 or end_h <= 5 or end_h >= 22:
        night_hours = min(work_hours, 7.0)

    shift = Shift(
        tenant_id=tenant_id,
        store_id=payload.store_id,
        employee_id=payload.employee_id,
        role=payload.role,
        start_at=payload.start_at,
        end_at=payload.end_at,
        break_minutes=payload.break_minutes,
        overtime_hours=Decimal(str(round(overtime, 2))),
        night_hours=Decimal(str(round(night_hours, 2))),
    )
    db.add(shift)
    await db.commit()
    await db.refresh(shift)
    return APIResponse(data={"id": str(shift.id), "status": "created"})


@router.get("/labor/law-profile")
async def get_law_profile(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = await db.execute(
        select(LaborLawProfile).where(LaborLawProfile.tenant_id == tenant_id).limit(1)
    )
    profile = q.scalar_one_or_none()
    if not profile:
        return APIResponse(data={
            "weekly_max_hours": 40, "daily_max_hours": 8,
            "night_premium_rate": 1.25, "overtime_premium_rate": 1.25,
            "rest_min_minutes_per_6h": 45, "rest_min_minutes_per_8h": 60,
            "rest_interval_min_hours": 11, "minor_under_18_no_night": True,
        })
    return APIResponse(data={
        "id": str(profile.id),
        "weekly_max_hours": profile.weekly_max_hours,
        "daily_max_hours": profile.daily_max_hours,
        "night_premium_rate": float(profile.night_premium_rate),
        "overtime_premium_rate": float(profile.overtime_premium_rate),
        "rest_min_minutes_per_6h": profile.rest_min_minutes_per_6h,
        "rest_min_minutes_per_8h": profile.rest_min_minutes_per_8h,
        "rest_interval_min_hours": profile.rest_interval_min_hours,
        "minor_under_18_no_night": profile.minor_under_18_no_night,
    })


# --- QSC ---

@router.get("/qsc/audits")
async def list_qsc_audits(
    store_id: UUID | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(QSCAudit).where(QSCAudit.tenant_id == tenant_id)
    if store_id:
        q = q.where(QSCAudit.store_id == store_id)
    if date_from:
        q = q.where(QSCAudit.audit_date >= date_from)
    if date_to:
        q = q.where(QSCAudit.audit_date <= date_to)
    q = q.order_by(QSCAudit.audit_date.desc())
    q = q.offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(q)).scalars().all()
    return APIResponse(data=[{
        "id": str(a.id), "store_id": str(a.store_id),
        "audit_date": a.audit_date.isoformat(),
        "quality_score": float(a.quality_score),
        "service_score": float(a.service_score),
        "cleanliness_score": float(a.cleanliness_score),
        "overall_score": float(a.overall_score),
        "notes": a.notes,
    } for a in rows])


@router.post("/qsc/audits")
async def create_qsc_audit(
    payload: QSCAuditCreate = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    overall = (payload.quality_score + payload.service_score + payload.cleanliness_score) / 3
    audit = QSCAudit(
        tenant_id=tenant_id,
        store_id=payload.store_id,
        audit_date=payload.audit_date,
        quality_score=Decimal(str(payload.quality_score)),
        service_score=Decimal(str(payload.service_score)),
        cleanliness_score=Decimal(str(payload.cleanliness_score)),
        overall_score=Decimal(str(round(overall, 2))),
        template_id=payload.template_id,
        answers=payload.answers,
        notes=payload.notes,
    )
    db.add(audit)
    await db.commit()
    await db.refresh(audit)
    return APIResponse(data={"id": str(audit.id), "overall_score": float(audit.overall_score)})


@router.get("/qsc/templates")
async def list_qsc_templates(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(QSCTemplate).where(QSCTemplate.tenant_id == tenant_id)
    rows = (await db.execute(q)).scalars().all()
    return APIResponse(data=[{
        "id": str(t.id), "name": t.name, "version": t.version,
        "sections": t.sections or [],
    } for t in rows])


@router.get("/qsc/summary")
async def qsc_summary(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = await db.execute(
        select(
            QSCAudit.store_id,
            sqlfunc.avg(QSCAudit.quality_score).label("avg_q"),
            sqlfunc.avg(QSCAudit.service_score).label("avg_s"),
            sqlfunc.avg(QSCAudit.cleanliness_score).label("avg_c"),
            sqlfunc.avg(QSCAudit.overall_score).label("avg_overall"),
            sqlfunc.count(QSCAudit.id).label("audit_count"),
        ).where(QSCAudit.tenant_id == tenant_id)
        .group_by(QSCAudit.store_id)
        .order_by(sqlfunc.avg(QSCAudit.overall_score).desc())
    )
    rows = q.all()
    return APIResponse(data=[{
        "store_id": str(r.store_id),
        "avg_quality": float(r.avg_q) if r.avg_q else None,
        "avg_service": float(r.avg_s) if r.avg_s else None,
        "avg_cleanliness": float(r.avg_c) if r.avg_c else None,
        "avg_overall": float(r.avg_overall) if r.avg_overall else None,
        "audit_count": r.audit_count,
    } for r in rows])


# --- HACCP ---

@router.get("/haccp/monitoring")
async def list_haccp_monitoring(
    store_id: UUID | None = Query(None),
    ccp_id: UUID | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(HACCPMonitoring).where(HACCPMonitoring.tenant_id == tenant_id)
    if store_id:
        q = q.where(HACCPMonitoring.store_id == store_id)
    if ccp_id:
        q = q.where(HACCPMonitoring.ccp_id == ccp_id)
    q = q.order_by(HACCPMonitoring.monitoring_date_time.desc())
    q = q.offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(q)).scalars().all()
    return APIResponse(data=[{
        "id": str(m.id), "store_id": str(m.store_id), "ccp_id": str(m.ccp_id),
        "monitoring_date_time": m.monitoring_date_time.isoformat(),
        "measured_value": float(m.measured_value),
        "is_compliant": m.is_compliant,
        "deviation_action": m.deviation_action,
    } for m in rows])


@router.post("/haccp/monitoring")
async def create_haccp_monitoring(
    payload: HACCPMonitoringCreate = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    ccp_q = await db.execute(
        select(CCPDefinition).where(
            and_(CCPDefinition.id == payload.ccp_id, CCPDefinition.tenant_id == tenant_id)
        )
    )
    ccp = ccp_q.scalar_one_or_none()

    is_compliant = True
    if ccp:
        if ccp.threshold_min is not None and Decimal(str(payload.measured_value)) < ccp.threshold_min:
            is_compliant = False
        if ccp.threshold_max is not None and Decimal(str(payload.measured_value)) > ccp.threshold_max:
            is_compliant = False

    record = HACCPMonitoring(
        tenant_id=tenant_id,
        store_id=payload.store_id,
        ccp_id=payload.ccp_id,
        monitoring_date_time=payload.monitoring_date_time,
        measured_value=Decimal(str(payload.measured_value)),
        is_compliant=is_compliant,
        deviation_action=payload.deviation_action if not is_compliant else None,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return APIResponse(data={
        "id": str(record.id), "is_compliant": is_compliant,
    })


@router.get("/haccp/compliance-rate")
async def haccp_compliance_rate(
    store_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(
        sqlfunc.count(HACCPMonitoring.id).label("total"),
        sqlfunc.sum(case((HACCPMonitoring.is_compliant == True, 1), else_=0)).label("compliant"),
    ).where(HACCPMonitoring.tenant_id == tenant_id)
    if store_id:
        q = q.where(HACCPMonitoring.store_id == store_id)
    row = (await db.execute(q)).one_or_none()
    total = row.total if row else 0
    compliant = row.compliant if row and row.compliant else 0
    rate = compliant / total if total > 0 else 0
    return APIResponse(data={
        "total_records": total,
        "compliant_records": compliant,
        "compliance_rate": round(rate, 4),
    })


@router.get("/haccp/allergens/{product_id}")
async def get_allergens(
    product_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(AllergenMatrix).where(
        and_(AllergenMatrix.product_id == product_id, AllergenMatrix.tenant_id == tenant_id)
    )
    rows = (await db.execute(q)).scalars().all()
    return APIResponse(data=[{
        "allergen_code": a.allergen_code,
        "presence": a.presence,
        "cross_contamination_risk": a.cross_contamination_risk,
    } for a in rows])


# --- Franchise ---

@router.get("/franchise/agreements")
async def list_franchise_agreements(
    store_id: UUID | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(FranchiseAgreement).where(FranchiseAgreement.tenant_id == tenant_id)
    if store_id:
        q = q.where(FranchiseAgreement.store_id == store_id)
    q = q.order_by(FranchiseAgreement.effective_from.desc())
    q = q.offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(q)).scalars().all()
    return APIResponse(data=[{
        "id": str(a.id), "store_id": str(a.store_id),
        "agreement_type": a.agreement_type,
        "effective_from": a.effective_from.isoformat(),
        "effective_to": a.effective_to.isoformat() if a.effective_to else None,
        "royalty_structure": a.royalty_structure,
        "advertising_fund_rate": float(a.advertising_fund_rate),
        "minimum_revenue_guarantee": float(a.minimum_revenue_guarantee) if a.minimum_revenue_guarantee else None,
    } for a in rows])


@router.get("/franchise/royalties")
async def list_royalties(
    year: int = Query(...),
    month: int = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(FranchiseRoyaltyCalc).where(
        and_(
            FranchiseRoyaltyCalc.tenant_id == tenant_id,
            FranchiseRoyaltyCalc.period_year == year,
            FranchiseRoyaltyCalc.period_month == month,
        )
    ).order_by(FranchiseRoyaltyCalc.store_id)
    q = q.offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(q)).scalars().all()
    return APIResponse(data=[{
        "id": str(r.id), "agreement_id": str(r.agreement_id),
        "store_id": str(r.store_id),
        "period": f"{r.period_year}-{r.period_month:02d}",
        "gross_revenue": float(r.gross_revenue),
        "royalty_amount": float(r.royalty_amount),
        "advertising_amount": float(r.advertising_amount),
        "net_payable": float(r.net_payable),
        "status": r.status,
    } for r in rows])


@router.post("/franchise/royalties/calculate")
async def trigger_royalty_calculation(
    payload: RoyaltyCalcRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    results = await calculate_monthly_royalties(db, tenant_id, payload.year, payload.month)
    return APIResponse(data={
        "calculated": len(results),
        "period": f"{payload.year}-{payload.month:02d}",
        "results": results,
    })


# --- Benchmarks ---

@router.get("/benchmarks")
async def list_benchmarks(
    category: str | None = Query(None),
    metric: str | None = Query(None),
    year: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(IndustryBenchmark)
    if category:
        q = q.where(IndustryBenchmark.business_category == category)
    if metric:
        q = q.where(IndustryBenchmark.metric_name == metric)
    if year:
        q = q.where(IndustryBenchmark.period_year == year)
    q = q.order_by(IndustryBenchmark.business_category, IndustryBenchmark.metric_name)
    rows = (await db.execute(q)).scalars().all()
    return APIResponse(data=[{
        "id": str(b.id), "business_category": b.business_category,
        "metric_name": b.metric_name,
        "period_year": b.period_year, "period_month": b.period_month,
        "p25": float(b.p25), "p50": float(b.p50),
        "p75": float(b.p75), "p90": float(b.p90),
        "sample_size": b.sample_size, "source": b.source,
    } for b in rows])


@router.get("/benchmarks/compare")
async def compare_with_industry(
    category: str = Query(...),
    metric: str = Query(...),
    year: int = Query(2025),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    bm_q = await db.execute(
        select(IndustryBenchmark).where(
            and_(
                IndustryBenchmark.business_category == category,
                IndustryBenchmark.metric_name == metric,
                IndustryBenchmark.period_year == year,
                IndustryBenchmark.period_month.is_(None),
            )
        ).limit(1)
    )
    benchmark = bm_q.scalar_one_or_none()
    if not benchmark:
        return APIResponse(errors=[{"detail": "Benchmark not found"}])

    return APIResponse(data={
        "category": benchmark.business_category,
        "metric": benchmark.metric_name,
        "year": benchmark.period_year,
        "p25": float(benchmark.p25),
        "p50": float(benchmark.p50),
        "p75": float(benchmark.p75),
        "p90": float(benchmark.p90),
        "sample_size": benchmark.sample_size,
        "source": benchmark.source,
    })
