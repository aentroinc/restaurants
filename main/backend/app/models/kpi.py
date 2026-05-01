import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import String, Date, Numeric, ForeignKey, DateTime, UniqueConstraint, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class StoreDailyKPI(Base):
    __tablename__ = "store_daily_kpi"
    __table_args__ = (UniqueConstraint("store_id", "business_date", name="uq_kpi_store_date"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[str] = mapped_column(String(36), ForeignKey("stores.id"), nullable=False, index=True)
    business_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    net_sales: Mapped[Decimal] = mapped_column(Numeric(12, 0), nullable=False)
    customer_count: Mapped[int | None] = mapped_column()
    avg_ticket: Mapped[Decimal | None] = mapped_column(Numeric(10, 0))
    cogs: Mapped[Decimal | None] = mapped_column(Numeric(12, 0))
    cogs_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    labor_cost: Mapped[Decimal | None] = mapped_column(Numeric(12, 0))
    labor_cost_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    fl_ratio: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    sales_per_labor_hour: Mapped[Decimal | None] = mapped_column(Numeric(10, 0))
    gross_profit: Mapped[Decimal | None] = mapped_column(Numeric(12, 0))
    gross_profit_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    operating_profit: Mapped[Decimal | None] = mapped_column(Numeric(12, 0))
    operating_profit_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    review_score: Mapped[Decimal | None] = mapped_column(Numeric(3, 2))
    health_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    improvement_opportunity_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 0))
    issue_types: Mapped[dict | None] = mapped_column(JSON)
    peer_group: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    store = relationship("Store", back_populates="kpis")
