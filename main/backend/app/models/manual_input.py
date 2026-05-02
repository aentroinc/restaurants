"""Manual-input ontology objects (8 objects).

Captures the 8 categories of data that REQUIRE direct human input — i.e.
no upstream system / connector can fill them in:

  1. DailyReport       - 店長日報
  2. WasteLog          - 廃棄
  3. Complaint         - クレーム
  4. EquipmentIssue    - 設備故障
  5. AllergyResponse   - アレルギー対応
  6. LossReport        - ロス報告
  7. CustomerVoice     - お客様の声
  8. CompetitorScan    - 競合視察

All tables follow the standard tenant-isolation pattern (`tenant_id`) and
emit audit trail entries via the manual-input engine.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean, Date, DateTime, ForeignKey, Index, Integer, Numeric, String,
    Text, func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


# ---------------------------------------------------------------------------
# 1. DailyReport — 店長日報
# ---------------------------------------------------------------------------

class DailyReport(Base):
    __tablename__ = "manual_daily_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)
    report_date: Mapped[date] = mapped_column(Date, nullable=False)
    sales_summary_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    weather: Mapped[str | None] = mapped_column(String(40), nullable=True)
    special_events_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    predicted_customers_tomorrow: Mapped[int | None] = mapped_column(Integer, nullable=True)
    predicted_sales_tomorrow: Mapped[Decimal | None] = mapped_column(Numeric(12, 0), nullable=True)
    employee_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_manual_daily_reports_store_date", "store_id", "report_date"),
    )


# ---------------------------------------------------------------------------
# 2. WasteLog — 廃棄
# ---------------------------------------------------------------------------

class WasteLog(Base):
    __tablename__ = "manual_waste_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)
    waste_date: Mapped[date] = mapped_column(Date, nullable=False)
    product_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=True)
    ingredient_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("ingredients.id"), nullable=True)
    qty: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False, default=0)
    unit: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # one of: expired / dropped / over_made / wrong_made / other
    reason: Mapped[str] = mapped_column(String(20), nullable=False, default="other")
    cost_estimate: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    employee_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_manual_waste_logs_store_date", "store_id", "waste_date"),
        Index("ix_manual_waste_logs_reason", "reason"),
    )


# ---------------------------------------------------------------------------
# 3. Complaint — クレーム
# ---------------------------------------------------------------------------

class Complaint(Base):
    __tablename__ = "manual_complaints"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)
    complaint_date: Mapped[date] = mapped_column(Date, nullable=False)
    customer_age_range: Mapped[str | None] = mapped_column(String(20), nullable=True)
    customer_gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # one of: in_store / phone / email / sns
    channel: Mapped[str] = mapped_column(String(20), nullable=False, default="in_store")
    # one of: low / medium / high
    severity: Mapped[str] = mapped_column(String(10), nullable=False, default="low")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    response_taken: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    follow_up_needed: Mapped[bool] = mapped_column(Boolean, default=False)
    employee_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_manual_complaints_store_date", "store_id", "complaint_date"),
        Index("ix_manual_complaints_severity", "severity"),
    )


# ---------------------------------------------------------------------------
# 4. EquipmentIssue — 設備故障
# ---------------------------------------------------------------------------

class EquipmentIssue(Base):
    __tablename__ = "manual_equipment_issues"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)
    equipment_name: Mapped[str] = mapped_column(String(200), nullable=False)
    # one of: refrigerator / oven / pos / aircon / plumbing / other
    equipment_category: Mapped[str] = mapped_column(String(30), nullable=False, default="other")
    # one of: minor / major / critical
    severity: Mapped[str] = mapped_column(String(10), nullable=False, default="minor")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    repair_requested: Mapped[bool] = mapped_column(Boolean, default=False)
    # one of: reported / scheduled / done
    repair_status: Mapped[str] = mapped_column(String(20), nullable=False, default="reported")
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    employee_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_manual_equipment_issues_store_status", "store_id", "repair_status"),
        Index("ix_manual_equipment_issues_severity", "severity"),
    )


# ---------------------------------------------------------------------------
# 5. AllergyResponse — アレルギー対応
# ---------------------------------------------------------------------------

class AllergyResponse(Base):
    __tablename__ = "manual_allergy_responses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)
    response_date: Mapped[date] = mapped_column(Date, nullable=False)
    customer_age_range: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # one of: wheat / egg / milk / soba / peanut / shrimp / crab / other
    allergen: Mapped[str] = mapped_column(String(20), nullable=False)
    items_provided_json: Mapped[list | None] = mapped_column(JSONB, default=list)
    response_taken: Mapped[str | None] = mapped_column(Text, nullable=True)
    incident_occurred: Mapped[bool] = mapped_column(Boolean, default=False)
    employee_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_manual_allergy_store_date", "store_id", "response_date"),
        Index("ix_manual_allergy_allergen", "allergen"),
    )


# ---------------------------------------------------------------------------
# 6. LossReport — ロス報告
# ---------------------------------------------------------------------------

class LossReport(Base):
    __tablename__ = "manual_loss_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)
    employee_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    item_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    item_name: Mapped[str] = mapped_column(String(200), nullable=False)
    qty: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False, default=0)
    # one of: spilled / dropped / broken / wrong_order / other
    reason: Mapped[str] = mapped_column(String(20), nullable=False, default="other")
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cost_estimate: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_manual_loss_reports_store_occurred", "store_id", "occurred_at"),
    )


# ---------------------------------------------------------------------------
# 7. CustomerVoice — お客様の声
# ---------------------------------------------------------------------------

class CustomerVoice(Base):
    __tablename__ = "manual_customer_voices"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # one of: positive / neutral / negative
    sentiment: Mapped[str] = mapped_column(String(20), nullable=False, default="neutral")
    # one of: heard / observed / online
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="heard")
    rating: Mapped[Decimal | None] = mapped_column(Numeric(3, 1), nullable=True)
    customer_age_range: Mapped[str | None] = mapped_column(String(20), nullable=True)
    employee_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_manual_customer_voices_store_recorded", "store_id", "recorded_at"),
        Index("ix_manual_customer_voices_sentiment", "sentiment"),
    )


# ---------------------------------------------------------------------------
# 8. CompetitorScan — 競合視察
# ---------------------------------------------------------------------------

class CompetitorScan(Base):
    __tablename__ = "manual_competitor_scans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    sv_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    competitor_name: Mapped[str] = mapped_column(String(200), nullable=False)
    competitor_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    observations_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    menu_observations_json: Mapped[list | None] = mapped_column(JSONB, default=list)
    photos_json: Mapped[list | None] = mapped_column(JSONB, default=list)
    visited_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    area_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("areas.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_manual_competitor_scans_visited", "visited_at"),
        Index("ix_manual_competitor_scans_area", "area_id"),
    )


__all__ = [
    "DailyReport",
    "WasteLog",
    "Complaint",
    "EquipmentIssue",
    "AllergyResponse",
    "LossReport",
    "CustomerVoice",
    "CompetitorScan",
]
