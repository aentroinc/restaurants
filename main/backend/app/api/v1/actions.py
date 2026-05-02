"""Foundry-style Action endpoints under /api/v1/ontology."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_tenant_id
from app.database import get_db
from app.models.ontology_v2 import (
    OntologyAction,
    OntologyActionType,
    OntologyInstance,
    OntologyObjectTypeV2,
)
from app.schemas.common import APIResponse, PaginationMeta
from app.services.action_engine import (
    approve_action,
    bootstrap_standard_actions,
    execute_action,
    list_actions_for_object_type,
)

router = APIRouter(prefix="/api/v1/ontology", tags=["ontology-actions"])


def _serialize_action_type(at: OntologyActionType) -> dict:
    return {
        "id": str(at.id),
        "name": at.name,
        "description": at.description,
        "object_type_id": str(at.object_type_id) if at.object_type_id else None,
        "parameters_schema": at.parameters_json or {},
        "side_effects": at.side_effects_json or {},
        "requires_approval": at.requires_approval,
        "version": at.version,
    }


def _serialize_action(a: OntologyAction) -> dict:
    return {
        "id": str(a.id),
        "action_type_id": str(a.action_type_id),
        "instance_id": str(a.instance_id) if a.instance_id else None,
        "params": a.params_json or {},
        "executed_by": a.executed_by,
        "executed_at": a.executed_at.isoformat() if a.executed_at else None,
        "status": a.status,
        "result": a.result_json or {},
    }


@router.get("/object-types/{type_id}/actions", response_model=APIResponse[list[dict]])
async def list_actions_for_type(
    type_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """List action types available for a given object type (incl. global ones)."""
    # ensure standard actions are bootstrapped at least once
    await bootstrap_standard_actions(db, tenant_id)
    await db.commit()

    types = await list_actions_for_object_type(db, tenant_id, type_id)
    return APIResponse(
        data=[_serialize_action_type(t) for t in types],
        meta={"total": len(types)},
    )


@router.post("/instances/{instance_id}/actions/{action_name}", response_model=APIResponse[dict])
async def execute_action_on_instance(
    instance_id: UUID = Path(...),
    action_name: str = Path(...),
    body: dict = Body(default_factory=dict),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """Execute a named action against an instance."""
    inst = (await db.execute(
        select(OntologyInstance).where(
            OntologyInstance.id == instance_id,
            OntologyInstance.tenant_id == tenant_id,
        )
    )).scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Instance not found")

    # find action type: prefer one bound to this object type, fall back to global
    at = (await db.execute(
        select(OntologyActionType).where(
            OntologyActionType.tenant_id == tenant_id,
            OntologyActionType.name == action_name,
            OntologyActionType.object_type_id == inst.object_type_id,
        )
    )).scalar_one_or_none()
    if at is None:
        at = (await db.execute(
            select(OntologyActionType).where(
                OntologyActionType.tenant_id == tenant_id,
                OntologyActionType.name == action_name,
                OntologyActionType.object_type_id.is_(None),
            )
        )).scalar_one_or_none()
    if at is None:
        # bootstrap globals if missing, then retry
        await bootstrap_standard_actions(db, tenant_id)
        await db.flush()
        at = (await db.execute(
            select(OntologyActionType).where(
                OntologyActionType.tenant_id == tenant_id,
                OntologyActionType.name == action_name,
                OntologyActionType.object_type_id.is_(None),
            )
        )).scalar_one_or_none()
    if at is None:
        raise HTTPException(status_code=404, detail=f"Action '{action_name}' not registered")

    params = body.get("params") if isinstance(body, dict) and "params" in body else (body or {})
    user = body.get("user") if isinstance(body, dict) else None

    try:
        result = await execute_action(
            db=db,
            tenant_id=tenant_id,
            action_type_id=at.id,
            instance_id=instance_id,
            params=params,
            user=user,
        )
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=422, detail=str(e))

    await db.commit()
    return APIResponse(data=result)


@router.get("/actions", response_model=APIResponse[list[dict]])
async def list_actions(
    instance_id: str | None = Query(None),
    action_type_id: str | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """List action execution history for the tenant."""
    q = select(OntologyAction).where(OntologyAction.tenant_id == tenant_id)
    if instance_id:
        q = q.where(OntologyAction.instance_id == UUID(instance_id))
    if action_type_id:
        q = q.where(OntologyAction.action_type_id == UUID(action_type_id))
    if status:
        q = q.where(OntologyAction.status == status)

    res = await db.execute(
        q.order_by(OntologyAction.executed_at.desc())
        .limit(page_size).offset((page - 1) * page_size)
    )
    rows = res.scalars().all()
    return APIResponse(
        data=[_serialize_action(a) for a in rows],
        meta=PaginationMeta(
            total=len(rows), page=page, page_size=page_size,
            total_pages=max(1, (len(rows) + page_size - 1) // page_size),
        ).model_dump(),
    )


@router.post("/actions/{action_id}/approve", response_model=APIResponse[dict])
async def approve_action_endpoint(
    action_id: UUID = Path(...),
    body: dict = Body(default_factory=dict),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """Approve or reject a pending action."""
    try:
        result = await approve_action(
            db=db,
            tenant_id=tenant_id,
            action_id=action_id,
            user=body.get("user"),
            approved=body.get("approved", True),
        )
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=404, detail=str(e))
    await db.commit()
    return APIResponse(data=result)
