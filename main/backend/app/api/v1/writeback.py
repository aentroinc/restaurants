from fastapi import APIRouter, Depends, Query, Path, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID, uuid4
from datetime import datetime, timezone
from app.database import get_db
from app.models.writeback import WritebackPolicy, WritebackRequest
from app.models.task import Task
from app.schemas.common import APIResponse, PaginationMeta
from app.auth import get_tenant_id, require_role

router = APIRouter(prefix="/api/v1/writeback", tags=["writeback"])


def _policy_to_dict(p: WritebackPolicy) -> dict:
    return {
        "id": str(p.id),
        "action_type": p.action_type,
        "policy_name": p.policy_name,
        "requires_approval": p.requires_approval,
        "allowed_roles": p.allowed_roles,
        "allowed_object_types": p.allowed_object_types,
        "external_write_enabled": p.external_write_enabled,
        "status": p.status,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


def _request_to_dict(r: WritebackRequest) -> dict:
    return {
        "id": str(r.id),
        "action_type": r.action_type,
        "display_name": r.display_name,
        "requested_by": str(r.requested_by) if r.requested_by else None,
        "target_object_type": r.target_object_type,
        "target_object_id": str(r.target_object_id) if r.target_object_id else None,
        "payload": r.payload,
        "status": r.status,
        "approved_by": str(r.approved_by) if r.approved_by else None,
        "approved_at": r.approved_at.isoformat() if r.approved_at else None,
        "executed_at": r.executed_at.isoformat() if r.executed_at else None,
        "rollback_payload": r.rollback_payload,
        "result": r.result,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@router.get("/policies", response_model=APIResponse[list[dict]])
async def list_policies(db: AsyncSession = Depends(get_db), tenant_id: str = Depends(get_tenant_id)):
    result = await db.execute(
        select(WritebackPolicy).where(WritebackPolicy.tenant_id == tenant_id)
    )
    policies = [_policy_to_dict(p) for p in result.scalars().all()]
    return APIResponse(data=policies, meta={"total": len(policies)})


@router.get("/requests", response_model=APIResponse[list[dict]])
async def list_requests(
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(WritebackRequest).where(WritebackRequest.tenant_id == tenant_id)
    if status:
        q = q.where(WritebackRequest.status == status)
    q = q.order_by(WritebackRequest.created_at.desc())

    # Count total
    from sqlalchemy import func
    count_q = select(func.count(WritebackRequest.id)).where(WritebackRequest.tenant_id == tenant_id)
    if status:
        count_q = count_q.where(WritebackRequest.status == status)
    total_result = await db.execute(count_q)
    total = total_result.scalar() or 0

    offset = (page - 1) * page_size
    q = q.offset(offset).limit(page_size)
    result = await db.execute(q)
    requests = [_request_to_dict(r) for r in result.scalars().all()]

    meta = PaginationMeta(total=total, page=page, page_size=page_size, total_pages=max(1, (total + page_size - 1) // page_size))
    return APIResponse(data=requests, meta=meta.model_dump())


@router.post("/requests", response_model=APIResponse[dict])
async def create_request(body: dict = Body(...), db: AsyncSession = Depends(get_db), tenant_id: str = Depends(get_tenant_id), _user=Depends(require_role("admin", "director", "sv"))):
    new_req = WritebackRequest(
        tenant_id=tenant_id,
        action_type=body.get("action_type", body.get("policy_action", "task_create")),
        display_name=body.get("display_name", "新規リクエスト"),
        requested_by=UUID(body["requested_by"]) if body.get("requested_by") and body["requested_by"] != "ai_engine" else None,
        target_object_type=body.get("target_object_type", "task"),
        target_object_id=UUID(body["target_object_id"]) if body.get("target_object_id") else None,
        payload=body.get("payload", {}),
        status="pending",
    )
    db.add(new_req)
    await db.commit()
    await db.refresh(new_req)
    return APIResponse(data=_request_to_dict(new_req))


@router.post("/requests/{request_id}/approve", response_model=APIResponse[dict])
async def approve_request(request_id: UUID = Path(...), db: AsyncSession = Depends(get_db), tenant_id: str = Depends(get_tenant_id)):
    result = await db.execute(
        select(WritebackRequest).where(
            WritebackRequest.id == request_id,
            WritebackRequest.tenant_id == tenant_id,
        )
    )
    req = result.scalar_one_or_none()
    if not req:
        return APIResponse(errors=[{"detail": "Request not found"}])

    req.status = "approved"
    req.approved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(req)
    return APIResponse(data=_request_to_dict(req))


@router.post("/requests/{request_id}/execute", response_model=APIResponse[dict])
async def execute_request(request_id: UUID = Path(...), db: AsyncSession = Depends(get_db), tenant_id: str = Depends(get_tenant_id)):
    result = await db.execute(
        select(WritebackRequest).where(
            WritebackRequest.id == request_id,
            WritebackRequest.tenant_id == tenant_id,
        )
    )
    req = result.scalar_one_or_none()
    if not req:
        return APIResponse(errors=[{"detail": "Request not found"}])

    execution_result = {"success": True, "message": "正常に実行されました"}

    # Actually execute the action based on action_type
    if req.action_type == "task_create":
        payload = req.payload or {}
        store_id = payload.get("store_id")
        if store_id:
            try:
                store_uuid = UUID(store_id) if isinstance(store_id, str) else store_id
            except (ValueError, AttributeError):
                store_uuid = None

            if store_uuid:
                task = Task(
                    tenant_id=tenant_id,
                    store_id=store_uuid,
                    title=payload.get("title", "Writeback生成タスク"),
                    description=payload.get("description"),
                    issue_type=payload.get("issue_type"),
                    priority=payload.get("priority", "medium"),
                    source="writeback",
                    status="open",
                )
                db.add(task)
                await db.flush()
                execution_result["task_id"] = str(task.id)
                execution_result["message"] = f"タスク '{task.title}' を作成しました"

    req.status = "executed"
    req.executed_at = datetime.now(timezone.utc)
    req.result = execution_result
    await db.commit()
    await db.refresh(req)
    return APIResponse(data=_request_to_dict(req))
