"""Workspace runtime endpoints.

Provides:
  - POST /api/v1/workspace-engine/preview-formula  -> evaluate formula for a window
  - POST /api/v1/workspace-engine/run-analysis    -> evaluate an Analysis spec
  - POST /api/v1/workspace-engine/run-cohort      -> evaluate a Cohort spec
  - POST /api/v1/workspace-engine/promote-kpi     -> Custom KPI -> KPIDefinition

These complement the existing /api/v1/workspace router (which manages
persistent rows). Naming the router "workspace-engine" avoids collision.
"""
from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user_optional
from app.core.tenant_context import get_tenant_or_demo
from app.database import get_db
from app.middleware.audit import log_audit
from app.models.kpi_definition import KPIDefinition
from app.models.workspace import CustomKPI
from app.services.analysis_runner import run_analysis
from app.services.cohort_builder import evaluate_cohort_rich
from app.services.custom_kpi_engine import evaluate_formula
from app.services.dsl import FormulaError, parse_formula

router = APIRouter(prefix="/api/v1/workspace-engine", tags=["workspace-engine"])


class PreviewIn(BaseModel):
    formula: str
    target_object_type: str = "Store"
    aggregation_axis: list[str] = ["month"]
    filters: dict[str, Any] | None = None
    date_from: date | None = None
    date_to: date | None = None


@router.post("/preview-formula")
async def preview_formula(body: PreviewIn, db: AsyncSession = Depends(get_db)):
    tenant_id = get_tenant_or_demo()
    try:
        parse_formula(body.formula)  # validate before hitting DB
    except FormulaError as e:
        raise HTTPException(400, detail=f"Invalid formula: {e}")
    try:
        rows = await evaluate_formula(
            db,
            tenant_id=tenant_id,
            formula=body.formula,
            target_object_type=body.target_object_type,
            aggregation_axis=body.aggregation_axis,
            filters=body.filters,
            date_from=body.date_from,
            date_to=body.date_to,
        )
        return {"rows": rows, "row_count": len(rows)}
    except Exception as e:
        raise HTTPException(400, detail=f"Evaluation failed: {e}")


class RunAnalysisIn(BaseModel):
    spec: dict[str, Any]


@router.post("/run-analysis")
async def run_analysis_endpoint(body: RunAnalysisIn, db: AsyncSession = Depends(get_db)):
    tenant_id = get_tenant_or_demo()
    return await run_analysis(db, tenant_id, body.spec)


class RunCohortIn(BaseModel):
    spec: dict[str, Any]


@router.post("/run-cohort")
async def run_cohort_endpoint(body: RunCohortIn, db: AsyncSession = Depends(get_db)):
    tenant_id = get_tenant_or_demo()
    instances = await evaluate_cohort_rich(db, tenant_id, body.spec)
    return {"instances": instances, "instance_count": len(instances)}


class PromoteIn(BaseModel):
    custom_kpi_id: str


@router.post("/promote-kpi")
async def promote_custom_kpi(
    body: PromoteIn,
    db: AsyncSession = Depends(get_db),
    user: dict | None = Depends(get_current_user_optional),
):
    tenant_id = get_tenant_or_demo()
    res = await db.execute(
        select(CustomKPI).where(CustomKPI.id == body.custom_kpi_id, CustomKPI.tenant_id == tenant_id)
    )
    ck = res.scalar_one_or_none()
    if not ck:
        raise HTTPException(404)

    # Look for an existing KPIDefinition with the same api_name
    existing_q = await db.execute(
        select(KPIDefinition).where(
            KPIDefinition.tenant_id == tenant_id,
            KPIDefinition.api_name == ck.api_name,
        )
    )
    kpi = existing_q.scalar_one_or_none()
    if kpi:
        kpi.formula = ck.formula
        kpi.display_name = ck.display_name
        if hasattr(kpi, "source"):
            kpi.source = "promoted_from_custom_kpi"
    else:
        kpi = KPIDefinition(
            tenant_id=tenant_id,
            api_name=ck.api_name,
            display_name=ck.display_name,
            formula=ck.formula,
        )
        if hasattr(kpi, "source"):
            kpi.source = "promoted_from_custom_kpi"
        db.add(kpi)
    ck.status = "promoted"
    await db.commit()
    log_audit(
        tenant_id, user.get("sub") if user else None,
        "promote", "custom_kpi", str(ck.id),
        {"to_kpi_definition_id": str(kpi.id)},
    )
    return {"kpi_definition_id": str(kpi.id), "api_name": kpi.api_name}
