from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, delete
from datetime import date, timedelta
from decimal import Decimal
from app.models.value_case import ValueCase, ValueCaseMetric
from app.models.task import Task
from app.models.kpi import StoreDailyKPI
from app.models.store import Store
import uuid


async def measure_value_case(db: AsyncSession, value_case_id: str, tenant_id: str) -> dict:
    q = await db.execute(
        select(ValueCase).where(and_(ValueCase.id == value_case_id, ValueCase.tenant_id == tenant_id))
    )
    vc = q.scalar_one_or_none()
    if not vc:
        return {"error": "not_found"}

    target_store_ids = vc.target_store_ids or []
    if not target_store_ids:
        return {"error": "no_target_stores", "value_case_id": str(vc.id)}

    # Query baseline period KPIs (aggregated averages)
    baseline = await db.execute(
        select(
            func.avg(StoreDailyKPI.labor_cost_rate),
            func.avg(StoreDailyKPI.cogs_rate),
            func.avg(StoreDailyKPI.net_sales),
            func.avg(StoreDailyKPI.operating_profit_rate),
            func.avg(StoreDailyKPI.health_score),
            func.avg(StoreDailyKPI.sales_per_labor_hour),
            func.avg(StoreDailyKPI.gross_profit_rate),
            func.avg(StoreDailyKPI.customer_count),
            func.avg(StoreDailyKPI.avg_ticket),
            func.count(StoreDailyKPI.id),
        ).where(and_(
            StoreDailyKPI.store_id.in_(target_store_ids),
            StoreDailyKPI.business_date >= vc.baseline_start,
            StoreDailyKPI.business_date <= vc.baseline_end,
            StoreDailyKPI.tenant_id == tenant_id,
        ))
    )
    b = baseline.one()

    measurement_end = vc.measurement_end or date.today()
    measurement = await db.execute(
        select(
            func.avg(StoreDailyKPI.labor_cost_rate),
            func.avg(StoreDailyKPI.cogs_rate),
            func.avg(StoreDailyKPI.net_sales),
            func.avg(StoreDailyKPI.operating_profit_rate),
            func.avg(StoreDailyKPI.health_score),
            func.avg(StoreDailyKPI.sales_per_labor_hour),
            func.avg(StoreDailyKPI.gross_profit_rate),
            func.avg(StoreDailyKPI.customer_count),
            func.avg(StoreDailyKPI.avg_ticket),
            func.count(StoreDailyKPI.id),
        ).where(and_(
            StoreDailyKPI.store_id.in_(target_store_ids),
            StoreDailyKPI.business_date >= vc.measurement_start,
            StoreDailyKPI.business_date <= measurement_end,
            StoreDailyKPI.tenant_id == tenant_id,
        ))
    )
    m = measurement.one()

    baseline_count = b[9]
    measurement_count = m[9]

    if not baseline_count or not measurement_count:
        return {
            "error": "insufficient_data",
            "value_case_id": str(vc.id),
            "baseline_records": baseline_count or 0,
            "measurement_records": measurement_count or 0,
        }

    # Index mapping: 0=labor_cost_rate, 1=cogs_rate, 2=net_sales,
    # 3=operating_profit_rate, 4=health_score, 5=sales_per_labor_hour,
    # 6=gross_profit_rate, 7=customer_count, 8=avg_ticket

    # Build metrics based on issue_type
    if vc.issue_type == "labor_overrun":
        metric_defs = [
            ("人件費率", 0, True),        # lower is better
            ("人時売上高", 5, False),      # higher is better
            ("営業利益率", 3, False),      # higher is better
        ]
    elif vc.issue_type == "cogs_overrun":
        metric_defs = [
            ("原価率", 1, True),           # lower is better
            ("粗利率", 6, False),          # higher is better
            ("営業利益率", 3, False),      # higher is better
        ]
    else:  # sales_decline or general
        metric_defs = [
            ("月次売上", 2, False),        # higher is better
            ("来客数", 7, False),          # higher is better
            ("営業利益率", 3, False),      # higher is better
        ]

    # Delete existing metrics
    await db.execute(
        delete(ValueCaseMetric).where(ValueCaseMetric.value_case_id == vc.id)
    )

    # Calculate realized impact based on net_sales improvement
    num_stores = len(target_store_ids)
    measurement_days = (measurement_end - vc.measurement_start).days + 1
    baseline_days = (vc.baseline_end - vc.baseline_start).days + 1

    # Impact = improvement in daily net_sales * num_stores * measurement_days
    baseline_daily_sales = float(b[2] or 0)
    measurement_daily_sales = float(m[2] or 0)

    # For labor/cogs issues, impact = cost reduction per day * stores * days
    if vc.issue_type == "labor_overrun":
        baseline_rate = float(b[0] or 0)
        measured_rate = float(m[0] or 0)
        rate_improvement = max(0, baseline_rate - measured_rate) / 100
        daily_impact = measurement_daily_sales * rate_improvement
    elif vc.issue_type == "cogs_overrun":
        baseline_rate = float(b[1] or 0)
        measured_rate = float(m[1] or 0)
        rate_improvement = max(0, baseline_rate - measured_rate) / 100
        daily_impact = measurement_daily_sales * rate_improvement
    else:
        daily_impact = max(0, measurement_daily_sales - baseline_daily_sales)

    realized = int(daily_impact * num_stores * measurement_days)

    metrics_created = []
    for name, idx, lower_is_better in metric_defs:
        bv = float(b[idx]) if b[idx] is not None else None
        mv = float(m[idx]) if m[idx] is not None else None
        if bv is None or mv is None:
            continue

        # Peer-adjusted: slight regression toward baseline (conservative estimate)
        peer_adj = mv * 0.97 + bv * 0.03

        # Estimated impact for this metric (proportional split)
        if lower_is_better:
            improvement_pct = max(0, bv - mv) / bv if bv else 0
        else:
            improvement_pct = max(0, mv - bv) / bv if bv else 0

        total_improvement = sum(
            max(0, (float(b[d[1]]) - float(m[d[1]])) / float(b[d[1]])) if d[2] else
            max(0, (float(m[d[1]]) - float(b[d[1]])) / float(b[d[1]])) if b[d[1]] else 0
            for d in metric_defs if b[d[1]] is not None and m[d[1]] is not None
        )
        share = improvement_pct / total_improvement if total_improvement else 1.0 / len(metric_defs)
        est_impact = int(realized * share)

        metric = ValueCaseMetric(
            id=uuid.uuid4(),
            value_case_id=vc.id,
            metric_name=name,
            baseline_value=Decimal(str(round(bv, 2))),
            measured_value=Decimal(str(round(mv, 2))),
            peer_adjusted_value=Decimal(str(round(peer_adj, 2))),
            estimated_impact_amount=est_impact,
        )
        db.add(metric)
        metrics_created.append(name)

    vc.realized_impact_amount = realized

    return {
        "value_case_id": str(vc.id),
        "status": vc.status,
        "metrics_updated": len(metrics_created),
        "realized_impact_amount": realized,
        "baseline_records": baseline_count,
        "measurement_records": measurement_count,
    }


async def create_value_case_from_task(db: AsyncSession, task_id: str, tenant_id: str) -> dict | None:
    task = (await db.execute(
        select(Task).where(and_(Task.id == task_id, Task.tenant_id == tenant_id))
    )).scalar_one_or_none()

    if not task or task.status != "done":
        return None

    if not task.expected_impact_amount or task.expected_impact_amount <= 0:
        return None

    # Get company_id from the store
    store = (await db.execute(
        select(Store).where(Store.id == task.store_id)
    )).scalar_one_or_none()
    if not store:
        return None

    # Find company via brand -> company, or fall back
    company_id_q = await db.execute(
        select(Store.tenant_id).where(Store.id == task.store_id)
    )
    # Use a simple approach: look up any existing value case's company_id for this tenant
    existing_vc = (await db.execute(
        select(ValueCase.company_id).where(ValueCase.tenant_id == tenant_id).limit(1)
    )).scalar_one_or_none()

    from app.models.company import Company
    if existing_vc:
        company_id = existing_vc
    else:
        co = (await db.execute(
            select(Company.id).where(Company.tenant_id == tenant_id).limit(1)
        )).scalar_one_or_none()
        if not co:
            return None
        company_id = co

    today = date.today()
    baseline_start = today - timedelta(days=90)
    baseline_end = today - timedelta(days=31)
    measurement_start = today - timedelta(days=30)

    vc = ValueCase(
        id=uuid.uuid4(),
        tenant_id=uuid.UUID(tenant_id),
        company_id=company_id,
        name=f"改善効果: {task.title}",
        issue_type=task.issue_type or "general",
        target_store_ids=[task.store_id],
        baseline_start=baseline_start,
        baseline_end=baseline_end,
        measurement_start=measurement_start,
        status="active",
        expected_impact_amount=task.expected_impact_amount,
    )
    db.add(vc)
    await db.flush()

    task.related_value_case_id = vc.id

    result = await measure_value_case(db, str(vc.id), tenant_id)

    return {
        "value_case_id": str(vc.id),
        "task_id": str(task.id),
        **result,
    }


async def measure_all_active(db: AsyncSession, tenant_id: str) -> list[dict]:
    q = await db.execute(
        select(ValueCase).where(and_(
            ValueCase.tenant_id == tenant_id,
            ValueCase.status.in_(["active", "completed"]),
        ))
    )
    results = []
    for vc in q.scalars().all():
        r = await measure_value_case(db, str(vc.id), tenant_id)
        results.append(r)
    return results
