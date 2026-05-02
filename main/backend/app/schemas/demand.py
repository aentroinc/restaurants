from pydantic import BaseModel
from uuid import UUID
from datetime import date, datetime


class SKURead(BaseModel):
    id: UUID
    code: str
    name: str
    category: str
    storage_type: str
    shelf_life_days: int
    unit_cost: float
    unit: str
    factory_id: UUID | None = None
    primary_dc_id: UUID | None = None
    created_at: datetime | None = None


class InventorySnapshotRead(BaseModel):
    id: UUID
    store_id: UUID
    sku_id: UUID
    sku_name: str | None = None
    snapshot_date: date
    on_hand_quantity: float
    days_of_supply: float
    waste_risk_pct: float
    stockout_risk_pct: float


class DemandForecastRead(BaseModel):
    id: UUID
    sku_id: UUID
    store_id: UUID | None = None
    forecast_date: date
    forecasted_quantity: float
    confidence_lower: float
    confidence_upper: float
    actual_quantity: float | None = None
    accuracy_mape: float | None = None
    model_version: str


class ReplenishmentRead(BaseModel):
    id: UUID
    store_id: UUID
    sku_id: UUID
    sku_name: str | None = None
    store_name: str | None = None
    recommended_quantity: float
    recommended_units: str
    reason: str
    priority: str
    status: str
    created_at: datetime | None = None


class SKUForecastTimeseries(BaseModel):
    sku_id: UUID
    store_id: UUID | None = None
    dates: list[date] = []
    forecast: list[float] = []
    lower: list[float] = []
    upper: list[float] = []
    actual: list[float | None] = []


class WasteAnalysisItem(BaseModel):
    sku_id: UUID
    sku_name: str
    waste_quantity: float
    waste_cost_yen: float
    primary_reason: str


class WasteAnalysis(BaseModel):
    period: str
    top_skus: list[WasteAnalysisItem] = []
    reason_distribution: dict[str, float] = {}


class ReplenishmentScenario(BaseModel):
    name: str
    description: str
    expected_waste_pct: float
    expected_stockout_pct: float
    expected_cost_yen: float


class ScenarioBundle(BaseModel):
    sku_id: UUID
    scenarios: list[ReplenishmentScenario] = []
