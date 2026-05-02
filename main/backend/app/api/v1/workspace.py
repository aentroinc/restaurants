from datetime import date, datetime
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, update, delete
from app.database import get_db
from app.auth import get_tenant_id, get_current_user_optional
from app.models.workspace import Analysis, CustomKPI, Cohort, SavedQuery
from app.services.custom_kpi_engine import evaluate_formula
from app.services.cohort_engine import evaluate_cohort

router = APIRouter(prefix="/api/v1/workspace", tags=["workspace"])


# ── Analyses ──────────────────────────────────────────────

@router.get("/analyses")
async def list_analyses(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(Analysis).where(Analysis.tenant_id == tenant_id).order_by(Analysis.updated_at.desc())
    result = await db.execute(q)
    rows = result.scalars().all()
    return {"data": [_analysis_dict(r) for r in rows]}


@router.post("/analyses", status_code=201)
async def create_analysis(
    body: dict,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    user: dict | None = Depends(get_current_user_optional),
):
    obj = Analysis(
        id=uuid4(),
        tenant_id=tenant_id,
        name=body["name"],
        description=body.get("description"),
        owner_user_id=user["sub"] if user else None,
        visibility=body.get("visibility", "private"),
        spec=body.get("spec", {}),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return {"data": _analysis_dict(obj)}


@router.get("/analyses/{analysis_id}")
async def get_analysis(
    analysis_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = await _get_or_404(db, Analysis, analysis_id, tenant_id)
    return {"data": _analysis_dict(obj)}


@router.put("/analyses/{analysis_id}")
async def update_analysis(
    analysis_id: UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = await _get_or_404(db, Analysis, analysis_id, tenant_id)
    for field in ("name", "description", "visibility", "spec"):
        if field in body:
            setattr(obj, field, body[field])
    await db.commit()
    await db.refresh(obj)
    return {"data": _analysis_dict(obj)}


@router.delete("/analyses/{analysis_id}", status_code=204)
async def delete_analysis(
    analysis_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = await _get_or_404(db, Analysis, analysis_id, tenant_id)
    await db.delete(obj)
    await db.commit()


# ── Custom KPIs ───────────────────────────────────────────

@router.get("/custom-kpis")
async def list_custom_kpis(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(CustomKPI).where(CustomKPI.tenant_id == tenant_id).order_by(CustomKPI.created_at.desc())
    result = await db.execute(q)
    rows = result.scalars().all()
    return {"data": [_kpi_dict(r) for r in rows]}


@router.post("/custom-kpis", status_code=201)
async def create_custom_kpi(
    body: dict,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    user: dict | None = Depends(get_current_user_optional),
):
    obj = CustomKPI(
        id=uuid4(),
        tenant_id=tenant_id,
        api_name=body["api_name"],
        display_name=body["display_name"],
        formula=body["formula"],
        target_object_type=body.get("target_object_type", "Store"),
        aggregation_axis=body.get("aggregation_axis", []),
        filters=body.get("filters"),
        unit=body.get("unit"),
        created_by=user["sub"] if user else None,
        status=body.get("status", "draft"),
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return {"data": _kpi_dict(obj)}


@router.post("/custom-kpis/{kpi_id}/preview")
async def preview_custom_kpi(
    kpi_id: UUID,
    body: dict | None = None,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = await _get_or_404(db, CustomKPI, kpi_id, tenant_id)
    body = body or {}
    results = await evaluate_formula(
        db=db,
        tenant_id=tenant_id,
        formula=obj.formula,
        target_object_type=obj.target_object_type,
        aggregation_axis=obj.aggregation_axis,
        filters=obj.filters,
        date_from=_parse_date(body.get("date_from")),
        date_to=_parse_date(body.get("date_to")),
        limit=body.get("limit", 50),
    )
    return {"data": results, "formula": obj.formula, "kpi_name": obj.display_name}


@router.post("/custom-kpis/{kpi_id}/promote")
async def promote_custom_kpi(
    kpi_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = await _get_or_404(db, CustomKPI, kpi_id, tenant_id)
    obj.status = "promoted"
    await db.commit()
    await db.refresh(obj)
    return {"data": _kpi_dict(obj)}


# ── Cohorts ───────────────────────────────────────────────

@router.get("/cohorts")
async def list_cohorts(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(Cohort).where(Cohort.tenant_id == tenant_id).order_by(Cohort.created_at.desc())
    result = await db.execute(q)
    rows = result.scalars().all()
    return {"data": [_cohort_dict(r) for r in rows]}


@router.post("/cohorts", status_code=201)
async def create_cohort(
    body: dict,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    user: dict | None = Depends(get_current_user_optional),
):
    obj = Cohort(
        id=uuid4(),
        tenant_id=tenant_id,
        name=body["name"],
        object_type=body.get("object_type", "Store"),
        filter_spec=body.get("filter_spec", {}),
        created_by=user["sub"] if user else None,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return {"data": _cohort_dict(obj)}


@router.get("/cohorts/{cohort_id}/instances")
async def get_cohort_instances(
    cohort_id: UUID,
    as_of: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = await _get_or_404(db, Cohort, cohort_id, tenant_id)
    instances = await evaluate_cohort(db, tenant_id, obj.filter_spec, as_of)
    return {"data": {"cohort_id": str(obj.id), "instance_count": len(instances), "instance_ids": instances}}


@router.post("/cohorts/{cohort_id}/snapshot")
async def snapshot_cohort(
    cohort_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = await _get_or_404(db, Cohort, cohort_id, tenant_id)
    instances = await evaluate_cohort(db, tenant_id, obj.filter_spec)
    obj.instance_count = len(instances)
    obj.snapshot_at = func.now()
    await db.commit()
    await db.refresh(obj)
    return {"data": _cohort_dict(obj)}


# ── Saved Queries ─────────────────────────────────────────

@router.get("/saved-queries")
async def list_saved_queries(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(SavedQuery).where(SavedQuery.tenant_id == tenant_id).order_by(SavedQuery.created_at.desc())
    result = await db.execute(q)
    rows = result.scalars().all()
    return {"data": [_query_dict(r) for r in rows]}


@router.post("/saved-queries", status_code=201)
async def create_saved_query(
    body: dict,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    user: dict | None = Depends(get_current_user_optional),
):
    obj = SavedQuery(
        id=uuid4(),
        tenant_id=tenant_id,
        name=body["name"],
        query_type=body.get("query_type", "ontology"),
        query_spec=body.get("query_spec", {}),
        created_by=user["sub"] if user else None,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return {"data": _query_dict(obj)}


@router.post("/saved-queries/{query_id}/run")
async def run_saved_query(
    query_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    obj = await _get_or_404(db, SavedQuery, query_id, tenant_id)
    # For v1 just mark as run and return stub
    obj.last_run_at = func.now()
    await db.commit()
    await db.refresh(obj)
    return {"data": {"query_id": str(obj.id), "status": "completed", "row_count": obj.row_count or 0}}


# ── Helpers ───────────────────────────────────────────────

async def _get_or_404(db: AsyncSession, model, obj_id: UUID, tenant_id: str):
    q = select(model).where(and_(model.id == obj_id, model.tenant_id == tenant_id))
    result = await db.execute(q)
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail=f"{model.__tablename__} not found")
    return obj


def _parse_date(val):
    if val is None:
        return None
    if isinstance(val, date):
        return val
    return date.fromisoformat(val)


def _analysis_dict(a: Analysis) -> dict:
    return {
        "id": str(a.id), "name": a.name, "description": a.description,
        "owner_user_id": str(a.owner_user_id) if a.owner_user_id else None,
        "visibility": a.visibility, "spec": a.spec,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
    }


def _kpi_dict(k: CustomKPI) -> dict:
    return {
        "id": str(k.id), "api_name": k.api_name, "display_name": k.display_name,
        "formula": k.formula, "target_object_type": k.target_object_type,
        "aggregation_axis": k.aggregation_axis, "filters": k.filters,
        "unit": k.unit, "version": k.version, "status": k.status,
        "created_by": str(k.created_by) if k.created_by else None,
        "created_at": k.created_at.isoformat() if k.created_at else None,
    }


def _cohort_dict(c: Cohort) -> dict:
    return {
        "id": str(c.id), "name": c.name, "object_type": c.object_type,
        "filter_spec": c.filter_spec, "instance_count": c.instance_count,
        "snapshot_at": c.snapshot_at.isoformat() if c.snapshot_at else None,
        "created_by": str(c.created_by) if c.created_by else None,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


def _query_dict(q: SavedQuery) -> dict:
    return {
        "id": str(q.id), "name": q.name, "query_type": q.query_type,
        "query_spec": q.query_spec, "last_run_at": q.last_run_at.isoformat() if q.last_run_at else None,
        "row_count": q.row_count,
        "created_by": str(q.created_by) if q.created_by else None,
        "created_at": q.created_at.isoformat() if q.created_at else None,
    }
