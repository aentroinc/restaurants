import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import String, Integer, Numeric, Date, ForeignKey, DateTime, Index, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class DemandForecast30m(Base):
    __tablename__ = "demand_forecast_30m"
    __table_args__ = (
        UniqueConstraint("tenant_id", "store_id", "slot_start", name="uq_demand_30m_store_slot"),
        Index("ix_demand_30m_tenant_store_slot", "tenant_id", "store_id", "slot_start"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)
    slot_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    predicted_customers: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    predicted_sales: Mapped[Decimal] = mapped_column(Numeric(12, 0), nullable=False)
    confidence: Mapped[Decimal] = mapped_column(Numeric(4, 2), default=Decimal("0.80"))
    factors_json: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    store = relationship("Store")


class LaborRequirement(Base):
    __tablename__ = "labor_requirements"
    __table_args__ = (
        UniqueConstraint("tenant_id", "store_id", "slot_start", name="uq_labor_req_store_slot"),
        Index("ix_labor_req_tenant_store_slot", "tenant_id", "store_id", "slot_start"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)
    slot_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    required_fte: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    role_split_json: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    store = relationship("Store")


class ShiftDraft(Base):
    __tablename__ = "shift_drafts"
    __table_args__ = (
        Index("ix_shift_drafts_tenant_store_week", "tenant_id", "store_id", "week_start"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)
    week_start: Mapped[date] = mapped_column(Date, nullable=False)
    draft_json: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    cost_estimate: Mapped[Decimal] = mapped_column(Numeric(12, 0), default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    store = relationship("Store")
