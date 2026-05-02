import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Float, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Factory(Base):
    __tablename__ = "factories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(30), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    region: Mapped[str | None] = mapped_column(String(50))
    prefecture: Mapped[str | None] = mapped_column(String(20))
    city: Mapped[str | None] = mapped_column(String(50))
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    capacity_tons_day: Mapped[float | None] = mapped_column(Float)
    utilization_pct: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(30), default="operational")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class DistributionCenter(Base):
    __tablename__ = "distribution_centers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(30), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    region: Mapped[str | None] = mapped_column(String(50))
    prefecture: Mapped[str | None] = mapped_column(String(20))
    city: Mapped[str | None] = mapped_column(String(50))
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    throughput_capacity_tons_day: Mapped[float | None] = mapped_column(Float)
    current_throughput: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(30), default="operational")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    routes = relationship("DeliveryRoute", back_populates="origin_dc")


class DeliveryRoute(Base):
    __tablename__ = "delivery_routes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(30), nullable=False)
    origin_dc_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("distribution_centers.id"), index=True)
    destination_area: Mapped[str | None] = mapped_column(String(100))
    destination_store_ids: Mapped[list | None] = mapped_column(JSONB, default=list)
    departure_time: Mapped[str | None] = mapped_column(String(10))
    eta_hours: Mapped[float | None] = mapped_column(Float)
    load_pct: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(30), default="on-time")
    delay_minutes: Mapped[int] = mapped_column(Integer, default=0)
    last_updated: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    origin_dc = relationship("DistributionCenter", back_populates="routes")
