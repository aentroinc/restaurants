"""Run a saved Analysis spec and return rendered panel results.

Analysis spec example:

    {
        "name": "首都圏駅前店 粗利率分析",
        "panels": [
            {"id": "p1", "type": "kpi", "data": {
                "kpi_name": "gross_margin", "scope": {"region": "首都圏"},
                "period": {"from": "2026-01-01", "to": "2026-04-30",
                           "granularity": "monthly"},
                "group_by": "brand"}},
            {"id": "p2", "type": "cohort", "spec": {...}}
        ]
    }
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.cohort_builder import evaluate_cohort_rich
from app.services.custom_kpi_engine import evaluate_formula


# Predefined formulas used when a panel asks for a "kpi by name"
FORMULA_LIBRARY = {
    "gross_margin": "({net_sales} - {cogs}) / {net_sales}",
    "labor_ratio": "{labor_cost} / {net_sales}",
    "fl_ratio": "({labor_cost} + {cogs}) / {net_sales}",
    "avg_ticket": "{net_sales} / {customer_count}",
    "operating_margin": "{operating_profit} / {net_sales}",
    "sales_per_labor_hour": "{sales_per_labor_hour}",
}


def _parse_date(v: Any) -> date | None:
    if not v:
        return None
    if isinstance(v, date):
        return v
    return datetime.fromisoformat(str(v)).date()


async def run_panel(db: AsyncSession, tenant_id: str, panel: dict) -> dict:
    ptype = panel.get("type")
    pid = panel.get("id", "panel")
    if ptype in ("kpi", "line_chart", "bar_chart", "pivot_table"):
        data = panel.get("data") or {}
        kpi_name = data.get("kpi_name") or data.get("kpi")
        formula = data.get("formula") or FORMULA_LIBRARY.get(kpi_name)
        if not formula:
            return {"id": pid, "type": ptype, "error": f"unknown KPI: {kpi_name}"}
        period = data.get("period") or {}
        rows = await evaluate_formula(
            db,
            tenant_id=tenant_id,
            formula=formula,
            target_object_type=data.get("target_object_type", "Store"),
            aggregation_axis=[data.get("group_by") or "month"],
            filters=data.get("scope") or {},
            date_from=_parse_date(period.get("from")),
            date_to=_parse_date(period.get("to")),
        )
        return {"id": pid, "type": ptype, "rows": rows}

    if ptype == "cohort":
        spec = panel.get("spec") or {"object_type": "Store"}
        instances = await evaluate_cohort_rich(db, tenant_id, spec)
        return {"id": pid, "type": ptype, "instances": instances}

    return {"id": pid, "type": ptype, "error": f"unknown panel type: {ptype}"}


async def run_analysis(db: AsyncSession, tenant_id: str, spec: dict) -> dict:
    panels = spec.get("panels", [])
    out = []
    for p in panels:
        try:
            out.append(await run_panel(db, tenant_id, p))
        except Exception as e:
            out.append({"id": p.get("id", "panel"), "error": str(e)[:200]})
    return {"name": spec.get("name"), "panels": out}
