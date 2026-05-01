from pydantic import BaseModel
from uuid import UUID
from datetime import datetime, date
from typing import Any


class WorkflowTemplateResponse(BaseModel):
    id: UUID
    name: str
    trigger_type: str
    issue_type: str
    steps: list[dict[str, Any]] | None = None
    active: bool
    created_at: datetime | None = None


class WorkflowEventResponse(BaseModel):
    id: UUID
    event_type: str
    actor_id: UUID | None = None
    payload: dict[str, Any] | None = None
    created_at: datetime | None = None


class WorkflowInstanceResponse(BaseModel):
    id: UUID
    template_id: UUID
    template_name: str | None = None
    related_object_type: str
    related_object_id: UUID
    store_name: str | None = None
    status: str
    current_step: int
    started_at: datetime | None = None
    completed_at: datetime | None = None
    events: list[WorkflowEventResponse] = []
    tasks: list[dict[str, Any]] = []


class WorkflowInstanceListItem(BaseModel):
    id: UUID
    template_id: UUID
    template_name: str | None = None
    related_object_id: UUID
    store_name: str | None = None
    status: str
    current_step: int
    started_at: datetime | None = None
    completed_at: datetime | None = None
    event_count: int = 0
    task_count: int = 0


class EvaluateResponse(BaseModel):
    templates_evaluated: int
    stores_checked: int
    workflows_triggered: int
    tasks_created: int
    instances_created: int


class WorkflowSummaryResponse(BaseModel):
    active_count: int
    completed_count: int
    tasks_created_this_month: int
    top_triggered_templates: list[dict[str, Any]]
