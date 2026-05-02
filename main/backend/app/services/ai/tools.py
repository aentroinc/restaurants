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
        return {"kpi": kpi_name, "results": data[:50], "total_records": len(rows)}


async def execute_get_store_detail(input_data: dict, tenant_id: str, db: AsyncSession) -> dict:
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


async def execute_get_store_ranking(input_data: dict, tenant_id: str, db: AsyncSession) -> dict:
    metric = input_data["metric"]
    order = input_data.get("order", "desc")
    limit = input_data.get("limit", 10)

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

    return {
        "metric": metric,
        "order": order,
        "as_of_date": latest_date.isoformat(),
        "stores": [
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
        ],
    }


async def execute_search_stores(input_data: dict, tenant_id: str, db: AsyncSession) -> dict:
    limit = input_data.get("limit", 20)

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

    return {
        "stores": [
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
        ],
        "total": len(rows),
    }


async def execute_get_brand_summary(input_data: dict, tenant_id: str, db: AsyncSession) -> dict:
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

    return {
        "as_of_date": as_of if isinstance(as_of, str) else as_of.isoformat(),
        "brands": [
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
        ],
    }


async def execute_create_task_draft(input_data: dict, tenant_id: str, db: AsyncSession) -> dict:
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


TOOL_EXECUTORS = {
    "query_kpi": execute_query_kpi,
    "get_store_detail": execute_get_store_detail,
    "get_store_ranking": execute_get_store_ranking,
    "search_stores": execute_search_stores,
    "get_brand_summary": execute_get_brand_summary,
    "create_task_draft": execute_create_task_draft,
}


async def execute_tool(name: str, input_data: dict, tenant_id: str, db: AsyncSession) -> dict:
    executor = TOOL_EXECUTORS.get(name)
    if not executor:
        return {"error": f"Unknown tool: {name}"}
    try:
        return await executor(input_data, tenant_id, db)
    except Exception as e:
        return {"error": str(e)}
