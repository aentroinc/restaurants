import re
from datetime import date
from decimal import Decimal
from uuid import UUID
from sqlalchemy import select, func, and_, case, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.kpi import StoreDailyKPI
from app.models.daily_sales import DailyStoreSales
from app.models.store import Store
from app.models.brand import Brand
from app.models.region import Region
from app.models.area import Area

FIELD_MAP = {
    "sales": "net_sales",
    "net_sales": "net_sales",
    "gross_sales": "gross_sales",
    "cogs": "cogs",
    "labor_cost": "labor_cost",
    "labor_hours": "sales_per_labor_hour",
    "customer_count": "customer_count",
    "operating_profit": "operating_profit",
    "discount_amount": "discount_amount",
    "takeout_sales": "takeout_sales",
    "delivery_sales": "delivery_sales",
    "dine_in_sales": "dine_in_sales",
    "avg_ticket": "avg_ticket",
    "health_score": "health_score",
    "gross_profit": "gross_profit",
    "sales_per_labor_hour": "sales_per_labor_hour",
}

FIELD_PATTERN = re.compile(r"\{(\w+)\}")

KPI_FIELDS = {
    "net_sales", "cogs", "labor_cost", "customer_count", "avg_ticket",
    "operating_profit", "gross_profit", "health_score", "sales_per_labor_hour",
}

SALES_FIELDS = {
    "gross_sales", "net_sales", "customer_count", "discount_amount",
    "takeout_sales", "delivery_sales", "dine_in_sales",
}

AXIS_COLUMN_MAP = {
    "region": Region.name,
    "brand": Brand.name,
    "area": Area.name,
    "store": Store.name,
    "month": None,
    "date": None,
}


def _resolve_fields(formula: str) -> set[str]:
    tokens = FIELD_PATTERN.findall(formula)
    resolved = set()
    for t in tokens:
        mapped = FIELD_MAP.get(t)
        if mapped:
            resolved.add(mapped)
    return resolved


def _pick_source_table(fields: set[str]):
    if fields & KPI_FIELDS:
        return StoreDailyKPI
    return DailyStoreSales


async def evaluate_formula(
    db: AsyncSession,
    tenant_id: str,
    formula: str,
    target_object_type: str,
    aggregation_axis: list[str],
    filters: dict | None,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = 100,
) -> list[dict]:
    fields = _resolve_fields(formula)
    if not fields:
        return []

    source = _pick_source_table(fields)

    group_cols = []
    select_cols = []

    for axis in aggregation_axis:
        if axis == "month":
            month_col = func.date_trunc("month", source.business_date).label("month")
            group_cols.append(month_col)
            select_cols.append(month_col)
        elif axis == "date":
            group_cols.append(source.business_date)
            select_cols.append(source.business_date.label("date"))
        elif axis == "region":
            group_cols.append(Region.name)
            select_cols.append(Region.name.label("region"))
        elif axis == "brand":
            group_cols.append(Brand.name)
            select_cols.append(Brand.name.label("brand"))
        elif axis == "area":
            group_cols.append(Area.name)
            select_cols.append(Area.name.label("area"))
        elif axis == "store":
            group_cols.append(Store.name)
            select_cols.append(Store.name.label("store"))

    agg_expressions = {}
    for f in fields:
        col = getattr(source, f, None)
        if col is not None:
            agg_expressions[f] = func.sum(col).label(f"sum_{f}")
            select_cols.append(agg_expressions[f])

    q = select(*select_cols).select_from(source)
    q = q.join(Store, Store.id == source.store_id)
    q = q.join(Brand, Brand.id == Store.brand_id)
    q = q.join(Area, Area.id == Store.area_id)
    q = q.join(Region, Region.id == Area.region_id)

    conditions = [source.tenant_id == tenant_id]
    if date_from:
        conditions.append(source.business_date >= date_from)
    if date_to:
        conditions.append(source.business_date <= date_to)

    if filters:
        if "brand" in filters:
            conditions.append(Brand.name == filters["brand"])
        if "region" in filters:
            conditions.append(Region.name == filters["region"])
        if "area" in filters:
            conditions.append(Area.name == filters["area"])

    q = q.where(and_(*conditions))
    if group_cols:
        q = q.group_by(*group_cols)
    q = q.limit(limit)

    result = await db.execute(q)
    rows = result.all()

    output = []
    for row in rows:
        row_dict = dict(row._mapping)
        sums = {k: float(v) if v is not None else 0 for k, v in row_dict.items() if k.startswith("sum_")}
        clean_sums = {k.replace("sum_", ""): v for k, v in sums.items()}

        expr = formula
        for token in FIELD_PATTERN.findall(formula):
            mapped = FIELD_MAP.get(token)
            if mapped and mapped in clean_sums:
                expr = expr.replace(f"{{{token}}}", str(clean_sums[mapped]))

        try:
            value = eval(expr)
        except (ZeroDivisionError, Exception):
            value = None

        entry = {k: (v.isoformat() if hasattr(v, "isoformat") else v)
                 for k, v in row_dict.items() if not k.startswith("sum_")}
        entry["value"] = round(value, 4) if value is not None else None
        output.append(entry)

    return output
