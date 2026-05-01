from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from uuid import UUID, uuid4
from datetime import datetime
from app.database import get_db
from app.models.task import Task as TaskModel
from app.models.store import Store
from app.models.employee import Employee
from app.schemas.common import APIResponse, PaginationMeta
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])

DEMO_TENANT_ID = "00000000-0000-0000-0000-000000000001"


def _task_to_response(t: TaskModel, store_name: str | None = None, assignee_name: str | None = None) -> TaskResponse:
    return TaskResponse(
        id=t.id, store_id=t.store_id, store_name=store_name,
        title=t.title, description=t.description, issue_type=t.issue_type,
        status=t.status, priority=t.priority, assigned_to=t.assigned_to,
        assignee_name=assignee_name, due_date=t.due_date,
        completed_at=t.completed_at,
        expected_impact_amount=t.expected_impact_amount,
        realized_impact_amount=t.realized_impact_amount,
        source=t.source, created_at=t.created_at,
    )


@router.get("", response_model=APIResponse[list[TaskResponse]])
async def list_tasks(
    status: str | None = Query(None),
    store_id: UUID | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(TaskModel, Store.name.label("store_name"), Employee.name.label("assignee_name"))
        .join(Store, Store.id == TaskModel.store_id)
        .outerjoin(Employee, Employee.id == TaskModel.assigned_to)
    )
    count_q = select(func.count(TaskModel.id))

    if status:
        q = q.where(TaskModel.status == status)
        count_q = count_q.where(TaskModel.status == status)
    if store_id:
        q = q.where(TaskModel.store_id == store_id)
        count_q = count_q.where(TaskModel.store_id == store_id)

    total = (await db.execute(count_q)).scalar() or 0
    q = q.order_by(TaskModel.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)

    tasks = [_task_to_response(row[0], row[1], row[2]) for row in result.all()]
    meta = PaginationMeta(total=total, page=page, page_size=page_size, total_pages=(total + page_size - 1) // page_size)
    return APIResponse(data=tasks, meta=meta.model_dump())


@router.get("/{task_id}", response_model=APIResponse[TaskResponse])
async def get_task(task_id: UUID = Path(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TaskModel, Store.name, Employee.name)
        .join(Store, Store.id == TaskModel.store_id)
        .outerjoin(Employee, Employee.id == TaskModel.assigned_to)
        .where(TaskModel.id == task_id)
    )
    row = result.one_or_none()
    if not row:
        return APIResponse(errors=[{"detail": "Task not found"}])
    return APIResponse(data=_task_to_response(row[0], row[1], row[2]))


@router.post("", response_model=APIResponse[TaskResponse])
async def create_task(body: TaskCreate, db: AsyncSession = Depends(get_db)):
    task = TaskModel(
        id=uuid4(),
        tenant_id=UUID(DEMO_TENANT_ID),
        store_id=body.store_id,
        title=body.title,
        description=body.description,
        issue_type=body.issue_type,
        status="open",
        priority=body.priority,
        assigned_to=body.assigned_to,
        due_date=body.due_date,
        expected_impact_amount=body.expected_impact_amount,
        source=body.source,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)

    store_q = await db.execute(select(Store.name).where(Store.id == task.store_id))
    store_name = store_q.scalar()
    return APIResponse(data=_task_to_response(task, store_name))


@router.patch("/{task_id}", response_model=APIResponse[TaskResponse])
async def update_task(task_id: UUID = Path(...), body: TaskUpdate = ..., db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TaskModel).where(TaskModel.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        return APIResponse(errors=[{"detail": "Task not found"}])

    update_data = body.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] == "done" and task.status != "done":
        update_data["completed_at"] = datetime.utcnow()

    for k, v in update_data.items():
        setattr(task, k, v)

    await db.commit()
    await db.refresh(task)

    store_q = await db.execute(select(Store.name).where(Store.id == task.store_id))
    store_name = store_q.scalar()
    return APIResponse(data=_task_to_response(task, store_name))
