from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from uuid import UUID, uuid4
from datetime import datetime, timezone

from app.database import get_db
from app.auth import get_tenant_id, get_current_user_optional
from app.models.incident import Incident, IncidentScenario, Action, ActionAuditLog
from app.schemas.common import APIResponse
from app.schemas.incident import (
    IncidentCreate,
    IncidentRead,
    IncidentStatusUpdate,
    ActionCreate,
    ActionRead,
    ActionStatusUpdate,
    ActionApprove,
    ActionAuditLogRead,
)

router = APIRouter(prefix="/api/v1/incidents", tags=["incidents"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _actor_meta(user: dict | None) -> tuple[UUID | None, str, str]:
    if not user:
        return None, "system", "system"
    actor_id = user.get("sub")
    actor_uuid: UUID | None = None
    if actor_id:
        try:
            actor_uuid = UUID(actor_id)
        except (ValueError, TypeError):
            actor_uuid = None
    return actor_uuid, user.get("role") or "user", user.get("name") or user.get("email") or "user"


async def _record_audit(
    db: AsyncSession,
    tenant_id: str,
    action_id: UUID,
    user: dict | None,
    event: str,
    note: str | None = None,
    metadata: dict | None = None,
) -> ActionAuditLog:
    actor_uuid, actor_role, actor_name = _actor_meta(user)
    log = ActionAuditLog(
        id=uuid4(),
        tenant_id=UUID(tenant_id),
        action_id=action_id,
        actor_user_id=actor_uuid,
        actor_role=actor_role,
        actor_name=actor_name,
        event=event,
        note=note,
        metadata_json=metadata,
    )
    db.add(log)
    return log


@router.get("", response_model=APIResponse[list[IncidentRead]])
async def list_incidents(
    severity: str | None = Query(None),
    status: str | None = Query(None),
    incident_type: str | None = Query(None, alias="type"),
    region: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = (
        select(Incident)
        .options(selectinload(Incident.actions), selectinload(Incident.scenarios))
        .where(Incident.tenant_id == tenant_id)
    )
    if severity:
        q = q.where(Incident.severity == severity)
    if status:
        q = q.where(Incident.status == status)
    if incident_type:
        q = q.where(Incident.incident_type == incident_type)
    q = q.order_by(Incident.detected_at.desc())

    try:
        result = await db.execute(q)
        incidents = result.scalars().unique().all()
    except Exception:
        incidents = []

    data = [IncidentRead.model_validate(i) for i in incidents]
    return APIResponse(data=data, meta={"total": len(data), "region": region})


@router.get("/{incident_id}", response_model=APIResponse[IncidentRead])
async def get_incident(
    incident_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = (
        select(Incident)
        .options(selectinload(Incident.actions), selectinload(Incident.scenarios))
        .where(and_(Incident.id == incident_id, Incident.tenant_id == tenant_id))
    )
    try:
        result = await db.execute(q)
        incident = result.scalar_one_or_none()
    except Exception:
        incident = None

    if not incident:
        return APIResponse(errors=[{"detail": "Incident not found"}])
    return APIResponse(data=IncidentRead.model_validate(incident))


@router.post("", response_model=APIResponse[IncidentRead])
async def create_incident(
    body: IncidentCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    incident = Incident(
        id=uuid4(),
        tenant_id=UUID(tenant_id),
        incident_type=body.incident_type,
        title=body.title,
        severity=body.severity,
        status="active",
        summary=body.summary,
        impacted_stores=[str(s) for s in body.impacted_stores],
        impacted_skus=[str(s) for s in body.impacted_skus],
        impacted_routes=[str(s) for s in body.impacted_routes],
        impacted_factories=[str(s) for s in body.impacted_factories],
        detected_at=body.detected_at or _now(),
    )
    db.add(incident)
    await db.commit()
    await db.refresh(incident)

    q = (
        select(Incident)
        .options(selectinload(Incident.actions), selectinload(Incident.scenarios))
        .where(Incident.id == incident.id)
    )
    result = await db.execute(q)
    fresh = result.scalar_one()
    return APIResponse(data=IncidentRead.model_validate(fresh))


@router.patch("/{incident_id}/status", response_model=APIResponse[IncidentRead])
async def update_incident_status(
    incident_id: UUID,
    body: IncidentStatusUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = (
        select(Incident)
        .options(selectinload(Incident.actions), selectinload(Incident.scenarios))
        .where(and_(Incident.id == incident_id, Incident.tenant_id == tenant_id))
    )
    result = await db.execute(q)
    incident = result.scalar_one_or_none()
    if not incident:
        return APIResponse(errors=[{"detail": "Incident not found"}])

    incident.status = body.status
    if body.status == "resolved" and not incident.resolved_at:
        incident.resolved_at = _now()
    await db.commit()
    await db.refresh(incident)

    return APIResponse(data=IncidentRead.model_validate(incident))


@router.post("/{incident_id}/scenarios/{scenario_id}/select", response_model=APIResponse[IncidentRead])
async def select_scenario(
    incident_id: UUID,
    scenario_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    sc_q = select(IncidentScenario).where(
        and_(IncidentScenario.incident_id == incident_id, IncidentScenario.tenant_id == tenant_id)
    )
    sc_result = await db.execute(sc_q)
    scenarios = sc_result.scalars().all()
    if not scenarios:
        return APIResponse(errors=[{"detail": "No scenarios for incident"}])

    target = None
    for s in scenarios:
        if s.id == scenario_id:
            s.selected = True
            target = s
        else:
            s.selected = False

    if not target:
        return APIResponse(errors=[{"detail": "Scenario not found"}])

    await db.commit()

    q = (
        select(Incident)
        .options(selectinload(Incident.actions), selectinload(Incident.scenarios))
        .where(Incident.id == incident_id)
    )
    result = await db.execute(q)
    incident = result.scalar_one_or_none()
    if not incident:
        return APIResponse(errors=[{"detail": "Incident not found"}])
    return APIResponse(data=IncidentRead.model_validate(incident))


@router.post("/{incident_id}/actions", response_model=APIResponse[ActionRead])
async def create_action(
    incident_id: UUID,
    body: ActionCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    user: dict | None = Depends(get_current_user_optional),
):
    action = Action(
        id=uuid4(),
        tenant_id=UUID(tenant_id),
        incident_id=incident_id,
        title=body.title,
        description=body.description,
        owner_role=body.owner_role,
        owner_user_id=body.owner_user_id,
        due_date=body.due_date,
        status="pending",
        expected_impact=body.expected_impact,
        confidence=body.confidence,
        requires_approval=body.requires_approval,
    )
    db.add(action)
    await db.flush()
    await _record_audit(db, tenant_id, action.id, user, "created", note=body.description)
    await db.commit()
    await db.refresh(action)
    return APIResponse(data=ActionRead.model_validate(action))


@router.patch("/actions/{action_id}/approve", response_model=APIResponse[ActionRead])
async def approve_action(
    action_id: UUID,
    body: ActionApprove,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    user: dict | None = Depends(get_current_user_optional),
):
    q = select(Action).where(and_(Action.id == action_id, Action.tenant_id == tenant_id))
    result = await db.execute(q)
    action = result.scalar_one_or_none()
    if not action:
        return APIResponse(errors=[{"detail": "Action not found"}])

    actor_uuid, _, _ = _actor_meta(user)
    action.status = "approved"
    action.approved_by = actor_uuid
    action.approved_at = _now()
    await _record_audit(db, tenant_id, action.id, user, "approved", note=body.note)
    await db.commit()
    await db.refresh(action)
    return APIResponse(data=ActionRead.model_validate(action))


@router.patch("/actions/{action_id}/reject", response_model=APIResponse[ActionRead])
async def reject_action(
    action_id: UUID,
    body: ActionApprove,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    user: dict | None = Depends(get_current_user_optional),
):
    q = select(Action).where(and_(Action.id == action_id, Action.tenant_id == tenant_id))
    result = await db.execute(q)
    action = result.scalar_one_or_none()
    if not action:
        return APIResponse(errors=[{"detail": "Action not found"}])

    action.status = "rejected"
    await _record_audit(db, tenant_id, action.id, user, "rejected", note=body.note)
    await db.commit()
    await db.refresh(action)
    return APIResponse(data=ActionRead.model_validate(action))


@router.patch("/actions/{action_id}/status", response_model=APIResponse[ActionRead])
async def update_action_status(
    action_id: UUID,
    body: ActionStatusUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    user: dict | None = Depends(get_current_user_optional),
):
    q = select(Action).where(and_(Action.id == action_id, Action.tenant_id == tenant_id))
    result = await db.execute(q)
    action = result.scalar_one_or_none()
    if not action:
        return APIResponse(errors=[{"detail": "Action not found"}])

    prev = action.status
    action.status = body.status
    if body.status == "completed" and not action.completed_at:
        action.completed_at = _now()
    await _record_audit(
        db,
        tenant_id,
        action.id,
        user,
        "status_changed",
        note=body.note,
        metadata={"from": prev, "to": body.status},
    )
    await db.commit()
    await db.refresh(action)
    return APIResponse(data=ActionRead.model_validate(action))


@router.get("/actions/{action_id}/audit-log", response_model=APIResponse[list[ActionAuditLogRead]])
async def get_action_audit_log(
    action_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = (
        select(ActionAuditLog)
        .where(and_(ActionAuditLog.action_id == action_id, ActionAuditLog.tenant_id == tenant_id))
        .order_by(ActionAuditLog.occurred_at.asc())
    )
    try:
        result = await db.execute(q)
        logs = result.scalars().all()
    except Exception:
        logs = []
    return APIResponse(data=[ActionAuditLogRead.model_validate(l) for l in logs])
