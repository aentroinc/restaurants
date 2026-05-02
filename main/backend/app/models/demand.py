import uuid
from datetime import date, datetime
from sqlalchemy import String, Integer, Float, Date, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class SKU(Base):
    __tablename__ = "skus"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(30), nullable=False)
    storage_type: Mapped[str] = mapped_column(String(10), nullable=False)
    shelf_life_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unit_cost: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    unit: Mapped[str] = mapped_column(String(20), nullable=False, default="kg")
    factory_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("factories.id"), nullable=True, index=True)
    primary_dc_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("distribution_centers.id"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class InventorySnapshot(Base):
    __tablename__ = "inventory_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)
    sku_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("skus.id"), nullable=False, index=True)
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    on_hand_quantity: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    days_of_supply: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    waste_risk_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    stockout_risk_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DemandForecast(Base):
    __tablename__ = "demand_forecasts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    sku_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("skus.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=True, index=True)
    forecast_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    forecasted_quantity: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    confidence_lower: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    confidence_upper: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    actual_quantity: Mapped[float | None] = mapped_column(Float, nullable=True)
    accuracy_mape: Mapped[float | None] = mapped_column(Float, nullable=True)
    model_version: Mapped[str] = mapped_column(String(30), nullable=False, default="v1")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ReplenishmentRecommendation(Base):
    __tablename__ = "replenishment_recommendations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)
    sku_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("skus.id"), nullable=False, index=True)
    recommended_quantity: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    recommended_units: Mapped[str] = mapped_column(String(20), nullable=False, default="cases")
    reason: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    priority: Mapped[str] = mapped_column(String(10), nullable=False, default="medium")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
