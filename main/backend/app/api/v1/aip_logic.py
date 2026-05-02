"""AIP Logic REST API.

Endpoints:
  GET    /api/v1/aip-logic/functions
  POST   /api/v1/aip-logic/functions
  GET    /api/v1/aip-logic/functions/{id}
  PUT    /api/v1/aip-logic/functions/{id}
  DELETE /api/v1/aip-logic/functions/{id}
  POST   /api/v1/aip-logic/functions/{id}/test     (dry-run)
  POST   /api/v1/aip-logic/functions/{id}/run      (manual)
  GET    /api/v1/aip-logic/functions/{id}/runs
"""
from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_tenant_id
from app.database import get_db
from app.models.aip_logic import LogicFunction, LogicRun
from app.schemas.common import APIResponse
from app.services.aip_logic_engine import evaluate_predicate, run_function
from app.services.anomaly_detector import register_cron_function, unregister_cron_function

router = APIRouter(prefix="/api/v1/aip-logic", tags=["aip-logic"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class FunctionPayload(BaseModel):
    name: str
    description: str | None = None
    trigger_json: dict | None = None
    predicate_json: dict | None = None
    actions_json: list | None = None
    enabled: bool = True


class TestPayload(BaseModel):
    context: dict[str, Any] | None = None


class RunPayload(BaseModel):
    trigger_payload: dict[str, Any] | None = None


# ---------------------------------------------------------------------------
# Serializers
# ---------------------------------------------------------------------------

def _ser_fn(f: LogicFunction) -> dict[str, Any]:
    return {
        "id": str(f.id),
        "tenant_id": str(f.tenant_id),
        "name": f.name,
        "description": f.description,
        "trigger_json": f.trigger_json or {},
        "predicate_json": f.predicate_json or {},
        "actions_json": f.actions_json or [],
        "enabled": f.enabled,
        "created_by": f.created_by,
        "created_at": f.created_at.isoformat() if f.created_at else None,
        "updated_at": f.updated_at.isoformat() if f.updated_at else None,
    }


def _ser_run(r: LogicRun) -> dict[str, Any]:
    return {
        "id": str(r.id),
        "function_id": str(r.function_id),
        "triggered_at": r.triggered_at.isoformat() if r.triggered_at else None,
        "trigger_payload_json": r.trigger_payload_json or {},
        "predicate_result": r.predicate_result,
        "actions_executed_json": r.actions_executed_json or [],
        "status": r.status,
        "error": r.error,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/functions", response_model=APIResponse[list[dict]])
async def list_functions(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    rows = (await db.execute(
        select(LogicFunction).where(LogicFunction.tenant_id == tenant_id).order_by(LogicFunction.created_at.desc())
    )).scalars().all()
    return APIResponse(data=[_ser_fn(r) for r in rows])


@router.post("/functions", response_model=APIResponse[dict])
async def create_function(
    body: FunctionPayload,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    fn = LogicFunction(
        tenant_id=UUID(tenant_id),
        name=body.name,
        description=body.description,
        trigger_json=body.trigger_json or {},
        predicate_json=body.predicate_json or {},
        actions_json=body.actions_json or [],
        enabled=body.enabled,
    )
    db.add(fn)
    await db.flush()

    # Register cron trigger if applicable
    trig = fn.trigger_json or {}
    if (trig.get("type") or "").lower() == "cron":
        cron = (trig.get("config") or {}).get("cron")
        if cron and fn.enabled:
            register_cron_function(str(fn.id), cron)

    await db.commit()
    return APIResponse(data=_ser_fn(fn))


@router.get("/functions/{fn_id}", response_model=APIResponse[dict])
async def get_function(
    fn_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    fn = (await db.execute(
        select(LogicFunction).where(LogicFunction.id == fn_id, LogicFunction.tenant_id == tenant_id)
    )).scalar_one_or_none()
    if fn is None:
        raise HTTPException(status_code=404, detail="function not found")
    return APIResponse(data=_ser_fn(fn))


@router.put("/functions/{fn_id}", response_model=APIResponse[dict])
async def update_function(
    fn_id: UUID,
    body: FunctionPayload,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    fn = (await db.execute(
        select(LogicFunction).where(LogicFunction.id == fn_id, LogicFunction.tenant_id == tenant_id)
    )).scalar_one_or_none()
    if fn is None:
        raise HTTPException(status_code=404, detail="function not found")

    fn.name = body.name
    fn.description = body.description
    fn.trigger_json = body.trigger_json or {}
    fn.predicate_json = body.predicate_json or {}
    fn.actions_json = body.actions_json or []
    fn.enabled = body.enabled

    # Re-register cron if changed
    unregister_cron_function(str(fn.id))
    trig = fn.trigger_json or {}
    if (trig.get("type") or "").lower() == "cron" and fn.enabled:
        cron = (trig.get("config") or {}).get("cron")
        if cron:
            register_cron_function(str(fn.id), cron)

    await db.commit()
    return APIResponse(data=_ser_fn(fn))


@router.delete("/functions/{fn_id}", response_model=APIResponse[dict])
async def delete_function(
    fn_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    fn = (await db.execute(
        select(LogicFunction).where(LogicFunction.id == fn_id, LogicFunction.tenant_id == tenant_id)
    )).scalar_one_or_none()
    if fn is None:
        raise HTTPException(status_code=404, detail="function not found")
    unregister_cron_function(str(fn.id))
    await db.delete(fn)
    await db.commit()
    return APIResponse(data={"deleted": str(fn_id)})


@router.post("/functions/{fn_id}/test", response_model=APIResponse[dict])
async def test_function(
    fn_id: UUID,
    body: TestPayload = Body(default_factory=TestPayload),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    fn = (await db.execute(
        select(LogicFunction).where(LogicFunction.id == fn_id, LogicFunction.tenant_id == tenant_id)
    )).scalar_one_or_none()
    if fn is None:
        raise HTTPException(status_code=404, detail="function not found")
    payload = body.context or {}
    # dry-run shows predicate result but doesn't persist run / mutate side effects beyond DB flush
    predicate_ok = evaluate_predicate(fn.predicate_json, {**payload, "tenant_id": tenant_id, "kpi": payload.get("kpi", {})})
    return APIResponse(data={
        "function_id": str(fn.id),
        "predicate_result": predicate_ok,
        "would_execute_actions": [a.get("type") for a in (fn.actions_json or [])] if predicate_ok else [],
        "context_used": payload,
    })


@router.post("/functions/{fn_id}/run", response_model=APIResponse[dict])
async def run_now(
    fn_id: UUID,
    body: RunPayload = Body(default_factory=RunPayload),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    fn = (await db.execute(
        select(LogicFunction).where(LogicFunction.id == fn_id, LogicFunction.tenant_id == tenant_id)
    )).scalar_one_or_none()
    if fn is None:
        raise HTTPException(status_code=404, detail="function not found")
    result = await run_function(db, fn.id, trigger_payload=body.trigger_payload or {"type": "manual"})
    await db.commit()
    return APIResponse(data=result)


@router.get("/functions/{fn_id}/runs", response_model=APIResponse[list[dict]])
async def list_runs(
    fn_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    fn = (await db.execute(
        select(LogicFunction).where(LogicFunction.id == fn_id, LogicFunction.tenant_id == tenant_id)
    )).scalar_one_or_none()
    if fn is None:
        raise HTTPException(status_code=404, detail="function not found")
    rows = (await db.execute(
        select(LogicRun).where(LogicRun.function_id == fn.id).order_by(LogicRun.triggered_at.desc()).limit(100)
    )).scalars().all()
    return APIResponse(data=[_ser_run(r) for r in rows])
