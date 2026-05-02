"""Cost-variance models (food cost theoretical-vs-actual analytics).

Three tables:
- inventory_counts   : raw store-level stocktake input (one row per ingredient/period)
- theoretical_costs  : computed expected usage from BOM x sales for a period
- cost_variances     : (theoretical - actual) deltas with classified root_cause_hint
"""
import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import String, Numeric, ForeignKey, DateTime, Date, Index, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class InventoryCount(Base):
    __tablename__ = "inventory_counts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)
    count_date: Mapped[date] = mapped_column(Date, nullable=False)
    ingredient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ingredients.id"), nullable=False, index=True)
    qty_actual: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    notes: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_inventory_counts_store_date", "store_id", "count_date"),
    )


class TheoreticalCost(Base):
    __tablename__ = "theoretical_costs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)
    period_date: Mapped[date] = mapped_column(Date, nullable=False)
    ingredient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ingredients.id"), nullable=False, index=True)
    qty_theoretical: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False, default=0)
    cost_theoretical: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_theoretical_costs_store_period", "store_id", "period_date"),
    )


class CostVariance(Base):
    __tablename__ = "cost_variances"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)
    period_date: Mapped[date] = mapped_column(Date, nullable=False)
    ingredient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ingredients.id"), nullable=False, index=True)
    qty_diff: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False, default=0)
    cost_diff: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    variance_pct: Mapped[float] = mapped_column(Numeric(8, 4), nullable=False, default=0)
    # one of: waste / theft / over_portion / recipe_drift / ok
    root_cause_hint: Mapped[str] = mapped_column(String(30), nullable=False, default="ok")
    # one of: low / medium / high
    severity: Mapped[str] = mapped_column(String(10), nullable=False, default="low")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_cost_variances_store_period", "store_id", "period_date"),
        Index("ix_cost_variances_severity", "severity"),
    )
