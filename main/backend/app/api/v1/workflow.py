from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from uuid import UUID
from app.database import get_db
from app.models.workflow import WorkflowTemplate, WorkflowInstance, WorkflowEvent
from app.models.task import Task
from app.models.store import Store
from app.schemas.common import APIResponse, PaginationMeta
from app.schemas.workflow import (
    WorkflowTemplateResponse, WorkflowInstanceResponse, WorkflowInstanceListItem,
    WorkflowEventResponse, EvaluateResponse, WorkflowSummaryResponse,
)
from app.auth import get_tenant_id
from app.services.workflow_engine import (
    evaluate_workflows_async, advance_workflow, complete_workflow, get_workflow_status,
)

router = APIRouter(prefix="/api/v1/workflows", tags=["workflows"])


@router.post("/evaluate", response_model=APIResponse[EvaluateResponse])
async def evaluate(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    result = await evaluate_workflows_async(db, tenant_id)
    return APIResponse(data=EvaluateResponse(**result))


@router.get("/instances", response_model=APIResponse[list[WorkflowInstanceListItem]])
async def list_instances(
    status: str | None = Query(None),
    template_id: UUID | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = (
        select(
            WorkflowInstance,
            WorkflowTemplate.name.label("template_name"),
            Store.name.label("store_name"),
        )
        .join(WorkflowTemplate, WorkflowTemplate.id == WorkflowInstance.template_id)
        .outerjoin(Store, Store.id == WorkflowInstance.related_object_id)
        .where(WorkflowInstance.tenant_id == tenant_id)
    )
    count_q = select(func.count(WorkflowInstance.id)).where(WorkflowInstance.tenant_id == tenant_id)

    if status:
        q = q.where(WorkflowInstance.status == status)
        count_q = count_q.where(WorkflowInstance.status == status)
    if template_id:
        q = q.where(WorkflowInstance.template_id == template_id)
        count_q = count_q.where(WorkflowInstance.template_id == template_id)

    total = (await db.execute(count_q)).scalar() or 0
    q = q.order_by(WorkflowInstance.started_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)

    items = []
    for row in result.all():
        wi = row[0]
        # Count events and tasks inline
        ev_count = (await db.execute(
            select(func.count(WorkflowEvent.id)).where(WorkflowEvent.workflow_instance_id == wi.id)
        )).scalar() or 0
        tk_count = (await db.execute(
            select(func.count(Task.id)).where(Task.related_workflow_id == wi.id)
        )).scalar() or 0
        items.append(WorkflowInstanceListItem(
            id=wi.id,
            template_id=wi.template_id,
            template_name=row[1],
            related_object_id=wi.related_object_id,
            store_name=row[2],
            status=wi.status,
            current_step=wi.current_step,
            started_at=wi.started_at,
            completed_at=wi.completed_at,
            event_count=ev_count,
            task_count=tk_count,
        ))

    meta = PaginationMeta(total=total, page=page, page_size=page_size, total_pages=(total + page_size - 1) // page_size)
    return APIResponse(data=items, meta=meta.model_dump())


@router.get("/instances/{instance_id}", response_model=APIResponse[WorkflowInstanceResponse])
async def get_instance(
    instance_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    result = await db.execute(
        select(
            WorkflowInstance,
            WorkflowTemplate.name.label("template_name"),
            Store.name.label("store_name"),
        )
        .join(WorkflowTemplate, WorkflowTemplate.id == WorkflowInstance.template_id)
        .outerjoin(Store, Store.id == WorkflowInstance.related_object_id)
        .where(and_(WorkflowInstance.id == instance_id, WorkflowInstance.tenant_id == tenant_id))
    )
    row = result.one_or_none()
    if not row:
        return APIResponse(errors=[{"detail": "Workflow instance not found"}])

    wi = row[0]

    # Load events
    events_result = await db.execute(
        select(WorkflowEvent)
        .where(WorkflowEvent.workflow_instance_id == wi.id)
        .order_by(WorkflowEvent.created_at)
    )
    events = [
        WorkflowEventResponse(
            id=e.id, event_type=e.event_type, actor_id=e.actor_id,
            payload=e.payload, created_at=e.created_at,
        )
        for e in events_result.scalars().all()
    ]

    # Load related tasks
    tasks_result = await db.execute(
        select(Task).where(Task.related_workflow_id == wi.id)
    )
    tasks = [
        {"id": str(t.id), "title": t.title, "status": t.status, "priority": t.priority, "issue_type": t.issue_type}
        for t in tasks_result.scalars().all()
    ]

    return APIResponse(data=WorkflowInstanceResponse(
        id=wi.id,
        template_id=wi.template_id,
        template_name=row[1],
        related_object_type=wi.related_object_type,
        related_object_id=wi.related_object_id,
        store_name=row[2],
        status=wi.status,
        current_step=wi.current_step,
        started_at=wi.started_at,
        completed_at=wi.completed_at,
        events=events,
        tasks=tasks,
    ))


@router.post("/instances/{instance_id}/advance", response_model=APIResponse[dict])
async def advance_instance(
    instance_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    result = await advance_workflow(db, str(instance_id))
    if "error" in result:
        return APIResponse(errors=[{"detail": result["error"]}])
    return APIResponse(data=result)


@router.post("/instances/{instance_id}/complete", response_model=APIResponse[dict])
async def complete_instance(
    instance_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    result = await complete_workflow(db, str(instance_id))
    if "error" in result:
        return APIResponse(errors=[{"detail": result["error"]}])
    return APIResponse(data=result)


@router.get("/templates", response_model=APIResponse[list[WorkflowTemplateResponse]])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    result = await db.execute(
        select(WorkflowTemplate).where(WorkflowTemplate.tenant_id == tenant_id)
        .order_by(WorkflowTemplate.created_at)
    )
    templates = [
        WorkflowTemplateResponse(
            id=t.id, name=t.name, trigger_type=t.trigger_type, issue_type=t.issue_type,
            steps=t.steps, active=t.active, created_at=t.created_at,
        )
        for t in result.scalars().all()
    ]
    return APIResponse(data=templates)


@router.get("/summary", response_model=APIResponse[WorkflowSummaryResponse])
async def workflow_summary(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    status = await get_workflow_status(db, tenant_id)
    return APIResponse(data=WorkflowSummaryResponse(**status))
