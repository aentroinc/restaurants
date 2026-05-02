import uuid
from datetime import date, datetime
from sqlalchemy import String, Integer, Numeric, Date, DateTime, ForeignKey, func, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class PriceDecision(Base):
    __tablename__ = "price_decisions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    decided_price: Mapped[int] = mapped_column(Integer, nullable=False)
    previous_price: Mapped[int] = mapped_column(Integer, nullable=False)
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[date | None] = mapped_column(Date, nullable=True)
    rationale: Mapped[str | None] = mapped_column(String(500), nullable=True)
    decision_method: Mapped[str] = mapped_column(String(30), default="manual")  # data_driven | competitive | cost_plus | manual
    expected_volume_change_pct: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    actual_volume_change_pct: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    decided_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    decided_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PriceElasticity(Base):
    __tablename__ = "price_elasticities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    elasticity: Mapped[float] = mapped_column(Numeric(6, 3), nullable=False)
    confidence_interval_low: Mapped[float] = mapped_column(Numeric(6, 3), nullable=False)
    confidence_interval_high: Mapped[float] = mapped_column(Numeric(6, 3), nullable=False)
    sample_period_start: Mapped[date] = mapped_column(Date, nullable=False)
    sample_period_end: Mapped[date] = mapped_column(Date, nullable=False)
    sample_size: Mapped[int] = mapped_column(Integer, nullable=False)
    r_squared: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False)
    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_price_elasticity_tenant_product", "tenant_id", "product_id", unique=True),
    )
