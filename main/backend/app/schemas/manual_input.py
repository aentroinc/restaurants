"""Pydantic v2 schemas for the 8 manual-input ontology objects.

Each object exposes Create / Update / Response models. All Update fields are
optional so PATCH /{id} can do partial updates.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# 1. DailyReport
# ---------------------------------------------------------------------------

class DailyReportCreate(BaseModel):
    store_id: UUID
    report_date: date
    sales_summary_text: Optional[str] = None
    weather: Optional[str] = None
    special_events_text: Optional[str] = None
    notes: Optional[str] = None
    predicted_customers_tomorrow: Optional[int] = None
    predicted_sales_tomorrow: Optional[float] = None
    employee_id: Optional[UUID] = None


class DailyReportUpdate(BaseModel):
    sales_summary_text: Optional[str] = None
    weather: Optional[str] = None
    special_events_text: Optional[str] = None
    notes: Optional[str] = None
    predicted_customers_tomorrow: Optional[int] = None
    predicted_sales_tomorrow: Optional[float] = None


class DailyReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: UUID
    store_id: UUID
    report_date: date
    sales_summary_text: Optional[str] = None
    weather: Optional[str] = None
    special_events_text: Optional[str] = None
    notes: Optional[str] = None
    predicted_customers_tomorrow: Optional[int] = None
    predicted_sales_tomorrow: Optional[float] = None
    employee_id: Optional[UUID] = None
    submitted_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# 2. WasteLog
# ---------------------------------------------------------------------------

class WasteLogCreate(BaseModel):
    store_id: UUID
    waste_date: date
    product_id: Optional[UUID] = None
    ingredient_id: Optional[UUID] = None
    qty: float = 0
    unit: Optional[str] = None
    reason: str = Field(default="other", pattern="^(expired|dropped|over_made|wrong_made|other)$")
    cost_estimate: float = 0
    employee_id: Optional[UUID] = None
    photo_url: Optional[str] = None


class WasteLogUpdate(BaseModel):
    product_id: Optional[UUID] = None
    ingredient_id: Optional[UUID] = None
    qty: Optional[float] = None
    unit: Optional[str] = None
    reason: Optional[str] = Field(default=None, pattern="^(expired|dropped|over_made|wrong_made|other)$")
    cost_estimate: Optional[float] = None
    photo_url: Optional[str] = None


class WasteLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: UUID
    store_id: UUID
    waste_date: date
    product_id: Optional[UUID] = None
    ingredient_id: Optional[UUID] = None
    qty: float
    unit: Optional[str] = None
    reason: str
    cost_estimate: float
    employee_id: Optional[UUID] = None
    photo_url: Optional[str] = None
    created_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# 3. Complaint
# ---------------------------------------------------------------------------

class ComplaintCreate(BaseModel):
    store_id: UUID
    complaint_date: date
    customer_age_range: Optional[str] = None
    customer_gender: Optional[str] = None
    channel: str = Field(default="in_store", pattern="^(in_store|phone|email|sns)$")
    severity: str = Field(default="low", pattern="^(low|medium|high)$")
    content: str
    response_taken: Optional[str] = None
    resolved: bool = False
    follow_up_needed: bool = False
    employee_id: Optional[UUID] = None


class ComplaintUpdate(BaseModel):
    severity: Optional[str] = Field(default=None, pattern="^(low|medium|high)$")
    content: Optional[str] = None
    response_taken: Optional[str] = None
    resolved: Optional[bool] = None
    follow_up_needed: Optional[bool] = None


class ComplaintResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: UUID
    store_id: UUID
    complaint_date: date
    customer_age_range: Optional[str] = None
    customer_gender: Optional[str] = None
    channel: str
    severity: str
    content: str
    response_taken: Optional[str] = None
    resolved: bool
    follow_up_needed: bool
    employee_id: Optional[UUID] = None
    created_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# 4. EquipmentIssue
# ---------------------------------------------------------------------------

class EquipmentIssueCreate(BaseModel):
    store_id: UUID
    equipment_name: str
    equipment_category: str = Field(
        default="other",
        pattern="^(refrigerator|oven|pos|aircon|plumbing|other)$",
    )
    severity: str = Field(default="minor", pattern="^(minor|major|critical)$")
    description: Optional[str] = None
    photo_url: Optional[str] = None
    repair_requested: bool = False
    repair_status: str = Field(default="reported", pattern="^(reported|scheduled|done)$")
    employee_id: Optional[UUID] = None


class EquipmentIssueUpdate(BaseModel):
    severity: Optional[str] = Field(default=None, pattern="^(minor|major|critical)$")
    description: Optional[str] = None
    repair_requested: Optional[bool] = None
    repair_status: Optional[str] = Field(default=None, pattern="^(reported|scheduled|done)$")


class EquipmentIssueResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: UUID
    store_id: UUID
    equipment_name: str
    equipment_category: str
    severity: str
    description: Optional[str] = None
    photo_url: Optional[str] = None
    repair_requested: bool
    repair_status: str
    requested_at: Optional[datetime] = None
    employee_id: Optional[UUID] = None
    created_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# 5. AllergyResponse
# ---------------------------------------------------------------------------

class AllergyResponseCreate(BaseModel):
    store_id: UUID
    response_date: date
    customer_age_range: Optional[str] = None
    allergen: str = Field(pattern="^(wheat|egg|milk|soba|peanut|shrimp|crab|other)$")
    items_provided_json: list[dict[str, Any]] = Field(default_factory=list)
    response_taken: Optional[str] = None
    incident_occurred: bool = False
    employee_id: Optional[UUID] = None


class AllergyResponseUpdate(BaseModel):
    response_taken: Optional[str] = None
    incident_occurred: Optional[bool] = None
    items_provided_json: Optional[list[dict[str, Any]]] = None


class AllergyResponseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: UUID
    store_id: UUID
    response_date: date
    customer_age_range: Optional[str] = None
    allergen: str
    items_provided_json: Optional[list[dict[str, Any]]] = None
    response_taken: Optional[str] = None
    incident_occurred: bool
    employee_id: Optional[UUID] = None
    created_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# 6. LossReport
# ---------------------------------------------------------------------------

class LossReportCreate(BaseModel):
    store_id: UUID
    employee_id: Optional[UUID] = None
    item_id: Optional[UUID] = None
    item_name: str
    qty: float = 0
    reason: str = Field(default="other", pattern="^(spilled|dropped|broken|wrong_order|other)$")
    photo_url: Optional[str] = None
    cost_estimate: float = 0
    occurred_at: Optional[datetime] = None


class LossReportUpdate(BaseModel):
    qty: Optional[float] = None
    reason: Optional[str] = Field(default=None, pattern="^(spilled|dropped|broken|wrong_order|other)$")
    cost_estimate: Optional[float] = None


class LossReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: UUID
    store_id: UUID
    employee_id: Optional[UUID] = None
    item_id: Optional[UUID] = None
    item_name: str
    qty: float
    reason: str
    photo_url: Optional[str] = None
    cost_estimate: float
    occurred_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# 7. CustomerVoice
# ---------------------------------------------------------------------------

class CustomerVoiceCreate(BaseModel):
    store_id: UUID
    content: str
    sentiment: str = Field(default="neutral", pattern="^(positive|neutral|negative)$")
    source: str = Field(default="heard", pattern="^(heard|observed|online)$")
    rating: Optional[float] = None
    customer_age_range: Optional[str] = None
    employee_id: Optional[UUID] = None
    recorded_at: Optional[datetime] = None


class CustomerVoiceUpdate(BaseModel):
    content: Optional[str] = None
    sentiment: Optional[str] = Field(default=None, pattern="^(positive|neutral|negative)$")
    rating: Optional[float] = None


class CustomerVoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: UUID
    store_id: UUID
    content: str
    sentiment: str
    source: str
    rating: Optional[float] = None
    customer_age_range: Optional[str] = None
    employee_id: Optional[UUID] = None
    recorded_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# 8. CompetitorScan
# ---------------------------------------------------------------------------

class CompetitorScanCreate(BaseModel):
    sv_user_id: Optional[UUID] = None
    competitor_name: str
    competitor_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    observations_text: Optional[str] = None
    menu_observations_json: list[dict[str, Any]] = Field(default_factory=list)
    photos_json: list[str] = Field(default_factory=list)
    visited_at: Optional[datetime] = None
    area_id: Optional[UUID] = None


class CompetitorScanUpdate(BaseModel):
    observations_text: Optional[str] = None
    menu_observations_json: Optional[list[dict[str, Any]]] = None
    photos_json: Optional[list[str]] = None


class CompetitorScanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    tenant_id: UUID
    sv_user_id: Optional[UUID] = None
    competitor_name: str
    competitor_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    observations_text: Optional[str] = None
    menu_observations_json: Optional[list[dict[str, Any]]] = None
    photos_json: Optional[list[str]] = None
    visited_at: Optional[datetime] = None
    area_id: Optional[UUID] = None
    created_at: Optional[datetime] = None


__all__ = [
    "DailyReportCreate", "DailyReportUpdate", "DailyReportResponse",
    "WasteLogCreate", "WasteLogUpdate", "WasteLogResponse",
    "ComplaintCreate", "ComplaintUpdate", "ComplaintResponse",
    "EquipmentIssueCreate", "EquipmentIssueUpdate", "EquipmentIssueResponse",
    "AllergyResponseCreate", "AllergyResponseUpdate", "AllergyResponseResponse",
    "LossReportCreate", "LossReportUpdate", "LossReportResponse",
    "CustomerVoiceCreate", "CustomerVoiceUpdate", "CustomerVoiceResponse",
    "CompetitorScanCreate", "CompetitorScanUpdate", "CompetitorScanResponse",
]
