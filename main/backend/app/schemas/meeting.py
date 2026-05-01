from pydantic import BaseModel
from typing import Any
from uuid import UUID
from datetime import date, datetime


class MeetingItemCreate(BaseModel):
    item_type: str
    title: str
    content: dict[str, Any] | None = None
    store_id: UUID | None = None
    task_id: UUID | None = None
    sort_order: int = 0


class MeetingItemResponse(BaseModel):
    id: UUID
    item_type: str
    title: str
    content: dict[str, Any] | None = None
    store_id: UUID | None = None
    task_id: UUID | None = None
    sort_order: int


class MeetingPackCreate(BaseModel):
    title: str
    meeting_date: date
    company_id: UUID


class MeetingPackResponse(BaseModel):
    id: UUID
    title: str
    meeting_date: date
    status: str
    created_at: datetime | None = None
    items: list[MeetingItemResponse] = []
