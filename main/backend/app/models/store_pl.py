import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import String, Date, Numeric, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class StorePL(Base):
    __tablename__ = "store_pl"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[str] = mapped_column(String(36), ForeignKey("stores.id"), nullable=False, index=True)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    period_type: Mapped[str] = mapped_column(String(20), nullable=False)
    sales: Mapped[Decimal] = mapped_column(Numeric(14, 0), nullable=False)
    cogs: Mapped[Decimal] = mapped_column(Numeric(14, 0), nullable=False)
    gross_profit: Mapped[Decimal] = mapped_column(Numeric(14, 0), nullable=False)
    labor_cost: Mapped[Decimal] = mapped_column(Numeric(14, 0), nullable=False)
    rent: Mapped[Decimal] = mapped_column(Numeric(14, 0), default=0)
    utilities: Mapped[Decimal] = mapped_column(Numeric(14, 0), default=0)
    promotion_cost: Mapped[Decimal] = mapped_column(Numeric(14, 0), default=0)
    other_expenses: Mapped[Decimal] = mapped_column(Numeric(14, 0), default=0)
    operating_profit: Mapped[Decimal] = mapped_column(Numeric(14, 0), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    store = relationship("Store", back_populates="pls")
