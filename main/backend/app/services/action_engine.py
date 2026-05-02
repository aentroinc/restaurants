"""Foundry-style Action Engine for the v2 Ontology.

Registers and executes named Actions on object instances.
Pattern mirrors `app.services.writeback_executor`:
  - decorator-based handler registry
  - handlers receive (db, tenant_id, instance, params) and return a dict result
  - executions are persisted to OntologyAction + AuditLog + LineageEvent

Approval gate: action_type.requires_approval=True forces status=pending and
defers handler execution until /approve transitions it.
"""
from __future__ import annotations

import uuid as uuid_mod
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware.audit import log_audit
from app.models.ontology_v2 import (
    OntologyAction,
    OntologyActionType,
    OntologyInstance,
    OntologyLink,
    OntologyLinkType,
    OntologyObjectTypeV2,
)


HandlerResult = dict[str, Any]
Handler = Callable[[AsyncSession, str, Optional[OntologyInstance], dict], Awaitable[HandlerResult]]

_HANDLERS: dict[str, Handler] = {}


def register_action(name: str) -> Callable[[Handler], Handler]:
    """Decorator: register a handler under `name`. Mirrors writeback_executor."""
    def deco(fn: Handler) -> Handler:
        _HANDLERS[name] = fn
        return fn
    return deco


def list_registered_actions() -> list[str]:
    return sorted(_HANDLERS.keys())


async def ensure_action_type(
    db: AsyncSession,
    tenant_id: str,
    name: str,
    object_type_id: Optional[UUID] = None,
    description: str | None = None,
    parameters_schema: dict | None = None,
    side_effects: dict | None = None,
    requires_approval: bool = False,
) -> OntologyActionType:
    """Get-or-create an action type registration. Idempotent."""
    q = select(OntologyActionType).where(
        OntologyActionType.tenant_id == tenant_id,
        OntologyActionType.name == name,
    )
    if object_type_id is not None:
        q = q.where(OntologyActionType.object_type_id == object_type_id)
    else:
        q = q.where(OntologyActionType.object_type_id.is_(None))

    existing = (await db.execute(q)).scalar_one_or_none()
    if existing:
        return existing

    at = OntologyActionType(
        id=uuid_mod.uuid4(),
        tenant_id=UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
        object_type_id=object_type_id,
        name=name,
        description=description,
        parameters_json=parameters_schema or {},
        side_effects_json=side_effects or {},
        requires_approval=requires_approval,
        version=1,
    )
    db.add(at)
    await db.flush()
    return at


async def list_actions_for_object_type(
    db: AsyncSession, tenant_id: str, object_type_id: UUID
) -> list[OntologyActionType]:
    """Return action types attached to a specific OT plus globals (object_type_id IS NULL)."""
    q = select(OntologyActionType).where(
        OntologyActionType.tenant_id == tenant_id,
    ).where(
        (OntologyActionType.object_type_id == object_type_id)
        | (OntologyActionType.object_type_id.is_(None))
    ).order_by(OntologyActionType.name)
    res = await db.execute(q)
    return list(res.scalars().all())


def _validate_params(schema: dict, params: dict) -> list[str]:
    """Lightweight JSON-schema-ish validation: required keys + type checks."""
    if not schema:
        return []
    errors: list[str] = []
    required = schema.get("required") or []
    for k in required:
        if k not in params:
            errors.append(f"missing required parameter: {k}")
    props = schema.get("properties") or {}
    type_map = {
        "string": str, "integer": int, "number": (int, float),
        "boolean": bool, "object": dict, "array": list,
    }
    for k, spec in props.items():
        if k in params and isinstance(spec, dict) and "type" in spec:
            py_t = type_map.get(spec["type"])
            if py_t and not isinstance(params[k], py_t):
                errors.append(f"parameter {k}: expected {spec['type']}")
    return errors


async def execute_action(
    db: AsyncSession,
    tenant_id: str,
    action_type_id: UUID,
    instance_id: UUID | None,
    params: dict,
    user: str | None = None,
) -> dict:
    """Validate + (approval gate) + execute + persist OntologyAction + audit + lineage."""
    at = (await db.execute(
        select(OntologyActionType).where(
            OntologyActionType.id == action_type_id,
            OntologyActionType.tenant_id == tenant_id,
        )
    )).scalar_one_or_none()
    if not at:
        raise ValueError("action type not found")

    inst: OntologyInstance | None = None
    if instance_id is not None:
        inst = (await db.execute(
            select(OntologyInstance).where(
                OntologyInstance.id == instance_id,
                OntologyInstance.tenant_id == tenant_id,
            )
        )).scalar_one_or_none()
        if not inst:
            raise ValueError("instance not found")

    # validate parameters
    errors = _validate_params(at.parameters_json or {}, params or {})
    if errors:
        raise ValueError(f"validation failed: {errors}")

    # create action record
    action = OntologyAction(
        id=uuid_mod.uuid4(),
        tenant_id=UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
        action_type_id=at.id,
        instance_id=instance_id,
        params_json=params or {},
        executed_by=user,
        status="pending" if at.requires_approval else "executed",
        result_json={},
    )
    db.add(action)
    await db.flush()

    # approval gate: stop here for pending
    if at.requires_approval:
        log_audit(
            tenant_id=tenant_id, user_id=user,
            action="ontology_action_pending", resource_type="ontology_action",
            resource_id=str(action.id),
            metadata={"action_name": at.name, "instance_id": str(instance_id) if instance_id else None},
        )
        return {
            "action_id": str(action.id),
            "status": "pending",
            "message": "approval required",
        }

    # execute handler
    handler = _HANDLERS.get(at.name)
    if handler is None:
        action.status = "failed"
        action.result_json = {"success": False, "error": f"no handler registered for action '{at.name}'"}
        await db.flush()
        return action.result_json

    try:
        result = await handler(db, tenant_id, inst, params or {})
        action.status = "executed"
        action.result_json = result
        action.executed_at = datetime.now(timezone.utc)
    except Exception as exc:  # noqa: BLE001
        action.status = "failed"
        action.result_json = {"success": False, "error": str(exc)}
        await db.flush()
        log_audit(
            tenant_id=tenant_id, user_id=user,
            action="ontology_action_failed", resource_type="ontology_action",
            resource_id=str(action.id),
            metadata={"action_name": at.name, "error": str(exc)},
        )
        return action.result_json

    await db.flush()

    # audit + lineage (fire-and-forget; lineage uses sync session)
    log_audit(
        tenant_id=tenant_id, user_id=user,
        action=f"ontology_action_{at.name}",
        resource_type="ontology_action",
        resource_id=str(action.id),
        metadata={
            "action_name": at.name,
            "instance_id": str(instance_id) if instance_id else None,
            "params": params,
            "result": result,
        },
    )
    try:
        from app.services.lineage_tracker import track_lineage
        track_lineage(
            tenant_id=tenant_id,
            event_type="ontology_action",
            source_type="ontology_action_type",
            source_id=str(at.id),
            target_type="ontology_instance",
            target_id=str(instance_id) if instance_id else None,
            transformation_name=at.name,
            transformation_version=str(at.version),
            metadata={"params": params, "result": result},
        )
    except Exception:
        pass

    return {
        "action_id": str(action.id),
        "status": action.status,
        "result": result,
    }


async def approve_action(
    db: AsyncSession,
    tenant_id: str,
    action_id: UUID,
    user: str | None = None,
    approved: bool = True,
) -> dict:
    """Transition pending action to executed (or rejected). Runs handler on approve."""
    action = (await db.execute(
        select(OntologyAction).where(
            OntologyAction.id == action_id,
            OntologyAction.tenant_id == tenant_id,
        )
    )).scalar_one_or_none()
    if not action:
        raise ValueError("action not found")
    if action.status != "pending":
        return {"action_id": str(action.id), "status": action.status, "message": "not pending"}

    if not approved:
        action.status = "rejected"
        action.result_json = {"approved": False, "approver": user}
        await db.flush()
        log_audit(
            tenant_id=tenant_id, user_id=user,
            action="ontology_action_rejected", resource_type="ontology_action",
            resource_id=str(action.id), metadata={},
        )
        return {"action_id": str(action.id), "status": "rejected"}

    # load type + instance, then run handler
    at = (await db.execute(
        select(OntologyActionType).where(OntologyActionType.id == action.action_type_id)
    )).scalar_one_or_none()
    inst = None
    if action.instance_id:
        inst = (await db.execute(
            select(OntologyInstance).where(OntologyInstance.id == action.instance_id)
        )).scalar_one_or_none()

    handler = _HANDLERS.get(at.name) if at else None
    if handler is None:
        action.status = "failed"
        action.result_json = {"error": "no handler"}
        await db.flush()
        return action.result_json

    try:
        result = await handler(db, tenant_id, inst, action.params_json or {})
        action.status = "executed"
        action.result_json = result
        action.executed_at = datetime.now(timezone.utc)
    except Exception as exc:  # noqa: BLE001
        action.status = "failed"
        action.result_json = {"success": False, "error": str(exc)}

    await db.flush()
    log_audit(
        tenant_id=tenant_id, user_id=user,
        action="ontology_action_approved", resource_type="ontology_action",
        resource_id=str(action.id),
        metadata={"approver": user, "result": action.result_json},
    )
    return {"action_id": str(action.id), "status": action.status, "result": action.result_json}


# ============================================================================
# Built-in standard actions
# ============================================================================

@register_action("update_property")
async def _update_property(
    db: AsyncSession, tenant_id: str, instance: OntologyInstance | None, params: dict,
) -> dict:
    if instance is None:
        return {"success": False, "error": "instance required"}
    key = params.get("property")
    value = params.get("value")
    if not key:
        return {"success": False, "error": "property required"}
    props = dict(instance.properties or {})
    before = props.get(key)
    props[key] = value
    instance.properties = props
    await db.flush()
    return {"success": True, "property": key, "before": before, "after": value}


@register_action("link_to")
async def _link_to(
    db: AsyncSession, tenant_id: str, instance: OntologyInstance | None, params: dict,
) -> dict:
    if instance is None:
        return {"success": False, "error": "instance required"}
    target_id = params.get("target_instance_id")
    link_type_id = params.get("link_type_id")
    if not target_id or not link_type_id:
        return {"success": False, "error": "target_instance_id and link_type_id required"}

    lt = (await db.execute(
        select(OntologyLinkType).where(OntologyLinkType.id == UUID(link_type_id))
    )).scalar_one_or_none()
    if not lt:
        return {"success": False, "error": "link_type not found"}

    link = OntologyLink(
        id=uuid_mod.uuid4(),
        tenant_id=UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
        link_type_id=lt.id,
        link_type_version=lt.version,
        from_instance_id=instance.id,
        to_instance_id=UUID(target_id) if isinstance(target_id, str) else target_id,
        properties=params.get("properties"),
    )
    db.add(link)
    await db.flush()
    return {"success": True, "link_id": str(link.id)}


@register_action("unlink")
async def _unlink(
    db: AsyncSession, tenant_id: str, instance: OntologyInstance | None, params: dict,
) -> dict:
    link_id = params.get("link_id")
    if not link_id:
        return {"success": False, "error": "link_id required"}
    link = (await db.execute(
        select(OntologyLink).where(
            OntologyLink.id == UUID(link_id),
            OntologyLink.tenant_id == tenant_id,
        )
    )).scalar_one_or_none()
    if not link:
        return {"success": False, "error": "link not found"}
    await db.delete(link)
    await db.flush()
    return {"success": True, "link_id": link_id}


@register_action("archive")
async def _archive(
    db: AsyncSession, tenant_id: str, instance: OntologyInstance | None, params: dict,
) -> dict:
    if instance is None:
        return {"success": False, "error": "instance required"}
    prev = instance.status
    instance.status = "archived"
    await db.flush()
    return {"success": True, "previous_status": prev, "new_status": "archived"}


@register_action("create_task")
async def _create_task(
    db: AsyncSession, tenant_id: str, instance: OntologyInstance | None, params: dict,
) -> dict:
    """Create a Task linked to the instance (best-effort: requires store_id)."""
    try:
        from app.models.task import Task
    except Exception as exc:  # noqa: BLE001
        return {"success": False, "error": f"task model unavailable: {exc}"}

    store_id = params.get("store_id")
    if instance is not None and not store_id:
        # try to read store_id from instance properties
        store_id = (instance.properties or {}).get("store_id")
    if not store_id:
        return {"success": False, "error": "store_id required"}
    try:
        store_uuid = UUID(store_id) if isinstance(store_id, str) else store_id
    except (ValueError, TypeError):
        return {"success": False, "error": "invalid store_id"}

    task = Task(
        tenant_id=UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
        store_id=store_uuid,
        title=params.get("title", "Ontology Action Task"),
        description=params.get("description"),
        priority=params.get("priority", "medium"),
        status="open",
        source="ontology_action",
    )
    db.add(task)
    await db.flush()
    return {"success": True, "task_id": str(task.id)}


@register_action("notify")
async def _notify(
    db: AsyncSession, tenant_id: str, instance: OntologyInstance | None, params: dict,
) -> dict:
    """Stub notification — records intent in audit log only."""
    return {
        "success": True,
        "channel": params.get("channel", "in_app"),
        "to": params.get("to"),
        "message": params.get("message", ""),
    }


# ============================================================================
# Bootstrap: ensure standard action types exist for a tenant (idempotent)
# ============================================================================

STANDARD_ACTIONS: list[dict] = [
    {
        "name": "update_property",
        "description": "Update a single property on an instance.",
        "parameters_schema": {
            "required": ["property"],
            "properties": {"property": {"type": "string"}, "value": {}},
        },
    },
    {
        "name": "link_to",
        "description": "Create a link from this instance to another.",
        "parameters_schema": {
            "required": ["target_instance_id", "link_type_id"],
            "properties": {
                "target_instance_id": {"type": "string"},
                "link_type_id": {"type": "string"},
                "properties": {"type": "object"},
            },
        },
    },
    {
        "name": "unlink",
        "description": "Delete an existing link.",
        "parameters_schema": {
            "required": ["link_id"],
            "properties": {"link_id": {"type": "string"}},
        },
    },
    {
        "name": "archive",
        "description": "Archive an instance (status=archived).",
        "parameters_schema": {"properties": {}},
        "requires_approval": True,
    },
    {
        "name": "create_task",
        "description": "Create a Task related to this instance.",
        "parameters_schema": {
            "properties": {
                "title": {"type": "string"},
                "description": {"type": "string"},
                "priority": {"type": "string"},
                "store_id": {"type": "string"},
            },
        },
    },
    {
        "name": "notify",
        "description": "Send a notification (in_app|email).",
        "parameters_schema": {
            "properties": {
                "channel": {"type": "string"},
                "to": {"type": "string"},
                "message": {"type": "string"},
            },
        },
    },
]


async def bootstrap_standard_actions(db: AsyncSession, tenant_id: str) -> list[OntologyActionType]:
    """Idempotently create global (object_type_id=NULL) standard action types."""
    out = []
    for spec in STANDARD_ACTIONS:
        at = await ensure_action_type(
            db,
            tenant_id=tenant_id,
            name=spec["name"],
            object_type_id=None,
            description=spec.get("description"),
            parameters_schema=spec.get("parameters_schema"),
            side_effects=spec.get("side_effects"),
            requires_approval=spec.get("requires_approval", False),
        )
        out.append(at)
    return out
