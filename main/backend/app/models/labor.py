import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import Date, Numeric, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class LaborActual(Base):
    __tablename__ = "labor_actuals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)
    business_date: Mapped[date] = mapped_column(Date, nullable=False)
    labor_hours: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    labor_cost: Mapped[Decimal] = mapped_column(Numeric(12, 0), nullable=False)
    planned_labor_hours: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    planned_labor_cost: Mapped[Decimal | None] = mapped_column(Numeric(12, 0))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    store = relationship("Store")
