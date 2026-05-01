from pydantic import BaseModel
from decimal import Decimal
from uuid import UUID
from datetime import date


class StoreRanking(BaseModel):
    id: UUID
    code: str
    name: str
    brand_name: str
    area_name: str | None = None
    prefecture: str
    health_score: Decimal | None = None
    net_sales: Decimal | None = None
    avg_ticket: Decimal | None = None
    cogs_rate: Decimal | None = None
    labor_cost_rate: Decimal | None = None
    fl_ratio: Decimal | None = None
    improvement_opportunity: Decimal | None = None
    issue_types: list[str] = []


class KPIHistory(BaseModel):
    business_date: date
    net_sales: Decimal | None = None
    customer_count: int | None = None
    avg_ticket: Decimal | None = None
    cogs_rate: Decimal | None = None
    labor_cost_rate: Decimal | None = None
    fl_ratio: Decimal | None = None
    health_score: Decimal | None = None


class TaskSummary(BaseModel):
    id: UUID
    title: str
    status: str
    priority: str | None = None
    due_date: date | None = None


class SVVisitSummary(BaseModel):
    visit_date: date
    visit_type: str
    checklist_score: Decimal | None = None
    sv_name: str | None = None


class StoreDetail(BaseModel):
    id: UUID
    code: str
    name: str
    brand_name: str
    area_name: str | None = None
    region_name: str | None = None
    prefecture: str
    city: str
    address: str
    trade_area_type: str
    seat_count: int | None = None
    status: str
    health_score: Decimal | None = None
    improvement_opportunity: Decimal | None = None
    issue_types: list[str] = []
    kpi_history: list[KPIHistory] = []
    recent_tasks: list[TaskSummary] = []
    recent_sv_visits: list[SVVisitSummary] = []


class PLComponent(BaseModel):
    period_start: date
    period_end: date
    sales: Decimal
    cogs: Decimal
    gross_profit: Decimal
    labor_cost: Decimal
    rent: Decimal
    utilities: Decimal
    promotion_cost: Decimal
    other_expenses: Decimal
    operating_profit: Decimal


class StoreProfitGraph(BaseModel):
    store_id: UUID
    store_name: str
    periods: list[PLComponent]
