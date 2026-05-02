import uuid
from datetime import date, datetime
from sqlalchemy import String, Integer, Float, Date, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class LocationCandidate(Base):
    __tablename__ = "location_candidates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    brand_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("brands.id"), nullable=True, index=True)
    lat: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    lng: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    prefecture: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    city: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    address: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    population_radius_1km: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    competitor_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cannibalization_risk_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    delivery_distance_km: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    staff_difficulty_score: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    expected_daily_sales: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    expected_payback_months: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="under_review")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class RenovationProject(Base):
    __tablename__ = "renovation_projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)
    package_type: Mapped[str] = mapped_column(String(50), nullable=False)
    capex_myen: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="planned")
    expected_ticket_lift_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    expected_customer_lift_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    actual_ticket_lift_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    actual_customer_lift_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    payback_months: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
