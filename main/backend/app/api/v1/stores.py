from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from decimal import Decimal
from datetime import date, timedelta
from uuid import UUID
from app.database import get_db
from app.models.store import Store
from app.models.brand import Brand
from app.models.area import Area
from app.models.region import Region
from app.models.kpi import StoreDailyKPI
from app.models.store_pl import StorePL
from app.models.task import Task as TaskModel
from app.models.sv_visit import SVVisit
from app.models.employee import Employee
from app.schemas.common import APIResponse, PaginationMeta
from app.schemas.store import StoreRanking, StoreDetail, KPIHistory, TaskSummary, SVVisitSummary, StoreProfitGraph, PLComponent

router = APIRouter(prefix="/api/v1/stores", tags=["stores"])


@router.get("/ranking", response_model=APIResponse[list[StoreRanking]])
async def store_ranking(
    as_of: date | None = Query(None),
    sort_by: str = Query("health_score"),
    sort_dir: str = Query("asc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    brand_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    if as_of is None:
        as_of = date(2026, 4, 30)

    q = (
        select(Store, Brand.name.label("brand_name"), Area.name.label("area_name"), StoreDailyKPI)
        .join(Brand, Brand.id == Store.brand_id)
        .outerjoin(Area, Area.id == Store.area_id)
        .outerjoin(StoreDailyKPI, and_(StoreDailyKPI.store_id == Store.id, StoreDailyKPI.business_date == as_of))
        .where(Store.status == "active")
    )
    if brand_id:
        q = q.where(Store.brand_id == brand_id)

    sort_col_map = {
        "health_score": StoreDailyKPI.health_score,
        "net_sales": StoreDailyKPI.net_sales,
        "avg_ticket": StoreDailyKPI.avg_ticket,
        "cogs_rate": StoreDailyKPI.cogs_rate,
        "labor_cost_rate": StoreDailyKPI.labor_cost_rate,
        "fl_ratio": StoreDailyKPI.fl_ratio,
        "improvement_opportunity": StoreDailyKPI.improvement_opportunity_amount,
    }
    sort_col = sort_col_map.get(sort_by, StoreDailyKPI.health_score)
    if sort_dir == "desc":
        q = q.order_by(sort_col.desc().nullslast())
    else:
        q = q.order_by(sort_col.asc().nullslast())

    count_q = select(func.count(Store.id)).where(Store.status == "active")
    if brand_id:
        count_q = count_q.where(Store.brand_id == brand_id)
    total = (await db.execute(count_q)).scalar() or 0

    q = q.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)

    rankings = []
    for row in result.all():
        store = row[0]
        brand_name = row[1]
        area_name = row[2]
        kpi = row[3]
        issue_types = []
        if kpi and kpi.issue_types:
            for i in kpi.issue_types:
                if isinstance(i, str):
                    issue_types.append(i)
                elif isinstance(i, dict):
                    issue_types.append(i.get("issue_type", ""))

        rankings.append(StoreRanking(
            id=store.id,
            code=store.code,
            name=store.name,
            brand_name=brand_name,
            area_name=area_name,
            prefecture=store.prefecture,
            health_score=kpi.health_score if kpi else None,
            net_sales=kpi.net_sales if kpi else None,
            avg_ticket=kpi.avg_ticket if kpi else None,
            cogs_rate=kpi.cogs_rate if kpi else None,
            labor_cost_rate=kpi.labor_cost_rate if kpi else None,
            fl_ratio=kpi.fl_ratio if kpi else None,
            improvement_opportunity=kpi.improvement_opportunity_amount if kpi else None,
            issue_types=issue_types,
        ))

    meta = PaginationMeta(total=total, page=page, page_size=page_size, total_pages=(total + page_size - 1) // page_size)
    return APIResponse(data=rankings, meta=meta.model_dump())


@router.get("/{store_id}", response_model=APIResponse[StoreDetail])
async def store_detail(
    store_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
):
    q = await db.execute(
        select(Store, Brand.name, Area.name, Region.name)
        .join(Brand, Brand.id == Store.brand_id)
        .outerjoin(Area, Area.id == Store.area_id)
        .outerjoin(Region, Region.id == Area.region_id)
        .where(Store.id == store_id)
    )
    row = q.one_or_none()
    if not row:
        return APIResponse(errors=[{"detail": "Store not found"}])

    store, brand_name, area_name, region_name = row

    kpi_q = await db.execute(
        select(StoreDailyKPI)
        .where(StoreDailyKPI.store_id == store_id)
        .order_by(StoreDailyKPI.business_date.desc())
        .limit(90)
    )
    kpi_rows = kpi_q.scalars().all()
    latest_kpi = kpi_rows[0] if kpi_rows else None

    kpi_history = [KPIHistory(
        business_date=k.business_date,
        net_sales=k.net_sales,
        customer_count=k.customer_count,
        avg_ticket=k.avg_ticket,
        cogs_rate=k.cogs_rate,
        labor_cost_rate=k.labor_cost_rate,
        fl_ratio=k.fl_ratio,
        health_score=k.health_score,
    ) for k in reversed(kpi_rows)]

    task_q = await db.execute(
        select(TaskModel)
        .where(TaskModel.store_id == store_id)
        .order_by(TaskModel.created_at.desc())
        .limit(10)
    )
    tasks = [TaskSummary(id=t.id, title=t.title, status=t.status, priority=t.priority, due_date=t.due_date) for t in task_q.scalars().all()]

    visit_q = await db.execute(
        select(SVVisit, Employee.name)
        .outerjoin(Employee, Employee.id == SVVisit.sv_employee_id)
        .where(SVVisit.store_id == store_id)
        .order_by(SVVisit.visit_date.desc())
        .limit(10)
    )
    visits = [SVVisitSummary(visit_date=v[0].visit_date, visit_type=v[0].visit_type, checklist_score=v[0].checklist_score, sv_name=v[1]) for v in visit_q.all()]

    issue_types = []
    if latest_kpi and latest_kpi.issue_types:
        for i in latest_kpi.issue_types:
            if isinstance(i, str):
                issue_types.append(i)
            elif isinstance(i, dict):
                issue_types.append(i.get("issue_type", ""))

    detail = StoreDetail(
        id=store.id, code=store.code, name=store.name,
        brand_name=brand_name, area_name=area_name, region_name=region_name,
        prefecture=store.prefecture, city=store.city, address=store.address,
        trade_area_type=store.trade_area_type, seat_count=store.seat_count,
        status=store.status,
        health_score=latest_kpi.health_score if latest_kpi else None,
        improvement_opportunity=latest_kpi.improvement_opportunity_amount if latest_kpi else None,
        issue_types=issue_types,
        kpi_history=kpi_history,
        recent_tasks=tasks,
        recent_sv_visits=visits,
    )
    return APIResponse(data=detail)


@router.get("/{store_id}/profit-graph", response_model=APIResponse[StoreProfitGraph])
async def store_profit_graph(
    store_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
):
    store_q = await db.execute(select(Store.name).where(Store.id == store_id))
    store_name = store_q.scalar()
    if not store_name:
        return APIResponse(errors=[{"detail": "Store not found"}])

    pl_q = await db.execute(
        select(StorePL)
        .where(and_(StorePL.store_id == store_id, StorePL.period_type == "monthly"))
        .order_by(StorePL.period_start)
    )
    periods = [PLComponent(
        period_start=p.period_start, period_end=p.period_end,
        sales=p.sales, cogs=p.cogs, gross_profit=p.gross_profit,
        labor_cost=p.labor_cost, rent=p.rent, utilities=p.utilities,
        promotion_cost=p.promotion_cost, other_expenses=p.other_expenses,
        operating_profit=p.operating_profit,
    ) for p in pl_q.scalars().all()]

    return APIResponse(data=StoreProfitGraph(store_id=store_id, store_name=store_name, periods=periods))
