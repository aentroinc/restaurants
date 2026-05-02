from pydantic import BaseModel
from uuid import UUID
from datetime import date, datetime


class MenuItemRead(BaseModel):
    id: UUID
    brand_id: UUID
    brand_name: str | None = None
    code: str
    name: str
    category: str
    price: int
    cost: float
    gross_margin_estimate: float
    is_new: bool
    launched_at: date | None = None
    consumes_skus: list = []
    status: str


class MenuPerformanceCell(BaseModel):
    location_type: str
    time_slot: str
    sales_index: float
    customer_index: float
    sample_size: int


class MenuItemPerformance(BaseModel):
    menu_item_id: UUID
    name: str
    cells: list[MenuPerformanceCell] = []


class CampaignBreakdownRead(BaseModel):
    id: UUID
    dimension: str
    bucket_key: str
    sales_lift_pct: float
    customer_lift_pct: float
    sample_size: int


class CampaignRead(BaseModel):
    id: UUID
    name: str
    brand_id: UUID | None = None
    brand_name: str | None = None
    target_menu_ids: list = []
    target_segment: str
    target_store_ids: list = []
    start_date: date
    end_date: date
    status: str
    sales_lift_pct: float | None = None
    customer_lift_pct: float | None = None
    new_customer_rate: float | None = None
    repeat_rate: float | None = None
    confidence_lower: float | None = None
    confidence_upper: float | None = None
    breakdowns: list[CampaignBreakdownRead] = []
    created_at: datetime | None = None


class CampaignCreate(BaseModel):
    name: str
    brand_id: UUID | None = None
    target_menu_ids: list = []
    target_segment: str = "all"
    target_store_ids: list = []
    start_date: date
    end_date: date
    status: str = "planned"


class CampaignUpdate(BaseModel):
    name: str | None = None
    brand_id: UUID | None = None
    target_menu_ids: list | None = None
    target_segment: str | None = None
    target_store_ids: list | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: str | None = None
    sales_lift_pct: float | None = None
    customer_lift_pct: float | None = None
    new_customer_rate: float | None = None
    repeat_rate: float | None = None
    confidence_lower: float | None = None
    confidence_upper: float | None = None
