"""Richer cohort builder using a structured spec, returning instance dicts.

This complements the simpler `services.cohort_engine.evaluate_cohort` which
returns only store ids — used by the legacy KPI flow. Workspace endpoints
use this builder to render full instance rows.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.area import Area
from app.models.brand import Brand
from app.models.kpi import StoreDailyKPI
from app.models.region import Region
from app.models.store import Store

PROPERTY_COLS = {
    "name": Store.name,
    "code": Store.code,
    "prefecture": Store.prefecture,
    "city": Store.city,
    "trade_area_type": Store.trade_area_type,
    "status": Store.status,
}

KPI_COLS = {
    "net_sales": StoreDailyKPI.net_sales,
    "gross_profit": StoreDailyKPI.gross_profit,
    "operating_profit": StoreDailyKPI.operating_profit,
    "customer_count": StoreDailyKPI.customer_count,
    "avg_ticket": StoreDailyKPI.avg_ticket,
    "labor_cost": StoreDailyKPI.labor_cost,
    "cogs": StoreDailyKPI.cogs,
    "health_score": StoreDailyKPI.health_score,
}


def _apply_property_filter(stmt, predicate: dict):
    col = PROPERTY_COLS.get(predicate.get("property"))
    if col is None:
        return stmt
    op = predicate.get("op", "==")
    value = predicate.get("value")
    if op == "==":
        return stmt.where(col == value)
    if op == "!=":
        return stmt.where(col != value)
    if op == "in":
        return stmt.where(col.in_(value or []))
    if op == "not_in":
        return stmt.where(~col.in_(value or []))
    if op == "ilike":
        return stmt.where(col.ilike(f"%{value}%"))
    return stmt


def _parse_date(value: Any) -> date | None:
    if not value:
        return None
    if isinstance(value, date):
        return value
    return datetime.fromisoformat(str(value)).date()


async def evaluate_cohort_rich(
    db: AsyncSession,
    tenant_id: str,
    spec: dict,
) -> list[dict]:
    if spec.get("object_type") != "Store":
        return []

    stmt = (
        select(
            Store.id, Store.code, Store.name, Store.prefecture,
            Store.trade_area_type, Brand.name.label("brand"),
            Region.name.label("region"),
        )
        .select_from(Store)
        .join(Brand, Brand.id == Store.brand_id)
        .join(Area, Area.id == Store.area_id)
        .join(Region, Region.id == Area.region_id)
        .where(Store.tenant_id == tenant_id)
    )

    predicates = spec.get("and", [])
    kpi_predicates = []
    for p in predicates:
        if "property" in p:
            stmt = _apply_property_filter(stmt, p)
        elif "brand" in p:
            stmt = stmt.where(Brand.name == p["brand"])
        elif "region" in p:
            stmt = stmt.where(Region.name == p["region"])
        elif "kpi" in p:
            kpi_predicates.append(p)

    for p in kpi_predicates:
        kpi_col = KPI_COLS.get(p.get("kpi"))
        if kpi_col is None:
            continue
        period = p.get("period") or {}
        date_from = _parse_date(period.get("from"))
        date_to = _parse_date(period.get("to"))
        op = p.get("op", "<")
        value = float(p.get("value", 0))

        sub = select(
            StoreDailyKPI.store_id,
            func.avg(kpi_col).label("agg"),
        ).where(StoreDailyKPI.tenant_id == tenant_id)
        if date_from:
            sub = sub.where(StoreDailyKPI.business_date >= date_from)
        if date_to:
            sub = sub.where(StoreDailyKPI.business_date <= date_to)
        sub = sub.group_by(StoreDailyKPI.store_id).subquery()

        stmt = stmt.join(sub, sub.c.store_id == Store.id)
        if op == "<":
            stmt = stmt.where(sub.c.agg < value)
        elif op == ">":
            stmt = stmt.where(sub.c.agg > value)
        elif op == "<=":
            stmt = stmt.where(sub.c.agg <= value)
        elif op == ">=":
            stmt = stmt.where(sub.c.agg >= value)
        elif op == "==":
            stmt = stmt.where(sub.c.agg == value)

    result = await db.execute(stmt.limit(10000))
    rows = result.all()
    return [
        {
            "store_id": str(r.id), "code": r.code, "name": r.name,
            "prefecture": r.prefecture, "trade_area_type": r.trade_area_type,
            "brand": r.brand, "region": r.region,
        }
        for r in rows
    ]
