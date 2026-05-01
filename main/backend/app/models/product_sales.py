import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import Date, Integer, Numeric, ForeignKey, DateTime, func, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class DailyProductSales(Base):
    __tablename__ = "daily_product_sales"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[str] = mapped_column(String(36), ForeignKey("stores.id"), nullable=False, index=True)
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("products.id"), nullable=False, index=True)
    business_date: Mapped[date] = mapped_column(Date, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    net_sales: Mapped[Decimal] = mapped_column(Numeric(12, 0), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 0), default=0)
    theoretical_cogs: Mapped[Decimal] = mapped_column(Numeric(12, 0), default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    store = relationship("Store")
    product = relationship("Product")
