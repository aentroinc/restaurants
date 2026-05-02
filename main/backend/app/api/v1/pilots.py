"""Zensho Pilot Package API"""
from datetime import date
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_tenant_id
from app.models.pilot import PilotProject, PilotIntervention, PilotResult
from app.services.pilot_engine import (
    create_pilot_from_template, calculate_pilot_results, generate_pilot_summary,
    get_theme_template, list_themes, THEME_TEMPLATES,
)
from app.services.executive_pack import generate_pilot_report
from app.middleware.audit import log_audit

router = APIRouter(prefix="/api/v1/pilots", tags=["pilots"])


class PilotCreate(BaseModel):
    theme: str
    target_brand_id: UUID | None = None
    target_store_ids: list[UUID] = []
    control_store_ids: list[UUID] = []
    name: str | None = None
    sponsor_name: str | None = None
    baseline_start: date | None = None
    overlay_mode: str = "read_only"


class InterventionCreate(BaseModel):
    intervention_type: str
    name: str
    description: str | None = None
    target_store_ids: list[UUID] = []
    start_date: date
    end_date: date | None = None
    expected_impact_yen: int | None = None


@router.get("/themes")
async def get_themes():
    """5 標準テーマの一覧 + 各テンプレ詳細"""
    return {"data": list_themes()}


@router.get("/themes/{theme_id}")
async def get_theme_detail(theme_id: str):
    if theme_id not in THEME_TEMPLATES:
        raise HTTPException(404, f"Theme {theme_id} not found")
    return {"data": {"theme_id": theme_id, **THEME_TEMPLATES[theme_id]}}


@router.get("/")
async def list_pilots(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    rows = (await db.execute(
        select(PilotProject).where(PilotProject.tenant_id == tenant_id).order_by(PilotProject.created_at.desc())
    )).scalars().all()
    return {"data": [_pilot_dict(p) for p in rows]}


@router.post("/", status_code=201)
async def create_pilot(
    body: PilotCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    if body.theme not in THEME_TEMPLATES:
        raise HTTPException(400, f"Invalid theme: {body.theme}")

    pilot = await create_pilot_from_template(
        db, tenant_id, body.theme,
        target_brand_id=str(body.target_brand_id) if body.target_brand_id else None,
        target_store_ids=[str(s) for s in body.target_store_ids],
        control_store_ids=[str(s) for s in body.control_store_ids],
        name_override=body.name,
        sponsor_name=body.sponsor_name,
        baseline_start=body.baseline_start,
        overlay_mode=body.overlay_mode,
    )
    log_audit(tenant_id, None, "pilot_created", "pilot", str(pilot.id), {"theme": body.theme})
    return {"data": _pilot_dict(pilot, include_template=True)}


@router.get("/{pilot_id}")
async def get_pilot(
    pilot_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    p = (await db.execute(
        select(PilotProject).where(PilotProject.id == pilot_id, PilotProject.tenant_id == tenant_id)
    )).scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Pilot not found")

    interventions = (await db.execute(
        select(PilotIntervention).where(PilotIntervention.pilot_project_id == pilot_id)
    )).scalars().all()
    results = (await db.execute(
        select(PilotResult).where(PilotResult.pilot_project_id == pilot_id)
    )).scalars().all()

    return {"data": {
        **_pilot_dict(p, include_template=True),
        "interventions": [_iv_dict(i) for i in interventions],
        "results": [_result_dict(r) for r in results],
    }}


@router.post("/{pilot_id}/interventions", status_code=201)
async def add_intervention(
    pilot_id: UUID,
    body: InterventionCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    p = (await db.execute(
        select(PilotProject).where(PilotProject.id == pilot_id, PilotProject.tenant_id == tenant_id)
    )).scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Pilot not found")

    iv = PilotIntervention(
        id=uuid4(), pilot_project_id=pilot_id,
        intervention_type=body.intervention_type, name=body.name, description=body.description,
        target_store_ids=body.target_store_ids,
        start_date=body.start_date, end_date=body.end_date,
        expected_impact_yen=body.expected_impact_yen,
    )
    db.add(iv)
    await db.commit()
    return {"data": _iv_dict(iv)}


@router.post("/{pilot_id}/calculate-results")
async def calculate_results(
    pilot_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """statistical test を回して PilotResult を更新"""
    try:
        results = await calculate_pilot_results(db, tenant_id, str(pilot_id))
    except ValueError as e:
        raise HTTPException(404, str(e))
    log_audit(tenant_id, None, "pilot_results_calculated", "pilot", str(pilot_id),
              {"result_count": len(results)})
    return {"data": [_result_dict(r) for r in results]}


@router.get("/{pilot_id}/results")
async def get_results(
    pilot_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    rows = (await db.execute(
        select(PilotResult).where(PilotResult.pilot_project_id == pilot_id)
    )).scalars().all()
    return {"data": [_result_dict(r) for r in rows]}


@router.get("/{pilot_id}/summary")
async def get_summary(
    pilot_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """経営向け 1ページ summary"""
    summary = await generate_pilot_summary(db, tenant_id, str(pilot_id))
    return {"data": summary}


@router.post("/{pilot_id}/export-pack")
async def export_pack(
    pilot_id: UUID,
    audience: str = Query("executive", regex="^(executive|brand|it|store_manager)$"),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """POC 報告パック生成（PDF/PowerPoint 相当の構造化 JSON）"""
    pack = await generate_pilot_report(db, tenant_id, str(pilot_id), audience=audience)
    return {"data": pack}


def _pilot_dict(p: PilotProject, include_template: bool = False) -> dict:
    out = {
        "id": str(p.id),
        "name": p.name,
        "theme": p.theme,
        "description": p.description,
        "target_brand_id": str(p.target_brand_id) if p.target_brand_id else None,
        "target_store_ids": [str(s) for s in (p.target_store_ids or [])],
        "control_store_ids": [str(s) for s in (p.control_store_ids or [])],
        "baseline_start_date": p.baseline_start_date.isoformat(),
        "baseline_end_date": p.baseline_end_date.isoformat(),
        "intervention_start_date": p.intervention_start_date.isoformat(),
        "intervention_end_date": p.intervention_end_date.isoformat(),
        "success_kpis": p.success_kpis,
        "target_improvement_pct": p.target_improvement_pct,
        "sponsor_name": p.sponsor_name,
        "status": p.status,
        "overlay_mode": p.overlay_mode,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }
    if include_template:
        tmpl = get_theme_template(p.theme)
        out["weekly_plan"] = tmpl.get("weekly_plan", [])
        out["data_required"] = tmpl.get("data_required", [])
    return out


def _iv_dict(iv: PilotIntervention) -> dict:
    return {
        "id": str(iv.id),
        "intervention_type": iv.intervention_type,
        "name": iv.name,
        "description": iv.description,
        "target_store_ids": [str(s) for s in (iv.target_store_ids or [])],
        "start_date": iv.start_date.isoformat() if iv.start_date else None,
        "end_date": iv.end_date.isoformat() if iv.end_date else None,
        "expected_impact_yen": int(iv.expected_impact_yen) if iv.expected_impact_yen else None,
        "actual_impact_yen": int(iv.actual_impact_yen) if iv.actual_impact_yen else None,
        "status": iv.status,
    }


def _result_dict(r: PilotResult) -> dict:
    return {
        "id": str(r.id),
        "kpi_name": r.kpi_name,
        "baseline_value": float(r.baseline_value) if r.baseline_value is not None else None,
        "intervention_value": float(r.intervention_value) if r.intervention_value is not None else None,
        "control_value": float(r.control_value) if r.control_value is not None else None,
        "delta_absolute": float(r.delta_absolute) if r.delta_absolute is not None else None,
        "delta_pct": float(r.delta_pct) if r.delta_pct is not None else None,
        "p_value": float(r.p_value) if r.p_value is not None else None,
        "confidence_interval_low": float(r.confidence_interval_low) if r.confidence_interval_low is not None else None,
        "confidence_interval_high": float(r.confidence_interval_high) if r.confidence_interval_high is not None else None,
        "sample_size": r.sample_size,
        "significant": r.significant,
        "annualized_impact_yen": int(r.annualized_impact_yen) if r.annualized_impact_yen is not None else None,
        "calculation_method": r.calculation_method,
        "assumptions": r.assumptions,
        "calculated_at": r.calculated_at.isoformat() if r.calculated_at else None,
    }
