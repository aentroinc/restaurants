"""Foundry-style ontology branch endpoints under /api/v1/ontology/branches."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Path
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_tenant_id
from app.database import get_db
from app.schemas.common import APIResponse
from app.services.ontology_branch import (
    OntologyBranch,
    commit_to_branch,
    create_branch,
    diff_branches,
    get_branch,
    list_branches,
    list_snapshots,
    merge_branch,
)

router = APIRouter(prefix="/api/v1/ontology", tags=["ontology-branches"])


def _serialize_branch(b: OntologyBranch) -> dict:
    return {
        "id": str(b.id),
        "name": b.name,
        "base_branch": b.base_branch,
        "status": b.status,
        "created_by": b.created_by,
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "merged_at": b.merged_at.isoformat() if b.merged_at else None,
    }


@router.get("/branches", response_model=APIResponse[list[dict]])
async def list_branches_endpoint(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    branches = await list_branches(db, tenant_id)
    return APIResponse(
        data=[_serialize_branch(b) for b in branches],
        meta={"total": len(branches)},
    )


@router.post("/branches", response_model=APIResponse[dict])
async def create_branch_endpoint(
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    name = body.get("name")
    if not name:
        raise HTTPException(status_code=422, detail="name required")
    try:
        branch = await create_branch(
            db=db,
            tenant_id=tenant_id,
            name=name,
            base=body.get("base_branch", "main"),
            created_by=body.get("created_by"),
        )
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=409, detail=str(e))
    await db.commit()
    return APIResponse(data=_serialize_branch(branch))


@router.get("/branches/{branch_id}", response_model=APIResponse[dict])
async def get_branch_endpoint(
    branch_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    branch = await get_branch(db, tenant_id, branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail="branch not found")
    snaps = await list_snapshots(db, branch_id)
    data = _serialize_branch(branch)
    data["snapshots"] = [
        {
            "id": str(s.id),
            "object_type_id": str(s.object_type_id),
            "version": s.version,
            "snapshot_json": s.snapshot_json,
        }
        for s in snaps
    ]
    return APIResponse(data=data)


@router.post("/branches/{branch_id}/commit", response_model=APIResponse[dict])
async def commit_branch_endpoint(
    branch_id: UUID = Path(...),
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    object_type_id = body.get("object_type_id")
    new_def = body.get("snapshot_json") or body.get("new_def")
    if not object_type_id or new_def is None:
        raise HTTPException(status_code=422, detail="object_type_id and snapshot_json required")
    try:
        snap = await commit_to_branch(
            db=db,
            tenant_id=tenant_id,
            branch_id=branch_id,
            object_type_id=UUID(object_type_id),
            new_def=new_def,
            user=body.get("user"),
        )
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    await db.commit()
    return APIResponse(data={
        "id": str(snap.id),
        "branch_id": str(snap.branch_id),
        "object_type_id": str(snap.object_type_id),
        "version": snap.version,
        "snapshot_json": snap.snapshot_json,
    })


@router.post("/branches/{branch_id}/merge", response_model=APIResponse[dict])
async def merge_branch_endpoint(
    branch_id: UUID = Path(...),
    body: dict = Body(default_factory=dict),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    try:
        result = await merge_branch(
            db=db,
            tenant_id=tenant_id,
            branch_id=branch_id,
            into=body.get("into", "main"),
            user=body.get("user"),
        )
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    await db.commit()
    return APIResponse(data=result)


@router.get("/branches/{branch_a}/diff/{branch_b}", response_model=APIResponse[dict])
async def diff_branches_endpoint(
    branch_a: UUID = Path(...),
    branch_b: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    try:
        diff = await diff_branches(db, tenant_id, branch_a, branch_b)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return APIResponse(data=diff)
