from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class DataQualityResponse(BaseModel):
    id: UUID
    entity_type: str
    entity_id: UUID
    field_name: str
    severity: str
    rule_key: str
    description: str
    status: str
    detected_at: datetime | None = None
    resolved_at: datetime | None = None


class DataQualitySummary(BaseModel):
    total: int
    critical: int
    high: int
    medium: int
    low: int
    open: int
    resolved: int
