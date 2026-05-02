from __future__ import annotations
from datetime import date, datetime
from typing import Any
from uuid import UUID
from pydantic import BaseModel


class ForecastSlotRead(BaseModel):
    slot_start: datetime
    predicted_customers: float
    predicted_sales: float
    confidence: float
    factors: dict[str, Any]


class RequirementSlotRead(BaseModel):
    slot_start: datetime
    required_fte: float
    role_split: dict[str, float]
    hourly_wage_yen: int


class ShiftDraftCreate(BaseModel):
    store_id: UUID
    week_start: date
    brand_name: str | None = None


class ShiftDraftUpdate(BaseModel):
    draft_json: dict[str, Any]


class ShiftDraftRead(BaseModel):
    id: UUID
    store_id: UUID
    week_start: date
    status: str
    cost_estimate: int
    draft_json: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None = None
