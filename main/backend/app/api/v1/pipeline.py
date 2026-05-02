"""Pipeline Builder REST API.

Endpoints:
  GET/POST   /api/v1/pipelines
  GET/PUT    /api/v1/pipelines/{id}
  POST       /api/v1/pipelines/{id}/run?branch=main
  GET        /api/v1/pipelines/{id}/runs
  GET        /api/v1/pipelines/runs/{run_id}
  POST/GET   /api/v1/pipelines/{id}/branches
  POST       /api/v1/pipelines/{id}/merge
  POST/GET/DELETE /api/v1/pipelines/{id}/schedules
"""
from __future__ import annotations

import uuid as uuid_mod
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_tenant_id
from app.database import get_db
from app.middleware.audit import log_audit
from app.models.pipeline import (
    Pipeline,
    PipelineBranch,
    PipelineNodeRun,
    PipelineRun,
    PipelineSchedule,
)
from app.schemas.common import APIResponse
from app.services.pipeline_branch import (
    create_branch as _create_branch,
    get_branch as _get_branch,
    list_branches as _list_branches,
    merge_branch as _merge_branch,
    update_branch_definition as _update_branch_definition,
)
from app.services.pipeline_dag import execute_pipeline, topo_sort
from app.services.pipeline_scheduler import (
    get_next_run_at,
    register_schedule,
    unregister_schedule,
)

router = APIRouter(prefix="/api/v1/pipelines", tags=["pipelines"])


# ---------------------------------------------------------------------------
# Serializers
# ---------------------------------------------------------------------------

def _ser_pipeline(p: Pipeline) -> dict[str, Any]:
    return {
        "id": str(p.id),
        "tenant_id": str(p.tenant_id),
        "name": p.name,
        "definition_json": p.definition_json,
        "branch_name": p.branch_name,
        "version": p.version,
        "created_by": p.created_by,
        "status": p.status,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


def _ser_run(r: PipelineRun) -> dict[str, Any]:
    return {
        "id": str(r.id),
        "pipeline_id": str(r.pipeline_id),
        "branch_name": r.branch_name,
        "status": r.status,
        "started_at": r.started_at.isoformat() if r.started_at else None,
        "finished_at": r.finished_at.isoformat() if r.finished_at else None,
        "triggered_by": r.triggered_by,
        "log_jsonb": r.log_jsonb,
    }


def _ser_node_run(n: PipelineNodeRun) -> dict[str, Any]:
    return {
        "id": str(n.id),
        "pipeline_run_id": str(n.pipeline_run_id),
        "node_id": n.node_id,
        "status": n.status,
        "input_dataset_ids": n.input_dataset_ids,
        "output_dataset_ids": n.output_dataset_ids,
        "started_at": n.started_at.isoformat() if n.started_at else None,
        "finished_at": n.finished_at.isoformat() if n.finished_at else None,
        "error": n.error,
    }


def _ser_branch(b: PipelineBranch) -> dict[str, Any]:
    return {
        "id": str(b.id),
        "pipeline_id": str(b.pipeline_id),
        "name": b.name,
        "base_branch": b.base_branch,
        "created_from_run_id": str(b.created_from_run_id) if b.created_from_run_id else None,
        "status": b.status,
        "definition_json": b.definition_json,
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "merged_at": b.merged_at.isoformat() if b.merged_at else None,
    }


def _ser_schedule(s: PipelineSchedule) -> dict[str, Any]:
    return {
        "id": str(s.id),
        "pipeline_id": str(s.pipeline_id),
        "cron_expr": s.cron_expr,
        "branch_name": s.branch_name,
        "enabled": s.enabled,
        "next_run_at": s.next_run_at.isoformat() if s.next_run_at else None,
        "last_run_at": s.last_run_at.isoformat() if s.last_run_at else None,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


# ---------------------------------------------------------------------------
# Pipeline CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=APIResponse[list[dict]])
async def list_pipelines(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    rows = (await db.execute(
        select(Pipeline).where(Pipeline.tenant_id == tenant_id).order_by(Pipeline.created_at.desc())
    )).scalars().all()
    return APIResponse(data=[_ser_pipeline(p) for p in rows], meta={"total": len(rows)})


@router.post("", response_model=APIResponse[dict])
async def create_pipeline(
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    name = body.get("name")
    if not name:
        raise HTTPException(status_code=422, detail="name required")
    definition = body.get("definition_json") or {"nodes": [], "edges": []}
    # validate DAG shape early
    try:
        topo_sort(definition.get("nodes") or [], definition.get("edges") or [])
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"invalid DAG: {e}")

    p = Pipeline(
        id=uuid_mod.uuid4(),
        tenant_id=UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
        name=name,
        definition_json=definition,
        branch_name=body.get("branch_name", "main"),
        version=int(body.get("version", 1)),
        created_by=body.get("created_by"),
        status="active",
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    log_audit(
        tenant_id=tenant_id, user_id=body.get("created_by"),
        action="pipeline_create", resource_type="pipeline",
        resource_id=str(p.id), metadata={"name": name},
    )
    return APIResponse(data=_ser_pipeline(p))


@router.get("/{pipeline_id}", response_model=APIResponse[dict])
async def get_pipeline(
    pipeline_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    p = (await db.execute(
        select(Pipeline).where(Pipeline.id == pipeline_id, Pipeline.tenant_id == tenant_id)
    )).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="pipeline not found")
    return APIResponse(data=_ser_pipeline(p))


@router.put("/{pipeline_id}", response_model=APIResponse[dict])
async def update_pipeline(
    pipeline_id: UUID = Path(...),
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    p = (await db.execute(
        select(Pipeline).where(Pipeline.id == pipeline_id, Pipeline.tenant_id == tenant_id)
    )).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="pipeline not found")
    if "name" in body:
        p.name = body["name"]
    if "definition_json" in body:
        defn = body["definition_json"] or {}
        try:
            topo_sort(defn.get("nodes") or [], defn.get("edges") or [])
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"invalid DAG: {e}")
        p.definition_json = defn
        p.version = (p.version or 1) + 1
    if "status" in body:
        p.status = body["status"]
    await db.commit()
    await db.refresh(p)
    log_audit(
        tenant_id=tenant_id, user_id=body.get("user"),
        action="pipeline_update", resource_type="pipeline",
        resource_id=str(p.id), metadata={"version": p.version},
    )
    return APIResponse(data=_ser_pipeline(p))


# ---------------------------------------------------------------------------
# Run / Runs
# ---------------------------------------------------------------------------

@router.post("/{pipeline_id}/run", response_model=APIResponse[dict])
async def run_pipeline(
    pipeline_id: UUID = Path(...),
    branch: str = Query("main"),
    body: dict = Body(default_factory=dict),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    p = (await db.execute(
        select(Pipeline).where(Pipeline.id == pipeline_id, Pipeline.tenant_id == tenant_id)
    )).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="pipeline not found")
    triggered_by = body.get("triggered_by", "manual")
    try:
        result = await execute_pipeline(
            db=db,
            pipeline_id=pipeline_id,
            branch=branch,
            triggered_by=triggered_by,
            ctx=body.get("ctx") or {},
        )
    except Exception as e:  # noqa: BLE001
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    await db.commit()
    return APIResponse(data=result)


@router.get("/{pipeline_id}/runs", response_model=APIResponse[list[dict]])
async def list_runs(
    pipeline_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    p = (await db.execute(
        select(Pipeline).where(Pipeline.id == pipeline_id, Pipeline.tenant_id == tenant_id)
    )).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="pipeline not found")
    rows = (await db.execute(
        select(PipelineRun).where(PipelineRun.pipeline_id == pipeline_id)
        .order_by(PipelineRun.started_at.desc().nullslast())
    )).scalars().all()
    return APIResponse(data=[_ser_run(r) for r in rows], meta={"total": len(rows)})


@router.get("/runs/{run_id}", response_model=APIResponse[dict])
async def get_run(
    run_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    run = (await db.execute(
        select(PipelineRun).where(PipelineRun.id == run_id)
    )).scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=404, detail="run not found")
    # verify tenant ownership through pipeline
    p = (await db.execute(
        select(Pipeline).where(Pipeline.id == run.pipeline_id, Pipeline.tenant_id == tenant_id)
    )).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="run not found")
    nodes = (await db.execute(
        select(PipelineNodeRun).where(PipelineNodeRun.pipeline_run_id == run_id)
    )).scalars().all()
    data = _ser_run(run)
    data["node_runs"] = [_ser_node_run(n) for n in nodes]
    return APIResponse(data=data)


# ---------------------------------------------------------------------------
# Branches
# ---------------------------------------------------------------------------

@router.get("/{pipeline_id}/branches", response_model=APIResponse[list[dict]])
async def list_branches(
    pipeline_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    p = (await db.execute(
        select(Pipeline).where(Pipeline.id == pipeline_id, Pipeline.tenant_id == tenant_id)
    )).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="pipeline not found")
    rows = await _list_branches(db, pipeline_id)
    return APIResponse(data=[_ser_branch(b) for b in rows], meta={"total": len(rows)})


@router.post("/{pipeline_id}/branches", response_model=APIResponse[dict])
async def create_branch(
    pipeline_id: UUID = Path(...),
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    p = (await db.execute(
        select(Pipeline).where(Pipeline.id == pipeline_id, Pipeline.tenant_id == tenant_id)
    )).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="pipeline not found")
    name = body.get("name")
    if not name:
        raise HTTPException(status_code=422, detail="name required")
    try:
        branch = await _create_branch(
            db=db,
            pipeline_id=pipeline_id,
            name=name,
            base=body.get("base", "main"),
            created_from_run_id=UUID(body["created_from_run_id"]) if body.get("created_from_run_id") else None,
            user=body.get("user"),
        )
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=409, detail=str(e))
    await db.commit()
    return APIResponse(data=_ser_branch(branch))


@router.put("/{pipeline_id}/branches/{branch_id}", response_model=APIResponse[dict])
async def update_branch(
    pipeline_id: UUID = Path(...),
    branch_id: UUID = Path(...),
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    defn = body.get("definition_json")
    if defn is None:
        raise HTTPException(status_code=422, detail="definition_json required")
    try:
        topo_sort(defn.get("nodes") or [], defn.get("edges") or [])
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"invalid DAG: {e}")
    try:
        branch = await _update_branch_definition(db, branch_id, defn, user=body.get("user"))
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    await db.commit()
    return APIResponse(data=_ser_branch(branch))


@router.post("/{pipeline_id}/merge", response_model=APIResponse[dict])
async def merge_branch_endpoint(
    pipeline_id: UUID = Path(...),
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    p = (await db.execute(
        select(Pipeline).where(Pipeline.id == pipeline_id, Pipeline.tenant_id == tenant_id)
    )).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="pipeline not found")
    branch_id = body.get("branch_id")
    if not branch_id:
        raise HTTPException(status_code=422, detail="branch_id required")
    try:
        result = await _merge_branch(
            db=db,
            branch_id=UUID(branch_id),
            into=body.get("into", "main"),
            user=body.get("user"),
        )
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    await db.commit()
    return APIResponse(data=result)


# ---------------------------------------------------------------------------
# Schedules
# ---------------------------------------------------------------------------

@router.get("/{pipeline_id}/schedules", response_model=APIResponse[list[dict]])
async def list_schedules(
    pipeline_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    p = (await db.execute(
        select(Pipeline).where(Pipeline.id == pipeline_id, Pipeline.tenant_id == tenant_id)
    )).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="pipeline not found")
    rows = (await db.execute(
        select(PipelineSchedule).where(PipelineSchedule.pipeline_id == pipeline_id)
    )).scalars().all()
    return APIResponse(data=[_ser_schedule(s) for s in rows], meta={"total": len(rows)})


@router.post("/{pipeline_id}/schedules", response_model=APIResponse[dict])
async def create_schedule(
    pipeline_id: UUID = Path(...),
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    p = (await db.execute(
        select(Pipeline).where(Pipeline.id == pipeline_id, Pipeline.tenant_id == tenant_id)
    )).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="pipeline not found")
    cron_expr = body.get("cron_expr")
    if not cron_expr:
        raise HTTPException(status_code=422, detail="cron_expr required")

    sch = PipelineSchedule(
        id=uuid_mod.uuid4(),
        pipeline_id=pipeline_id,
        cron_expr=cron_expr,
        branch_name=body.get("branch_name", "main"),
        enabled=bool(body.get("enabled", True)),
    )
    db.add(sch)
    await db.commit()
    await db.refresh(sch)

    if sch.enabled:
        ok = register_schedule(str(sch.id), cron_expr)
        if ok:
            nxt = get_next_run_at(str(sch.id))
            if nxt:
                sch.next_run_at = nxt
                await db.commit()
                await db.refresh(sch)

    log_audit(
        tenant_id=tenant_id, user_id=body.get("user"),
        action="pipeline_schedule_create", resource_type="pipeline_schedule",
        resource_id=str(sch.id),
        metadata={"pipeline_id": str(pipeline_id), "cron": cron_expr},
    )
    return APIResponse(data=_ser_schedule(sch))


@router.delete("/{pipeline_id}/schedules/{schedule_id}", response_model=APIResponse[dict])
async def delete_schedule(
    pipeline_id: UUID = Path(...),
    schedule_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    p = (await db.execute(
        select(Pipeline).where(Pipeline.id == pipeline_id, Pipeline.tenant_id == tenant_id)
    )).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="pipeline not found")
    sch = (await db.execute(
        select(PipelineSchedule).where(
            PipelineSchedule.id == schedule_id,
            PipelineSchedule.pipeline_id == pipeline_id,
        )
    )).scalar_one_or_none()
    if sch is None:
        raise HTTPException(status_code=404, detail="schedule not found")
    unregister_schedule(str(sch.id))
    await db.delete(sch)
    await db.commit()
    log_audit(
        tenant_id=tenant_id, user_id=None,
        action="pipeline_schedule_delete", resource_type="pipeline_schedule",
        resource_id=str(schedule_id),
        metadata={"pipeline_id": str(pipeline_id)},
    )
    return APIResponse(data={"deleted": True, "id": str(schedule_id)})
