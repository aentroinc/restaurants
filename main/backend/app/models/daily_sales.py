import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import Date, Numeric, Integer, ForeignKey, DateTime, UniqueConstraint, func, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class DailyStoreSales(Base):
    __tablename__ = "daily_store_sales"
    __table_args__ = (UniqueConstraint("store_id", "business_date", name="uq_daily_sales_store_date"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[str] = mapped_column(String(36), ForeignKey("stores.id"), nullable=False, index=True)
    business_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    gross_sales: Mapped[Decimal] = mapped_column(Numeric(12, 0), nullable=False)
    net_sales: Mapped[Decimal] = mapped_column(Numeric(12, 0), nullable=False)
    customer_count: Mapped[int] = mapped_column(Integer, nullable=False)
    order_count: Mapped[int] = mapped_column(Integer, nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 0), default=0)
    dine_in_sales: Mapped[Decimal] = mapped_column(Numeric(12, 0), default=0)
    takeout_sales: Mapped[Decimal] = mapped_column(Numeric(12, 0), default=0)
    delivery_sales: Mapped[Decimal] = mapped_column(Numeric(12, 0), default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    store = relationship("Store", back_populates="daily_sales")
