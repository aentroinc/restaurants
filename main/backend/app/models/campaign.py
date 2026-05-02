import uuid
from datetime import date, datetime
from sqlalchemy import String, Integer, Float, Boolean, Date, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class MenuItem(Base):
    __tablename__ = "menu_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    brand_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("brands.id"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(30), nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cost: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    gross_margin_estimate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    is_new: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    launched_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    consumes_skus: Mapped[list | None] = mapped_column(JSONB, default=list)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    brand_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("brands.id"), nullable=True, index=True)
    target_menu_ids: Mapped[list | None] = mapped_column(JSONB, default=list)
    target_segment: Mapped[str] = mapped_column(String(50), nullable=False, default="all")
    target_store_ids: Mapped[list | None] = mapped_column(JSONB, default=list)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="planned")
    sales_lift_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    customer_lift_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    new_customer_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    repeat_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence_lower: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence_upper: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class CampaignBreakdown(Base):
    __tablename__ = "campaign_breakdowns"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    campaign_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False, index=True)
    dimension: Mapped[str] = mapped_column(String(30), nullable=False)
    bucket_key: Mapped[str] = mapped_column(String(50), nullable=False)
    sales_lift_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    customer_lift_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    sample_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
