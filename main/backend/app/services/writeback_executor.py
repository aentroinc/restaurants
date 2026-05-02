"""Writeback executor — dispatches WritebackRequest to action handlers.

Each action_type has a handler that performs the actual mutation and
returns a (success, result_dict, rollback_payload) tuple. The executor
records the rollback payload so the request can be reversed later.

Adding a new action: register a handler with @register_handler("name").
"""
from datetime import datetime, timezone
from typing import Awaitable, Callable, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task
from app.models.writeback import WritebackRequest


HandlerResult = tuple[bool, dict, Optional[dict]]
Handler = Callable[[AsyncSession, str, dict], Awaitable[HandlerResult]]

_HANDLERS: dict[str, Handler] = {}


def register_handler(action_type: str):
    def deco(fn: Handler) -> Handler:
        _HANDLERS[action_type] = fn
        return fn
    return deco


async def execute_request(
    db: AsyncSession,
    tenant_id: str,
    request: WritebackRequest,
) -> dict:
    """Run the handler for request.action_type. Returns the result dict.
    Mutates request in-place: sets status, executed_at, result, rollback_payload.
    Caller is responsible for db.commit().
    """
    handler = _HANDLERS.get(request.action_type)
    if handler is None:
        request.status = "failed"
        request.result = {"success": False, "error": f"No handler for action_type={request.action_type}"}
        return request.result

    try:
        success, result, rollback = await handler(db, tenant_id, request.payload or {})
    except Exception as e:  # noqa: BLE001
        request.status = "failed"
        request.result = {"success": False, "error": str(e)}
        return request.result

    request.status = "executed" if success else "failed"
    request.executed_at = datetime.now(timezone.utc)
    request.result = result
    if rollback is not None:
        request.rollback_payload = rollback
    return result


# ── Built-in handlers ────────────────────────────────────────────

@register_handler("task_create")
async def _task_create(db: AsyncSession, tenant_id: str, payload: dict) -> HandlerResult:
    store_id = payload.get("store_id")
    if not store_id:
        return False, {"error": "store_id required"}, None
    try:
        store_uuid = UUID(store_id) if isinstance(store_id, str) else store_id
    except (ValueError, TypeError):
        return False, {"error": "store_id is not a valid UUID"}, None

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
    return (
        True,
        {"success": True, "task_id": str(task.id), "message": f"タスク '{task.title}' を作成"},
        {"action": "delete_task", "task_id": str(task.id)},
    )


@register_handler("task_close")
async def _task_close(db: AsyncSession, tenant_id: str, payload: dict) -> HandlerResult:
    task_id = payload.get("task_id")
    if not task_id:
        return False, {"error": "task_id required"}, None
    try:
        tid = UUID(task_id) if isinstance(task_id, str) else task_id
    except (ValueError, TypeError):
        return False, {"error": "task_id is not a valid UUID"}, None

    task = (await db.execute(
        select(Task).where(Task.id == tid, Task.tenant_id == tenant_id)
    )).scalar_one_or_none()
    if not task:
        return False, {"error": "task not found"}, None

    prev_status = task.status
    task.status = "closed"
    return (
        True,
        {"success": True, "task_id": str(task.id), "previous_status": prev_status},
        {"action": "restore_task_status", "task_id": str(task.id), "status": prev_status},
    )


@register_handler("kpi_target_update")
async def _kpi_target_update(db: AsyncSession, tenant_id: str, payload: dict) -> HandlerResult:
    """Stub for KPI target updates — would update a KPIDefinition row.
    Implemented as a no-op success so workflow demos can chain to it."""
    return (
        True,
        {"success": True, "kpi_id": payload.get("kpi_id"), "new_target": payload.get("new_target")},
        {"action": "noop"},
    )


@register_handler("approval")
async def _approval_action(db: AsyncSession, tenant_id: str, payload: dict) -> HandlerResult:
    """Records an approval decision — used for multi-step approval workflows."""
    return (
        True,
        {
            "success": True,
            "decision": payload.get("decision", "approved"),
            "approver": payload.get("approver"),
            "comment": payload.get("comment"),
        },
        {"action": "noop"},
    )


def list_action_types() -> list[str]:
    return sorted(_HANDLERS.keys())
