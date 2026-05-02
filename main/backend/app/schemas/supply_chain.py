from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Any


class FactoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str
    region: str | None = None
    prefecture: str | None = None
    city: str | None = None
    lat: float | None = None
    lng: float | None = None
    capacity_tons_day: float | None = None
    utilization_pct: float | None = None
    status: str
    created_at: datetime | None = None
    updated_at: datetime | None = None


class DCRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str
    region: str | None = None
    prefecture: str | None = None
    city: str | None = None
    lat: float | None = None
    lng: float | None = None
    throughput_capacity_tons_day: float | None = None
    current_throughput: float | None = None
    status: str
    created_at: datetime | None = None
    updated_at: datetime | None = None


class RouteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    origin_dc_id: UUID | None = None
    destination_area: str | None = None
    destination_store_ids: list[Any] = []
    departure_time: str | None = None
    eta_hours: float | None = None
    load_pct: float | None = None
    status: str
    delay_minutes: int = 0
    last_updated: datetime | None = None


class NetworkNode(BaseModel):
    id: str
    type: str  # factory / dc / store-cluster
    label: str
    region: str | None = None
    lat: float | None = None
    lng: float | None = None
    metrics: dict[str, Any] = {}


class NetworkEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str  # supply / delivery
    status: str | None = None
    load_pct: float | None = None
    delay_minutes: int | None = None


class NetworkGraphResponse(BaseModel):
    nodes: list[NetworkNode] = []
    edges: list[NetworkEdge] = []


class ScenarioOption(BaseModel):
    label: str
    description: str
    pros: list[str] = []
    cons: list[str] = []
    expected_impact: list[dict[str, Any]] = []
    confidence: str
    risk: str
    recommended: bool = False
