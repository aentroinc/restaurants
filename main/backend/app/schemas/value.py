from pydantic import BaseModel
from decimal import Decimal
from uuid import UUID
from datetime import date


class ValueCaseMetricResponse(BaseModel):
    metric_name: str
    baseline_value: Decimal
    measured_value: Decimal | None = None
    peer_adjusted_value: Decimal | None = None
    estimated_impact_amount: Decimal | None = None


class ValueCaseResponse(BaseModel):
    id: UUID
    name: str
    issue_type: str
    status: str
    target_store_ids: list[UUID] | None = None
    baseline_start: date
    baseline_end: date
    measurement_start: date
    measurement_end: date | None = None
    expected_impact_amount: Decimal | None = None
    realized_impact_amount: Decimal | None = None
    metrics: list[ValueCaseMetricResponse] = []


class ValueCaseCreate(BaseModel):
    name: str
    issue_type: str
    target_store_ids: list[UUID] | None = None
    baseline_start: date
    baseline_end: date
    measurement_start: date
    expected_impact_amount: Decimal | None = None
