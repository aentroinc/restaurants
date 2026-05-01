import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import Date, Integer, Numeric, ForeignKey, DateTime, func, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class HourlyStoreSales(Base):
    __tablename__ = "hourly_store_sales"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[str] = mapped_column(String(36), ForeignKey("stores.id"), nullable=False, index=True)
    business_date: Mapped[date] = mapped_column(Date, nullable=False)
    hour: Mapped[int] = mapped_column(Integer, nullable=False)
    net_sales: Mapped[Decimal] = mapped_column(Numeric(12, 0), nullable=False)
    customer_count: Mapped[int] = mapped_column(Integer, nullable=False)
    order_count: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    store = relationship("Store")
