from pydantic import BaseModel
from decimal import Decimal
from uuid import UUID
from datetime import date


class SuggestedAction(BaseModel):
    action: str
    reason: str
    expected_impact: Decimal | None = None


class SVMission(BaseModel):
    store_id: UUID
    store_name: str
    brand_name: str
    area_name: str | None = None
    priority_score: Decimal
    health_score: Decimal | None = None
    days_since_last_visit: int | None = None
    open_task_count: int = 0
    issue_types: list[str] = []
    improvement_opportunity: Decimal | None = None
    suggested_actions: list[SuggestedAction] = []
