from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from uuid import UUID
from app.database import get_db
from app.models.expansion import LocationCandidate, RenovationProject
from app.models.brand import Brand
from app.models.store import Store
from app.schemas.common import APIResponse
from app.schemas.expansion import (
    LocationCandidateRead,
    LocationCandidateRanking,
    RenovationProjectRead,
    RenovationPackageStat,
    RenovationPackageStats,
)
from app.auth import get_tenant_id

router = APIRouter(prefix="/api/v1/expansion", tags=["expansion"])


def _build_rationale(c: LocationCandidate) -> str:
    parts = []
    if c.population_radius_1km > 0:
        parts.append(f"半径1km人口{c.population_radius_1km:,}人")
    if c.competitor_count >= 0:
        parts.append(f"競合{c.competitor_count}店")
    if c.cannibalization_risk_pct > 0:
        parts.append(f"カニバリ{c.cannibalization_risk_pct:.1f}%")
    parts.append(f"想定日商{c.expected_daily_sales:,.0f}円")
    parts.append(f"回収{c.expected_payback_months:.1f}ヶ月")
    return " / ".join(parts)


@router.get("/candidates", response_model=APIResponse[list[LocationCandidateRanking]])
async def list_candidates(
    sort: str = Query("score"),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(LocationCandidate, Brand.name).outerjoin(
        Brand, Brand.id == LocationCandidate.brand_id
    ).where(LocationCandidate.tenant_id == tenant_id)
    if status:
        q = q.where(LocationCandidate.status == status)

    sort_map = {
        "score": LocationCandidate.total_score.desc(),
        "sales": LocationCandidate.expected_daily_sales.desc(),
        "payback": LocationCandidate.expected_payback_months.asc(),
    }
    q = q.order_by(sort_map.get(sort, LocationCandidate.total_score.desc()))
    q = q.offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(q)).all()
    items = [
        LocationCandidateRanking(
            id=r[0].id, name=r[0].name, brand_name=r[1],
            prefecture=r[0].prefecture, city=r[0].city,
            total_score=r[0].total_score,
            expected_daily_sales=r[0].expected_daily_sales,
            expected_payback_months=r[0].expected_payback_months,
            cannibalization_risk_pct=r[0].cannibalization_risk_pct,
            status=r[0].status,
        ) for r in rows
    ]
    return APIResponse(data=items)


@router.get("/candidates/{candidate_id}", response_model=APIResponse[LocationCandidateRead])
async def get_candidate(
    candidate_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = await db.execute(
        select(LocationCandidate, Brand.name).outerjoin(
            Brand, Brand.id == LocationCandidate.brand_id
        ).where(and_(LocationCandidate.id == candidate_id, LocationCandidate.tenant_id == tenant_id))
    )
    row = q.one_or_none()
    if not row:
        return APIResponse(errors=[{"detail": "Candidate not found"}])
    c, brand_name = row
    return APIResponse(data=LocationCandidateRead(
        id=c.id, name=c.name, brand_id=c.brand_id, brand_name=brand_name,
        lat=c.lat, lng=c.lng, prefecture=c.prefecture, city=c.city, address=c.address,
        population_radius_1km=c.population_radius_1km,
        competitor_count=c.competitor_count,
        cannibalization_risk_pct=c.cannibalization_risk_pct,
        delivery_distance_km=c.delivery_distance_km,
        staff_difficulty_score=c.staff_difficulty_score,
        expected_daily_sales=c.expected_daily_sales,
        expected_payback_months=c.expected_payback_months,
        total_score=c.total_score, status=c.status,
        rationale=_build_rationale(c),
        created_at=c.created_at,
    ))


@router.post("/candidates/{candidate_id}/approve", response_model=APIResponse[LocationCandidateRead])
async def approve_candidate(
    candidate_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = await db.execute(select(LocationCandidate).where(and_(
        LocationCandidate.id == candidate_id,
        LocationCandidate.tenant_id == tenant_id,
    )))
    c = q.scalar_one_or_none()
    if not c:
        return APIResponse(errors=[{"detail": "Candidate not found"}])
    c.status = "approved"
    await db.commit()
    await db.refresh(c)
    return APIResponse(data=LocationCandidateRead(
        id=c.id, name=c.name, brand_id=c.brand_id,
        lat=c.lat, lng=c.lng, prefecture=c.prefecture, city=c.city, address=c.address,
        population_radius_1km=c.population_radius_1km,
        competitor_count=c.competitor_count,
        cannibalization_risk_pct=c.cannibalization_risk_pct,
        delivery_distance_km=c.delivery_distance_km,
        staff_difficulty_score=c.staff_difficulty_score,
        expected_daily_sales=c.expected_daily_sales,
        expected_payback_months=c.expected_payback_months,
        total_score=c.total_score, status=c.status,
        rationale=_build_rationale(c),
        created_at=c.created_at,
    ))


@router.get("/renovation-projects", response_model=APIResponse[list[RenovationProjectRead]])
async def list_renovation_projects(
    status: str | None = Query(None),
    package_type: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(RenovationProject, Store.name).join(
        Store, Store.id == RenovationProject.store_id
    ).where(RenovationProject.tenant_id == tenant_id)
    if status:
        q = q.where(RenovationProject.status == status)
    if package_type:
        q = q.where(RenovationProject.package_type == package_type)
    q = q.order_by(RenovationProject.start_date.desc())
    q = q.offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(q)).all()
    items = [
        RenovationProjectRead(
            id=r[0].id, store_id=r[0].store_id, store_name=r[1],
            package_type=r[0].package_type, capex_myen=r[0].capex_myen,
            start_date=r[0].start_date, end_date=r[0].end_date, status=r[0].status,
            expected_ticket_lift_pct=r[0].expected_ticket_lift_pct,
            expected_customer_lift_pct=r[0].expected_customer_lift_pct,
            actual_ticket_lift_pct=r[0].actual_ticket_lift_pct,
            actual_customer_lift_pct=r[0].actual_customer_lift_pct,
            payback_months=r[0].payback_months,
            created_at=r[0].created_at,
        ) for r in rows
    ]
    return APIResponse(data=items)


@router.get("/renovation-projects/{project_id}", response_model=APIResponse[RenovationProjectRead])
async def get_renovation_project(
    project_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = await db.execute(
        select(RenovationProject, Store.name).join(
            Store, Store.id == RenovationProject.store_id
        ).where(and_(RenovationProject.id == project_id, RenovationProject.tenant_id == tenant_id))
    )
    row = q.one_or_none()
    if not row:
        return APIResponse(errors=[{"detail": "Project not found"}])
    p, store_name = row
    return APIResponse(data=RenovationProjectRead(
        id=p.id, store_id=p.store_id, store_name=store_name,
        package_type=p.package_type, capex_myen=p.capex_myen,
        start_date=p.start_date, end_date=p.end_date, status=p.status,
        expected_ticket_lift_pct=p.expected_ticket_lift_pct,
        expected_customer_lift_pct=p.expected_customer_lift_pct,
        actual_ticket_lift_pct=p.actual_ticket_lift_pct,
        actual_customer_lift_pct=p.actual_customer_lift_pct,
        payback_months=p.payback_months,
        created_at=p.created_at,
    ))


@router.get("/renovation-packages/stats", response_model=APIResponse[RenovationPackageStats])
async def renovation_package_stats(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = await db.execute(
        select(
            RenovationProject.package_type,
            func.count(RenovationProject.id),
            func.avg(RenovationProject.capex_myen),
            func.avg(RenovationProject.expected_ticket_lift_pct),
            func.avg(RenovationProject.expected_customer_lift_pct),
            func.avg(RenovationProject.actual_ticket_lift_pct),
            func.avg(RenovationProject.actual_customer_lift_pct),
            func.avg(RenovationProject.payback_months),
        )
        .where(RenovationProject.tenant_id == tenant_id)
        .group_by(RenovationProject.package_type)
        .order_by(func.count(RenovationProject.id).desc())
    )
    rows = q.all()
    packages = [
        RenovationPackageStat(
            package_type=r[0],
            project_count=int(r[1] or 0),
            avg_capex_myen=float(r[2] or 0),
            avg_expected_ticket_lift_pct=float(r[3] or 0),
            avg_expected_customer_lift_pct=float(r[4] or 0),
            avg_actual_ticket_lift_pct=float(r[5]) if r[5] is not None else None,
            avg_actual_customer_lift_pct=float(r[6]) if r[6] is not None else None,
            avg_payback_months=float(r[7] or 0),
        ) for r in rows
    ]
    return APIResponse(data=RenovationPackageStats(packages=packages))
