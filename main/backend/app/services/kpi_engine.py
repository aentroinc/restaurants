import calendar
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy import select, and_, func, delete
from sqlalchemy.orm import Session
from app.models.daily_sales import DailyStoreSales
from app.models.labor import LaborActual
from app.models.store import Store
from app.models.store_pl import StorePL
from app.models.brand import Brand
from app.models.kpi import StoreDailyKPI
from app.models.review import Review
from app.models.task import Task
from app.services.kpi_calculator import calculate_all_kpis
from app.services.health_scorer import (
    calculate_health_score, sales_trend_score, profit_margin_score,
    labor_efficiency_score, cogs_control_score, review_score_to_health,
    task_completion_score,
)
from app.services.improvement_estimator import identify_issues, calculate_improvement_opportunity
from app.services.peer_comparator import group_key

# Default COGS targets by service_model (fallback when brand settings are absent)
DEFAULT_COGS_TARGET = {
    "beef_bowl": 32,
    "sushi": 38,
    "burger": 30,
}
DEFAULT_LABOR_TARGET = {
    "beef_bowl": 28,
    "sushi": 26,
    "burger": 30,
}


def _month_end(year: int, month: int) -> date:
    return date(year, month, calendar.monthrange(year, month)[1])


def _month_iter(start: date, end: date):
    d = start.replace(day=1)
    while d <= end:
        yield d.year, d.month
        if d.month == 12:
            d = date(d.year + 1, 1, 1)
        else:
            d = date(d.year, d.month + 1, 1)


def recalculate_kpis(
    session: Session,
    tenant_id: str,
    store_ids: list[str] | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:
    """Recalculate StoreDailyKPI records from raw data (monthly granularity)."""

    # resolve stores
    store_q = select(Store).where(Store.tenant_id == tenant_id, Store.status == "active")
    if store_ids:
        store_q = store_q.where(Store.id.in_(store_ids))
    stores = session.execute(store_q).scalars().all()

    if not stores:
        return {"recalculated_stores": 0, "recalculated_records": 0}

    # determine date range from available data if not specified
    if not start_date or not end_date:
        range_q = session.execute(
            select(func.min(DailyStoreSales.business_date), func.max(DailyStoreSales.business_date))
            .where(DailyStoreSales.tenant_id == tenant_id)
        ).one()
        if not range_q[0]:
            return {"recalculated_stores": 0, "recalculated_records": 0}
        start_date = start_date or range_q[0]
        end_date = end_date or range_q[1]

    # preload brands for cogs/labor targets
    brand_rows = session.execute(select(Brand).where(Brand.tenant_id == tenant_id)).scalars().all()
    brands_by_id = {str(b.id): b for b in brand_rows}

    records_upserted = 0
    stores_touched = set()

    for store in stores:
        brand = brands_by_id.get(str(store.brand_id))
        service_model = brand.service_model if brand else "beef_bowl"
        cogs_target = DEFAULT_COGS_TARGET.get(service_model, 33)
        labor_target = DEFAULT_LABOR_TARGET.get(service_model, 28)

        for year, month in _month_iter(start_date, end_date):
            month_start = date(year, month, 1)
            month_end_d = _month_end(year, month)

            # aggregate daily sales for this month
            sales_agg = session.execute(
                select(
                    func.sum(DailyStoreSales.net_sales),
                    func.sum(DailyStoreSales.customer_count),
                    func.sum(DailyStoreSales.discount_amount),
                    func.sum(DailyStoreSales.gross_sales),
                )
                .where(and_(
                    DailyStoreSales.store_id == store.id,
                    DailyStoreSales.business_date >= month_start,
                    DailyStoreSales.business_date <= month_end_d,
                ))
            ).one()

            net_sales = sales_agg[0]
            if not net_sales or net_sales == 0:
                continue

            customer_count = sales_agg[1] or 0
            discount_amount = sales_agg[2] or 0
            gross_sales = sales_agg[3] or net_sales

            # aggregate labor for this month
            labor_agg = session.execute(
                select(
                    func.sum(LaborActual.labor_hours),
                    func.sum(LaborActual.labor_cost),
                )
                .where(and_(
                    LaborActual.store_id == store.id,
                    LaborActual.business_date >= month_start,
                    LaborActual.business_date <= month_end_d,
                ))
            ).one()

            labor_hours = labor_agg[0] or Decimal(0)
            labor_cost = labor_agg[1] or Decimal(0)

            # get store PL for this month if available (for COGS and operating profit)
            pl = session.execute(
                select(StorePL)
                .where(and_(
                    StorePL.store_id == store.id,
                    StorePL.period_start == month_start,
                ))
            ).scalar_one_or_none()

            # determine COGS
            if pl:
                cogs = pl.cogs
                operating_profit = pl.operating_profit
            else:
                cogs = int(net_sales * cogs_target / 100)
                operating_profit = None

            # calculate KPIs via the existing calculator
            kpis = calculate_all_kpis(
                net_sales=Decimal(str(net_sales)),
                customer_count=int(customer_count),
                cogs=Decimal(str(cogs)),
                labor_cost=Decimal(str(labor_cost)),
                labor_hours=Decimal(str(labor_hours)),
                operating_profit=Decimal(str(operating_profit)) if operating_profit is not None else None,
            )

            # review avg for this store
            review_avg_q = session.execute(
                select(func.avg(Review.rating))
                .where(Review.store_id == store.id)
            ).scalar() or 3.5
            review_avg = float(review_avg_q)

            # YoY growth
            prev_year_sales_q = session.execute(
                select(func.sum(DailyStoreSales.net_sales))
                .where(and_(
                    DailyStoreSales.store_id == store.id,
                    DailyStoreSales.business_date >= month_start.replace(year=year - 1),
                    DailyStoreSales.business_date <= month_end_d.replace(year=year - 1),
                ))
            ).scalar() or 0
            yoy_growth = 0.0
            if prev_year_sales_q and prev_year_sales_q > 0:
                yoy_growth = float((net_sales - prev_year_sales_q) / prev_year_sales_q * 100)

            # task completion for this store
            task_counts = session.execute(
                select(
                    func.count(Task.id),
                    func.count(Task.id).filter(Task.status == "done"),
                )
                .where(Task.store_id == store.id)
            ).one()
            total_tasks = task_counts[0] or 0
            done_tasks = task_counts[1] or 0

            # operating profit rate
            op_rate = float(kpis["operating_profit_rate"]) if kpis["operating_profit_rate"] is not None else 0.0
            cogs_rate_val = float(kpis["cogs_rate"]) if kpis["cogs_rate"] else 0.0
            labor_rate_val = float(kpis["labor_cost_rate"]) if kpis["labor_cost_rate"] else 0.0

            # health score
            health = calculate_health_score(
                sales_trend=sales_trend_score(yoy_growth),
                profit_margin=profit_margin_score(op_rate),
                labor_efficiency=labor_efficiency_score(labor_rate_val, labor_target),
                cogs_control=cogs_control_score(cogs_rate_val, cogs_target),
                review_score=review_score_to_health(review_avg),
                task_completion=task_completion_score(done_tasks, total_tasks),
            )

            # improvement issues
            discount_rate = float(discount_amount / gross_sales * 100) if gross_sales else 0
            monthly_sales_float = float(net_sales)
            store_metrics = {
                "labor_cost_rate": labor_rate_val,
                "cogs_rate": cogs_rate_val,
                "yoy_growth": yoy_growth,
                "review_score_delta": review_avg - 3.5,
                "discount_rate": discount_rate,
                "monthly_sales": monthly_sales_float,
            }
            peer_medians = {"labor_cost_rate": labor_target, "cogs_rate": cogs_target}
            peer_key = group_key(str(store.brand_id), store.trade_area_type)
            issues = identify_issues(store_metrics, peer_medians)
            improvement_opp = calculate_improvement_opportunity(issues)

            # upsert KPI record (keyed on store_id + business_date)
            existing = session.execute(
                select(StoreDailyKPI)
                .where(and_(
                    StoreDailyKPI.store_id == store.id,
                    StoreDailyKPI.business_date == month_end_d,
                ))
            ).scalar_one_or_none()

            vals = dict(
                tenant_id=tenant_id,
                store_id=store.id,
                business_date=month_end_d,
                net_sales=net_sales,
                customer_count=int(customer_count),
                avg_ticket=kpis["avg_ticket"],
                cogs=cogs,
                cogs_rate=kpis["cogs_rate"],
                labor_cost=int(labor_cost),
                labor_cost_rate=kpis["labor_cost_rate"],
                fl_ratio=kpis["fl_ratio"],
                sales_per_labor_hour=kpis["sales_per_labor_hour"],
                gross_profit=kpis["gross_profit"],
                gross_profit_rate=kpis["gross_profit_rate"],
                operating_profit=kpis["operating_profit"],
                operating_profit_rate=kpis["operating_profit_rate"],
                review_score=Decimal(str(round(review_avg, 2))),
                health_score=health,
                improvement_opportunity_amount=improvement_opp,
                issue_types=issues if issues else None,
                peer_group=peer_key,
            )

            if existing:
                for k, v in vals.items():
                    setattr(existing, k, v)
            else:
                session.add(StoreDailyKPI(**vals))

            records_upserted += 1
            stores_touched.add(str(store.id))

    session.commit()
    return {
        "recalculated_stores": len(stores_touched),
        "recalculated_records": records_upserted,
    }
