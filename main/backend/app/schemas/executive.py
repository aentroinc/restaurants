from pydantic import BaseModel
from decimal import Decimal
from uuid import UUID


class BrandKPI(BaseModel):
    brand_id: UUID
    brand_name: str
    store_count: int
    total_sales: Decimal
    avg_ticket: Decimal
    cogs_rate: Decimal
    labor_cost_rate: Decimal
    fl_ratio: Decimal
    yoy_growth: Decimal | None = None


class ExecutiveSummary(BaseModel):
    total_stores: int
    total_sales: Decimal
    total_sales_yoy: Decimal | None = None
    avg_cogs_rate: Decimal
    avg_labor_cost_rate: Decimal
    avg_fl_ratio: Decimal
    avg_health_score: Decimal
    total_improvement_opportunity: Decimal
    issue_count: int
    brands: list[BrandKPI]


class ExecutiveIssue(BaseModel):
    store_id: UUID
    store_name: str
    brand_name: str
    area_name: str | None = None
    issue_type: str
    severity: str
    description: str
    impact_amount: Decimal
    health_score: Decimal
    metric_value: Decimal | None = None
    peer_median: Decimal | None = None
