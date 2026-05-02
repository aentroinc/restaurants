import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Float, Numeric, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class TradeArea(Base):
    __tablename__ = "trade_areas"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, unique=True)
    radius_m: Mapped[int | None] = mapped_column(Integer, nullable=True)
    population_count: Mapped[int] = mapped_column(Integer, default=0)
    daytime_population: Mapped[int] = mapped_column(Integer, default=0)
    households: Mapped[int] = mapped_column(Integer, default=0)
    estimated_market_size_jpy: Mapped[int] = mapped_column(Integer, default=0)
    last_calculated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CompetitorStore(Base):
    __tablename__ = "competitor_stores"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    brand_name: Mapped[str] = mapped_column(String(100), nullable=False)
    business_category: Mapped[str] = mapped_column(String(50), nullable=False)
    lat: Mapped[float] = mapped_column(Numeric(10, 7), nullable=False)
    lon: Mapped[float] = mapped_column(Numeric(11, 7), nullable=False)
    estimated_revenue_jpy: Mapped[int | None] = mapped_column(Integer, nullable=True)
    distance_to_nearest_own_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    source: Mapped[str] = mapped_column(String(30), default="manual")  # google_places | manual
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PopulationMesh(Base):
    __tablename__ = "population_meshes"

    mesh_code: Mapped[str] = mapped_column(String(20), primary_key=True)
    lat: Mapped[float] = mapped_column(Numeric(10, 7), nullable=False)
    lon: Mapped[float] = mapped_column(Numeric(11, 7), nullable=False)
    population: Mapped[int] = mapped_column(Integer, nullable=False)
    daytime_population: Mapped[int] = mapped_column(Integer, nullable=False)
    households: Mapped[int] = mapped_column(Integer, nullable=False)
    age_distribution: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    income_class: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    last_updated: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
