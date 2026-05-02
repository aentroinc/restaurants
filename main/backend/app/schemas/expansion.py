from pydantic import BaseModel
from uuid import UUID
from datetime import date, datetime


class LocationCandidateRead(BaseModel):
    id: UUID
    name: str
    brand_id: UUID | None = None
    brand_name: str | None = None
    lat: float
    lng: float
    prefecture: str
    city: str
    address: str
    population_radius_1km: int
    competitor_count: int
    cannibalization_risk_pct: float
    delivery_distance_km: float
    staff_difficulty_score: int
    expected_daily_sales: float
    expected_payback_months: float
    total_score: float
    status: str
    rationale: str | None = None
    created_at: datetime | None = None


class LocationCandidateRanking(BaseModel):
    id: UUID
    name: str
    brand_name: str | None = None
    prefecture: str
    city: str
    total_score: float
    expected_daily_sales: float
    expected_payback_months: float
    cannibalization_risk_pct: float
    status: str


class RenovationProjectRead(BaseModel):
    id: UUID
    store_id: UUID
    store_name: str | None = None
    package_type: str
    capex_myen: float
    start_date: date
    end_date: date
    status: str
    expected_ticket_lift_pct: float
    expected_customer_lift_pct: float
    actual_ticket_lift_pct: float | None = None
    actual_customer_lift_pct: float | None = None
    payback_months: float
    created_at: datetime | None = None


class RenovationPackageStat(BaseModel):
    package_type: str
    project_count: int
    avg_capex_myen: float
    avg_expected_ticket_lift_pct: float
    avg_expected_customer_lift_pct: float
    avg_actual_ticket_lift_pct: float | None = None
    avg_actual_customer_lift_pct: float | None = None
    avg_payback_months: float


class RenovationPackageStats(BaseModel):
    packages: list[RenovationPackageStat] = []
