import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Integer, Boolean, Numeric, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ShiftPattern(Base):
    __tablename__ = "shift_patterns"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    weekday_pattern: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    role_requirements: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    store = relationship("Store")


class Shift(Base):
    __tablename__ = "shifts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    actual_start_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    actual_end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    break_minutes: Mapped[int] = mapped_column(Integer, default=0)
    overtime_hours: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    night_hours: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    legal_violations: Mapped[dict | None] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    store = relationship("Store")
    employee = relationship("Employee")


class LaborLawProfile(Base):
    __tablename__ = "labor_law_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    weekly_max_hours: Mapped[int] = mapped_column(Integer, default=40)
    daily_max_hours: Mapped[int] = mapped_column(Integer, default=8)
    night_premium_rate: Mapped[Decimal] = mapped_column(Numeric(4, 2), default=Decimal("1.25"))
    overtime_premium_rate: Mapped[Decimal] = mapped_column(Numeric(4, 2), default=Decimal("1.25"))
    rest_min_minutes_per_6h: Mapped[int] = mapped_column(Integer, default=45)
    rest_min_minutes_per_8h: Mapped[int] = mapped_column(Integer, default=60)
    rest_interval_min_hours: Mapped[int] = mapped_column(Integer, default=11)
    minor_under_18_no_night: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
