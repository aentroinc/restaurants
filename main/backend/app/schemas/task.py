from pydantic import BaseModel
from decimal import Decimal
from uuid import UUID
from datetime import date, datetime


class TaskCreate(BaseModel):
    store_id: UUID
    title: str
    description: str | None = None
    issue_type: str | None = None
    priority: str | None = "medium"
    assigned_to: UUID | None = None
    due_date: date | None = None
    expected_impact_amount: Decimal | None = None
    source: str = "manual"


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    assigned_to: UUID | None = None
    due_date: date | None = None
    realized_impact_amount: Decimal | None = None


class TaskResponse(BaseModel):
    id: UUID
    store_id: UUID
    store_name: str | None = None
    title: str
    description: str | None = None
    issue_type: str | None = None
    status: str
    priority: str | None = None
    assigned_to: UUID | None = None
    assignee_name: str | None = None
    due_date: date | None = None
    completed_at: datetime | None = None
    expected_impact_amount: Decimal | None = None
    realized_impact_amount: Decimal | None = None
    related_value_case_id: UUID | None = None
    source: str
    created_at: datetime | None = None
