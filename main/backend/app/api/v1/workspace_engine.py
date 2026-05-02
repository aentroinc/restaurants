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
from uuid import UUID as UUIDType

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user_optional
from app.core.tenant_context import get_tenant_or_demo
from app.database import get_db
from app.middleware.audit import log_audit
from app.models.kpi_definition import KPIDefinition
from app.models.meeting_pack import BoardMeetingItem, BoardMeetingPack
from app.models.workspace import Analysis, CustomKPI
from app.services.analysis_runner import run_analysis
from app.services.cohort_builder import evaluate_cohort_rich
from app.services.custom_kpi_engine import evaluate_formula
from app.services.dsl import FormulaError, parse_formula
from app.services.exporters import export as export_result

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


# ---- Export ----

class ExportIn(BaseModel):
    spec: dict[str, Any] | None = None
    analysis_id: str | None = None


@router.post("/export")
async def export_endpoint(
    body: ExportIn,
    format: str = Query("csv", pattern="^(csv|xlsx|parquet)$"),
    db: AsyncSession = Depends(get_db),
    user: dict | None = Depends(get_current_user_optional),
):
    """Run an Analysis spec (or a saved one) and export the panel results."""
    tenant_id = get_tenant_or_demo()

    if body.analysis_id:
        res = await db.execute(
            select(Analysis).where(
                Analysis.id == body.analysis_id,
                Analysis.tenant_id == tenant_id,
            )
        )
        analysis = res.scalar_one_or_none()
        if not analysis:
            raise HTTPException(404, "analysis not found")
        spec = analysis.spec
    else:
        if not body.spec:
            raise HTTPException(400, "spec or analysis_id required")
        spec = body.spec

    result = await run_analysis(db, tenant_id, spec)
    body_bytes, mime, suffix = export_result(result, format)

    log_audit(
        tenant_id, user.get("sub") if user else None,
        "export", "analysis", body.analysis_id,
        {"format": format, "byte_size": len(body_bytes)},
    )

    filename = (result.get("name") or "analysis").replace(" ", "_") + suffix
    return Response(
        content=body_bytes,
        media_type=mime,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---- Meeting Pack integration ----

class FromAnalysisIn(BaseModel):
    analysis_id: str
    panel_id: str | None = None
    refresh_policy: str = "static"  # static | weekly | monthly
    title: str | None = None


@router.post("/meeting-packs/{pack_id}/items/from-analysis")
async def add_meeting_pack_item_from_analysis(
    pack_id: str,
    body: FromAnalysisIn,
    db: AsyncSession = Depends(get_db),
    user: dict | None = Depends(get_current_user_optional),
):
    """Embed an Analysis (panel) into a Meeting Pack as an item."""
    tenant_id = get_tenant_or_demo()

    pack_q = await db.execute(
        select(BoardMeetingPack).where(
            BoardMeetingPack.id == pack_id,
            BoardMeetingPack.tenant_id == tenant_id,
        )
    )
    pack = pack_q.scalar_one_or_none()
    if not pack:
        raise HTTPException(404, "meeting pack not found")

    analysis_q = await db.execute(
        select(Analysis).where(
            Analysis.id == body.analysis_id,
            Analysis.tenant_id == tenant_id,
        )
    )
    analysis = analysis_q.scalar_one_or_none()
    if not analysis:
        raise HTTPException(404, "analysis not found")

    # Run now to capture a snapshot
    result = await run_analysis(db, tenant_id, analysis.spec)
    snapshot_panels = result.get("panels", [])
    if body.panel_id:
        snapshot_panels = [p for p in snapshot_panels if p.get("id") == body.panel_id]

    item = BoardMeetingItem(
        pack_id=UUIDType(pack_id),
        item_type="analysis_panel",
        title=body.title or analysis.name,
        content={
            "analysis_id": str(analysis.id),
            "panel_id": body.panel_id,
            "refresh_policy": body.refresh_policy,
            "snapshot": snapshot_panels,
        },
        sort_order=0,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    log_audit(
        tenant_id, user.get("sub") if user else None,
        "embed_analysis", "meeting_pack_item", str(item.id),
        {"analysis_id": str(analysis.id), "refresh_policy": body.refresh_policy},
    )
    return {
        "item_id": str(item.id),
        "pack_id": pack_id,
        "panels_captured": len(snapshot_panels),
    }


@router.post("/meeting-packs/items/{item_id}/refresh")
async def refresh_meeting_pack_item(
    item_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Re-run the embedded analysis and replace the snapshot."""
    tenant_id = get_tenant_or_demo()

    res = await db.execute(
        select(BoardMeetingItem).where(BoardMeetingItem.id == item_id)
    )
    item = res.scalar_one_or_none()
    if not item or item.item_type != "analysis_panel":
        raise HTTPException(404)
    content = item.content or {}
    analysis_id = content.get("analysis_id")
    if not analysis_id:
        raise HTTPException(400, "item is not analysis-backed")

    a_q = await db.execute(
        select(Analysis).where(
            Analysis.id == analysis_id,
            Analysis.tenant_id == tenant_id,
        )
    )
    analysis = a_q.scalar_one_or_none()
    if not analysis:
        raise HTTPException(404, "analysis not found")

    result = await run_analysis(db, tenant_id, analysis.spec)
    panels = result.get("panels", [])
    if content.get("panel_id"):
        panels = [p for p in panels if p.get("id") == content["panel_id"]]
    item.content = {**content, "snapshot": panels, "refreshed_at": str(__import__("datetime").datetime.utcnow())}
    await db.commit()
    return {"item_id": item_id, "panels": panels}
