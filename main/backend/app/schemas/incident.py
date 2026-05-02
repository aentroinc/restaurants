from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Any


class IncidentBase(BaseModel):
    incident_type: str
    title: str
    severity: str
    summary: str | None = None
    impacted_stores: list[UUID] = []
    impacted_skus: list[UUID] = []
    impacted_routes: list[UUID] = []
    impacted_factories: list[UUID] = []


class IncidentCreate(IncidentBase):
    detected_at: datetime | None = None


class ScenarioRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    incident_id: UUID
    label: str
    description: str | None = None
    pros: list[str] = []
    cons: list[str] = []
    expected_impact: list[dict[str, Any]] = []
    confidence: str
    risk: str
    recommended: bool
    selected: bool
    created_at: datetime | None = None


class ActionBase(BaseModel):
    title: str
    description: str | None = None
    owner_role: str | None = None
    owner_user_id: UUID | None = None
    due_date: datetime | None = None
    expected_impact: str | None = None
    confidence: str = "Medium"
    requires_approval: bool = True


class ActionCreate(ActionBase):
    incident_id: UUID | None = None


class ActionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    incident_id: UUID | None = None
    title: str
    description: str | None = None
    owner_role: str | None = None
    owner_user_id: UUID | None = None
    due_date: datetime | None = None
    status: str
    expected_impact: str | None = None
    confidence: str
    requires_approval: bool
    approved_by: UUID | None = None
    approved_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ActionStatusUpdate(BaseModel):
    status: str
    note: str | None = None


class ActionApprove(BaseModel):
    note: str | None = None


class ActionAuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    action_id: UUID
    actor_user_id: UUID | None = None
    actor_role: str | None = None
    actor_name: str | None = None
    event: str
    note: str | None = None
    metadata_json: dict[str, Any] | None = None
    occurred_at: datetime


class IncidentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    incident_type: str
    title: str
    severity: str
    status: str
    summary: str | None = None
    impacted_stores: list[Any] = []
    impacted_skus: list[Any] = []
    impacted_routes: list[Any] = []
    impacted_factories: list[Any] = []
    detected_at: datetime | None = None
    resolved_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    actions: list[ActionRead] = []
    scenarios: list[ScenarioRead] = []


class IncidentStatusUpdate(BaseModel):
    status: str
