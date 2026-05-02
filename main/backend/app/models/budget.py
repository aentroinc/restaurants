"""BudgetTarget — store-level budget targets used by Executive view to compute
budget vs actual. Granularity: monthly per (store, period).
"""
import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import String, Date, Numeric, ForeignKey, DateTime, UniqueConstraint, Index, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class BudgetTarget(Base):
    __tablename__ = "budget_targets"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "store_id", "period_start", "period_type",
            name="uq_budget_store_period",
        ),
        Index("ix_budget_tenant_store", "tenant_id", "store_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    period_type: Mapped[str] = mapped_column(String(20), nullable=False, default="month")

    target_sales: Mapped[Decimal] = mapped_column(Numeric(14, 0), nullable=False, default=0)
    target_cogs_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=Decimal("30.00"))
    target_labor_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=Decimal("28.00"))
    target_operating_profit: Mapped[Decimal] = mapped_column(Numeric(14, 0), nullable=False, default=0)

    notes: Mapped[str | None] = mapped_column(String(500))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
