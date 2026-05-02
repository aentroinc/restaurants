import json
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import select, func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.kpi import StoreDailyKPI
from app.models.store import Store
from app.models.brand import Brand
from app.models.daily_sales import DailyStoreSales
from app.models.task import Task


def _serializable(obj):
    if isinstance(obj, (Decimal,)):
        return float(obj)
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    if hasattr(obj, '__str__'):
        return str(obj)
    return obj


TOOL_DEFINITIONS = [
    {
        "name": "query_kpi",
        "description": "Query KPI values for stores/brands/regions over time periods. Returns aggregated or per-store KPI data.",
        "input_schema": {
            "type": "object",
            "properties": {
                "kpi_name": {
                    "type": "string",
                    "description": "KPI metric name: net_sales, customer_count, avg_ticket, cogs, cogs_rate, labor_cost, labor_cost_rate, fl_ratio, sales_per_labor_hour, gross_profit, gross_profit_rate, operating_profit, operating_profit_rate, review_score, health_score, improvement_opportunity_amount",
                },
                "scope": {
                    "type": "object",
                    "description": "Filter scope",
                    "properties": {
                        "store_ids": {"type": "array", "items": {"type": "string"}, "description": "Specific store UUIDs"},
                        "brand_id": {"type": "string", "description": "Filter by brand UUID"},
                        "region": {"type": "string", "description": "Filter by prefecture name"},
                    },
                },
                "period": {
                    "type": "object",
                    "description": "Time period filter",
                    "properties": {
                        "from": {"type": "string", "description": "Start date (YYYY-MM-DD)"},
                        "to": {"type": "string", "description": "End date (YYYY-MM-DD)"},
                        "granularity": {"type": "string", "enum": ["daily", "weekly", "monthly"], "description": "Aggregation granularity"},
                    },
                },
                "aggregation": {
                    "type": "string",
                    "enum": ["sum", "avg", "per_store"],
                    "description": "How to aggregate results. Default: per_store",
                },
            },
            "required": ["kpi_name"],
        },
    },
    {
        "name": "get_store_detail",
        "description": "Get full store profile with current KPIs, brand, location info.",
        "input_schema": {
            "type": "object",
            "properties": {
                "store_id": {"type": "string", "description": "Store UUID"},
            },
            "required": ["store_id"],
        },
    },
    {
        "name": "get_store_ranking",
        "description": "Get top or bottom stores ranked by a metric. Use order='desc' for top performers, 'asc' for worst performers.",
        "input_schema": {
            "type": "object",
            "properties": {
                "metric": {
                    "type": "string",
                    "description": "Metric to rank by: health_score, net_sales, labor_cost_rate, cogs_rate, fl_ratio, operating_profit_rate, review_score, improvement_opportunity_amount, sales_per_labor_hour, gross_profit_rate",
                },
                "order": {"type": "string", "enum": ["asc", "desc"], "description": "Sort order. desc=best/highest, asc=worst/lowest"},
                "limit": {"type": "integer", "description": "Number of stores to return (default: 10)"},
                "brand_id": {"type": "string", "description": "Optional brand filter"},
                "region": {"type": "string", "description": "Optional prefecture filter"},
                "trade_area_type": {"type": "string", "description": "Optional trade area filter (e.g. 駅前, ロードサイド)"},
            },
            "required": ["metric"],
        },
    },
    {
        "name": "search_stores",
        "description": "Search stores by various filters. Returns matching stores with basic info.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name_contains": {"type": "string", "description": "Search by store name (partial match)"},
                "brand_id": {"type": "string", "description": "Filter by brand UUID"},
                "prefecture": {"type": "string", "description": "Filter by prefecture"},
                "trade_area_type": {"type": "string", "description": "Filter by trade area type"},
                "status": {"type": "string", "description": "Filter by status (active/closed)"},
                "limit": {"type": "integer", "description": "Max results (default: 20)"},
            },
        },
    },
    {
        "name": "get_brand_summary",
        "description": "Get brand-level aggregated KPIs. Shows averages and totals across all stores in a brand.",
        "input_schema": {
            "type": "object",
            "properties": {
                "brand_id": {"type": "string", "description": "Optional specific brand UUID. If omitted, returns all brands."},
                "as_of_date": {"type": "string", "description": "Date for KPI snapshot (YYYY-MM-DD). Defaults to latest available."},
            },
        },
    },
    {
        "name": "create_task_draft",
        "description": "Create a draft improvement task for a store. The task will be created with 'open' status for user review.",
        "input_schema": {
            "type": "object",
            "properties": {
                "store_id": {"type": "string", "description": "Target store UUID"},
                "title": {"type": "string", "description": "Task title"},
                "description": {"type": "string", "description": "Detailed description of the improvement action"},
                "issue_type": {"type": "string", "description": "Issue category: labor_overrun, cogs_overrun, sales_decline, review_decline, fl_overrun"},
                "priority": {"type": "string", "enum": ["high", "medium", "low"]},
                "expected_impact_amount": {"type": "number", "description": "Expected monthly improvement in JPY"},
            },
            "required": ["store_id", "title"],
        },
    },
]


async def execute_query_kpi(input_data: dict, tenant_id: str, db: AsyncSession) -> dict:
    try:
        kpi_name = input_data["kpi_name"]
        scope = input_data.get("scope", {})
        period = input_data.get("period", {})
        aggregation = input_data.get("aggregation", "per_store")

        kpi_col = getattr(StoreDailyKPI, kpi_name, None)
        if kpi_col is None:
            return {"error": f"Unknown KPI: {kpi_name}"}

        query = (
            select(
                StoreDailyKPI.store_id,
                Store.name.label("store_name"),
                Brand.name.label("brand_name"),
                StoreDailyKPI.business_date,
                kpi_col,
            )
            .join(Store, Store.id == StoreDailyKPI.store_id)
            .join(Brand, Brand.id == Store.brand_id)
            .where(StoreDailyKPI.tenant_id == tenant_id)
        )

        if scope.get("store_ids"):
            query = query.where(StoreDailyKPI.store_id.in_(scope["store_ids"]))
        if scope.get("brand_id"):
            query = query.where(Store.brand_id == scope["brand_id"])
        if scope.get("region"):
            query = query.where(Store.prefecture == scope["region"])

        if period.get("from"):
            query = query.where(StoreDailyKPI.business_date >= period["from"])
        if period.get("to"):
            query = query.where(StoreDailyKPI.business_date <= period["to"])

        query = query.order_by(StoreDailyKPI.business_date.desc()).limit(200)

        result = await db.execute(query)
        rows = result.all()

        if aggregation == "sum":
            total = sum(float(r[4]) for r in rows if r[4] is not None)
            return {"kpi": kpi_name, "aggregation": "sum", "value": total, "record_count": len(rows)}
        elif aggregation == "avg":
            vals = [float(r[4]) for r in rows if r[4] is not None]
            avg = sum(vals) / len(vals) if vals else 0
            return {"kpi": kpi_name, "aggregation": "avg", "value": round(avg, 2), "record_count": len(vals)}
        else:
            data = []
            for r in rows:
                data.append({
                    "store_id": str(r[0]),
                    "store_name": r[1],
                    "brand_name": r[2],
                    "date": r[3].isoformat() if r[3] else None,
                    "value": float(r[4]) if r[4] is not None else None,
                })
            if len(data) > 20:
                data = data[:20]
            return {"kpi": kpi_name, "results": data, "total_records": len(rows)}
    except Exception as e:
        return {"error": "データ取得に失敗しました", "detail": str(e)}


async def execute_get_store_detail(input_data: dict, tenant_id: str, db: AsyncSession) -> dict:
    try:
        store_id = input_data["store_id"]

        store_q = await db.execute(
            select(Store, Brand.name.label("brand_name"))
            .join(Brand, Brand.id == Store.brand_id)
            .where(Store.id == store_id, Store.tenant_id == tenant_id)
        )
        row = store_q.one_or_none()
        if not row:
            return {"error": "Store not found"}

        store, brand_name = row[0], row[1]

        # latest KPI
        kpi_q = await db.execute(
            select(StoreDailyKPI)
            .where(StoreDailyKPI.store_id == store_id)
            .order_by(StoreDailyKPI.business_date.desc())
            .limit(1)
        )
        kpi = kpi_q.scalar_one_or_none()

        result = {
            "store_id": str(store.id),
            "name": store.name,
            "brand": brand_name,
            "prefecture": store.prefecture,
            "city": store.city,
            "address": store.address,
            "trade_area_type": store.trade_area_type,
            "seat_count": store.seat_count,
            "status": store.status,
        }

        if kpi:
            result["latest_kpi"] = {
                "date": kpi.business_date.isoformat(),
                "net_sales": float(kpi.net_sales) if kpi.net_sales else None,
                "customer_count": kpi.customer_count,
                "avg_ticket": float(kpi.avg_ticket) if kpi.avg_ticket else None,
                "cogs_rate": float(kpi.cogs_rate) if kpi.cogs_rate else None,
                "labor_cost_rate": float(kpi.labor_cost_rate) if kpi.labor_cost_rate else None,
                "fl_ratio": float(kpi.fl_ratio) if kpi.fl_ratio else None,
                "sales_per_labor_hour": float(kpi.sales_per_labor_hour) if kpi.sales_per_labor_hour else None,
                "operating_profit_rate": float(kpi.operating_profit_rate) if kpi.operating_profit_rate else None,
                "review_score": float(kpi.review_score) if kpi.review_score else None,
                "health_score": float(kpi.health_score) if kpi.health_score else None,
                "improvement_opportunity_amount": float(kpi.improvement_opportunity_amount) if kpi.improvement_opportunity_amount else None,
                "issue_types": kpi.issue_types,
            }

        # recent tasks
        tasks_q = await db.execute(
            select(Task.title, Task.status, Task.issue_type, Task.priority)
            .where(Task.store_id == store_id)
            .order_by(Task.created_at.desc())
            .limit(5)
        )
        result["recent_tasks"] = [
            {"title": t[0], "status": t[1], "issue_type": t[2], "priority": t[3]}
            for t in tasks_q.all()
        ]

        return result
    except Exception as e:
        return {"error": "データ取得に失敗しました", "detail": str(e)}


async def execute_get_store_ranking(input_data: dict, tenant_id: str, db: AsyncSession) -> dict:
    try:
        metric = input_data["metric"]
        order = input_data.get("order", "desc")
        limit = min(input_data.get("limit", 10), 20)

        metric_col = getattr(StoreDailyKPI, metric, None)
        if metric_col is None:
            return {"error": f"Unknown metric: {metric}"}

        # find latest date
        latest_q = await db.execute(
            select(func.max(StoreDailyKPI.business_date))
            .where(StoreDailyKPI.tenant_id == tenant_id)
        )
        latest_date = latest_q.scalar()
        if not latest_date:
            return {"error": "No KPI data available"}

        query = (
            select(
                StoreDailyKPI.store_id,
                Store.name.label("store_name"),
                Brand.name.label("brand_name"),
                Store.prefecture,
                Store.trade_area_type,
                metric_col,
            )
            .join(Store, Store.id == StoreDailyKPI.store_id)
            .join(Brand, Brand.id == Store.brand_id)
            .where(
                StoreDailyKPI.tenant_id == tenant_id,
                StoreDailyKPI.business_date == latest_date,
                metric_col.isnot(None),
            )
        )

        if input_data.get("brand_id"):
            query = query.where(Store.brand_id == input_data["brand_id"])
        if input_data.get("region"):
            query = query.where(Store.prefecture == input_data["region"])
        if input_data.get("trade_area_type"):
            query = query.where(Store.trade_area_type == input_data["trade_area_type"])

        if order == "asc":
            query = query.order_by(metric_col.asc())
        else:
            query = query.order_by(metric_col.desc())

        query = query.limit(limit)
        result = await db.execute(query)
        rows = result.all()

        stores = [
            {
                "rank": i + 1,
                "store_id": str(r[0]),
                "store_name": r[1],
                "brand_name": r[2],
                "prefecture": r[3],
                "trade_area_type": r[4],
                "value": float(r[5]) if r[5] is not None else None,
            }
            for i, r in enumerate(rows)
        ]
        return {
            "metric": metric,
            "order": order,
            "as_of_date": latest_date.isoformat(),
            "stores": stores[:20],
        }
    except Exception as e:
        return {"error": "データ取得に失敗しました", "detail": str(e)}


async def execute_search_stores(input_data: dict, tenant_id: str, db: AsyncSession) -> dict:
    try:
        limit = min(input_data.get("limit", 20), 20)

        query = (
            select(Store.id, Store.name, Brand.name.label("brand_name"), Store.prefecture, Store.city, Store.trade_area_type, Store.status)
            .join(Brand, Brand.id == Store.brand_id)
            .where(Store.tenant_id == tenant_id)
        )

        if input_data.get("name_contains"):
            query = query.where(Store.name.contains(input_data["name_contains"]))
        if input_data.get("brand_id"):
            query = query.where(Store.brand_id == input_data["brand_id"])
        if input_data.get("prefecture"):
            query = query.where(Store.prefecture == input_data["prefecture"])
        if input_data.get("trade_area_type"):
            query = query.where(Store.trade_area_type == input_data["trade_area_type"])
        if input_data.get("status"):
            query = query.where(Store.status == input_data["status"])

        query = query.limit(limit)
        result = await db.execute(query)
        rows = result.all()

        stores = [
            {
                "store_id": str(r[0]),
                "name": r[1],
                "brand_name": r[2],
                "prefecture": r[3],
                "city": r[4],
                "trade_area_type": r[5],
                "status": r[6],
            }
            for r in rows
        ]
        return {
            "stores": stores[:20],
            "total": len(rows),
        }
    except Exception as e:
        return {"error": "データ取得に失敗しました", "detail": str(e)}


async def execute_get_brand_summary(input_data: dict, tenant_id: str, db: AsyncSession) -> dict:
    try:
        as_of = input_data.get("as_of_date")

        if not as_of:
            latest_q = await db.execute(
                select(func.max(StoreDailyKPI.business_date))
                .where(StoreDailyKPI.tenant_id == tenant_id)
            )
            as_of = latest_q.scalar()
            if not as_of:
                return {"error": "No KPI data available"}

        query = (
            select(
                Brand.id,
                Brand.name,
                func.count(StoreDailyKPI.store_id).label("store_count"),
                func.sum(StoreDailyKPI.net_sales).label("total_sales"),
                func.avg(StoreDailyKPI.cogs_rate).label("avg_cogs_rate"),
                func.avg(StoreDailyKPI.labor_cost_rate).label("avg_labor_rate"),
                func.avg(StoreDailyKPI.fl_ratio).label("avg_fl_ratio"),
                func.avg(StoreDailyKPI.operating_profit_rate).label("avg_op_rate"),
                func.avg(StoreDailyKPI.health_score).label("avg_health"),
                func.avg(StoreDailyKPI.review_score).label("avg_review"),
                func.sum(StoreDailyKPI.improvement_opportunity_amount).label("total_opp"),
            )
            .join(Store, Store.id == StoreDailyKPI.store_id)
            .join(Brand, Brand.id == Store.brand_id)
            .where(StoreDailyKPI.tenant_id == tenant_id, StoreDailyKPI.business_date == as_of)
            .group_by(Brand.id, Brand.name)
        )

        if input_data.get("brand_id"):
            query = query.where(Brand.id == input_data["brand_id"])

        result = await db.execute(query)
        rows = result.all()

        brands = [
            {
                "brand_id": str(r[0]),
                "brand_name": r[1],
                "store_count": r[2],
                "total_sales": float(r[3]) if r[3] else 0,
                "avg_cogs_rate": round(float(r[4]), 2) if r[4] else None,
                "avg_labor_cost_rate": round(float(r[5]), 2) if r[5] else None,
                "avg_fl_ratio": round(float(r[6]), 2) if r[6] else None,
                "avg_operating_profit_rate": round(float(r[7]), 2) if r[7] else None,
                "avg_health_score": round(float(r[8]), 1) if r[8] else None,
                "avg_review_score": round(float(r[9]), 2) if r[9] else None,
                "total_improvement_opportunity": float(r[10]) if r[10] else 0,
            }
            for r in rows
        ]
        return {
            "as_of_date": as_of if isinstance(as_of, str) else as_of.isoformat(),
            "brands": brands[:20],
        }
    except Exception as e:
        return {"error": "データ取得に失敗しました", "detail": str(e)}


async def execute_create_task_draft(input_data: dict, tenant_id: str, db: AsyncSession) -> dict:
    try:
        from uuid import UUID as UUIDType

        store_id = input_data["store_id"]

        # verify store exists
        store_q = await db.execute(
            select(Store.name).where(Store.id == store_id, Store.tenant_id == tenant_id)
        )
        store_name = store_q.scalar_one_or_none()
        if not store_name:
            return {"error": "Store not found"}

        task = Task(
            tenant_id=UUIDType(tenant_id),
            store_id=UUIDType(store_id),
            title=input_data["title"],
            description=input_data.get("description"),
            issue_type=input_data.get("issue_type"),
            priority=input_data.get("priority", "medium"),
            expected_impact_amount=input_data.get("expected_impact_amount"),
            source="ai_analyst",
            status="open",
        )
        db.add(task)
        await db.commit()
        await db.refresh(task)

        return {
            "task_id": str(task.id),
            "store_name": store_name,
            "title": task.title,
            "status": "open",
            "message": f"タスク「{task.title}」を{store_name}に作成しました。",
        }
    except Exception as e:
        return {"error": "データ取得に失敗しました", "detail": str(e)}


async def execute_explain_kpi_change(input_data: dict, tenant_id: str, db: AsyncSession) -> dict:
    """KPI 変化の要因分解 — 店舗別 / 期間別の delta + 主要 driver"""
    from app.services.value_engine_v2 import compute_baseline, compute_intervention
    from datetime import datetime as _dt
    kpi = input_data["kpi_name"]
    scope = input_data.get("scope", {})
    period = input_data.get("period", {})
    comparison_period = input_data.get("comparison_period", {})

    def _parse(d):
        if isinstance(d, str): return _dt.fromisoformat(d).date()
        return d

    p_from = _parse(period.get("from"))
    p_to = _parse(period.get("to"))
    cp_from = _parse(comparison_period.get("from")) if comparison_period.get("from") else None
    cp_to = _parse(comparison_period.get("to")) if comparison_period.get("to") else None

    store_q = select(Store.id).where(Store.tenant_id == tenant_id)
    if scope.get("brand_id"):
        store_q = store_q.where(Store.brand_id == scope["brand_id"])
    store_ids = [str(r[0]) for r in (await db.execute(store_q)).all()]
    if not store_ids:
        return {"error": "対象店舗が見つかりません"}

    current = await compute_intervention(db, tenant_id, store_ids, kpi, p_from, p_to)
    if cp_from and cp_to:
        prior = await compute_baseline(db, tenant_id, store_ids, kpi, cp_from, cp_to)
        delta = (current["mean"] or 0) - (prior["mean"] or 0)
        delta_pct = (delta / (prior["mean"] or 1)) * 100 if prior["mean"] else 0
    else:
        prior = None
        delta = None
        delta_pct = None

    drivers = []
    for sid in store_ids[:50]:
        cur = await compute_intervention(db, tenant_id, [sid], kpi, p_from, p_to)
        if cp_from and cp_to:
            pri = await compute_baseline(db, tenant_id, [sid], kpi, cp_from, cp_to)
            d = (cur["mean"] or 0) - (pri["mean"] or 0)
        else:
            d = cur["mean"] or 0
        if cur["n"] > 0:
            drivers.append({"store_id": sid, "delta": d, "current": cur["mean"]})
    drivers.sort(key=lambda x: abs(x["delta"]), reverse=True)

    return {
        "kpi_name": kpi,
        "current_mean": current["mean"],
        "prior_mean": prior["mean"] if prior else None,
        "delta_absolute": delta,
        "delta_pct": delta_pct,
        "top_drivers": drivers[:5],
        "store_count": len(store_ids),
        "recommended_actions": [
            f"上位ドライバー店舗（{len(drivers[:3])}店）に SV 緊急訪問を提案",
            f"{kpi} の悪化が継続している場合、ValueCase 起票を推奨",
        ],
    }


async def execute_estimate_value_impact(input_data: dict, tenant_id: str, db: AsyncSession) -> dict:
    """施策の円換算インパクト試算"""
    from app.services.pilot_engine import KPI_VALUE_CONVERSION
    from app.services.value_engine_v2 import compute_baseline, compute_intervention, compute_annualized_impact
    from datetime import datetime as _dt

    case_type = input_data.get("value_case_type", "waste_reduction")
    target_stores = input_data.get("target_stores", [])
    baseline_period = input_data.get("baseline_period", {})
    intervention_period = input_data.get("intervention_period", {})

    kpi_map = {
        "waste_reduction": "waste_amount",
        "stockout_reduction": "stockout_rate",
        "labor_optimization": "labor_cost_rate",
        "shift_realignment": "sales_per_labor_hour",
        "qsc_improvement": "qsc_score",
    }
    kpi = kpi_map.get(case_type, "gross_profit_rate")

    bs = _dt.fromisoformat(baseline_period["from"]).date() if baseline_period.get("from") else None
    be = _dt.fromisoformat(baseline_period["to"]).date() if baseline_period.get("to") else None
    is_ = _dt.fromisoformat(intervention_period["from"]).date() if intervention_period.get("from") else None
    ie = _dt.fromisoformat(intervention_period["to"]).date() if intervention_period.get("to") else None

    if not all([bs, be, is_, ie]) or not target_stores:
        return {"error": "baseline / intervention period と target_stores が必要"}

    baseline = await compute_baseline(db, tenant_id, target_stores, kpi, bs, be)
    intervention = await compute_intervention(db, tenant_id, target_stores, kpi, is_, ie)
    delta = (intervention["mean"] or 0) - (baseline["mean"] or 0)
    annual = compute_annualized_impact(kpi, delta, len(target_stores), is_, ie)

    return {
        "value_case_type": case_type,
        "kpi_used": kpi,
        "baseline_mean": baseline["mean"],
        "intervention_mean": intervention["mean"],
        "delta": delta,
        "estimated_annual_impact_yen": int(annual),
        "store_count": len(target_stores),
        "assumptions": KPI_VALUE_CONVERSION.get(kpi, {}),
        "calculation_method": "Before/After mean delta × annualization factor × store count",
        "confidence_warning": (
            "サンプル数が少ないため信頼性は中程度" if baseline["n"] < 30 else None
        ),
    }


async def execute_generate_sv_missions(input_data: dict, tenant_id: str, db: AsyncSession) -> dict:
    """SV 向け週次訪問計画"""
    from datetime import date as _date, timedelta as _td
    sv_user_id = input_data.get("sv_user_id")
    week_start_str = input_data.get("week_start")
    max_visits = input_data.get("max_visits", 5)
    optimization_goal = input_data.get("optimization_goal", "improvement_opportunity")

    week_start = _date.fromisoformat(week_start_str) if week_start_str else _date.today()

    rows = (await db.execute(
        select(Store.id, Store.name, StoreDailyKPI.health_score,
               StoreDailyKPI.improvement_opportunity_amount)
        .join(StoreDailyKPI, StoreDailyKPI.store_id == Store.id)
        .where(Store.tenant_id == tenant_id)
        .order_by(StoreDailyKPI.health_score.asc())
        .limit(max_visits)
    )).all()

    missions = []
    for i, r in enumerate(rows):
        missions.append({
            "store_id": str(r[0]),
            "store_name": r[1],
            "priority": i + 1,
            "scheduled_date": (week_start + _td(days=i)).isoformat(),
            "reason": f"health_score {r[2]:.1f} で要改善",
            "expected_impact_yen": int(r[3]) if r[3] else None,
            "checklist": [
                "QSC 状況確認",
                "シフト充足率チェック",
                "在庫水準確認",
                "店長との 1on1（30分）",
                "改善 task の現場展開状況確認",
            ],
        })

    return {
        "sv_user_id": str(sv_user_id) if sv_user_id else None,
        "week_start": week_start.isoformat(),
        "missions": missions,
        "total_expected_impact_yen": sum(m["expected_impact_yen"] or 0 for m in missions),
        "optimization_goal": optimization_goal,
    }


async def execute_generate_executive_pack(input_data: dict, tenant_id: str, db: AsyncSession) -> dict:
    """経営会議パック生成 — pilot summary を基に"""
    from app.services.executive_pack import generate_executive_dashboard_data, generate_pilot_report
    pilot_id = input_data.get("pilot_id")
    audience = input_data.get("audience", "executive")

    if pilot_id:
        return await generate_pilot_report(db, tenant_id, pilot_id, audience=audience)
    return await generate_executive_dashboard_data(db, tenant_id)


TOOL_EXECUTORS = {
    "query_kpi": execute_query_kpi,
    "get_store_detail": execute_get_store_detail,
    "get_store_ranking": execute_get_store_ranking,
    "search_stores": execute_search_stores,
    "get_brand_summary": execute_get_brand_summary,
    "create_task_draft": execute_create_task_draft,
    "explain_kpi_change": execute_explain_kpi_change,
    "estimate_value_impact": execute_estimate_value_impact,
    "generate_sv_missions": execute_generate_sv_missions,
    "generate_executive_pack": execute_generate_executive_pack,
}


async def execute_tool(name: str, input_data: dict, tenant_id: str, db: AsyncSession) -> dict:
    executor = TOOL_EXECUTORS.get(name)
    if not executor:
        return {"error": f"Unknown tool: {name}"}
    try:
        return await executor(input_data, tenant_id, db)
    except Exception as e:
        return {"error": str(e)}
