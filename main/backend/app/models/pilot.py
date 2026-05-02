"""Zensho Pilot Package models — 8週間POCの一気通貫管理"""
import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import String, Date, Numeric, ForeignKey, DateTime, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


THEME_CHOICES = ["ZP-01", "ZP-02", "ZP-03", "ZP-04", "ZP-05"]


class PilotProject(Base):
    __tablename__ = "pilot_projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    target_brand_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("brands.id"), nullable=True)
    target_store_ids: Mapped[list] = mapped_column(ARRAY(UUID(as_uuid=True)), default=list)
    control_store_ids: Mapped[list] = mapped_column(ARRAY(UUID(as_uuid=True)), default=list)
    theme: Mapped[str] = mapped_column(String(20), nullable=False)  # ZP-01..ZP-05
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    baseline_start_date: Mapped[date] = mapped_column(Date, nullable=False)
    baseline_end_date: Mapped[date] = mapped_column(Date, nullable=False)
    intervention_start_date: Mapped[date] = mapped_column(Date, nullable=False)
    intervention_end_date: Mapped[date] = mapped_column(Date, nullable=False)
    success_kpis: Mapped[list] = mapped_column(JSONB, default=list)  # ["waste_amount", "stockout_rate"]
    target_improvement_pct: Mapped[dict] = mapped_column(JSONB, default=dict)  # {"waste_amount": 3.0}
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    sponsor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="planning")  # planning | running | completed | cancelled
    overlay_mode: Mapped[str] = mapped_column(String(20), default="read_only")  # read_only | writeback_approved
    contract_value_jpy: Mapped[Decimal | None] = mapped_column(Numeric(14, 0), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    interventions = relationship("PilotIntervention", back_populates="pilot", cascade="all, delete-orphan")
    results = relationship("PilotResult", back_populates="pilot", cascade="all, delete-orphan")


class PilotIntervention(Base):
    __tablename__ = "pilot_interventions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pilot_project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pilot_projects.id"), nullable=False, index=True)
    intervention_type: Mapped[str] = mapped_column(String(50), nullable=False)  # demand_optimization | shift_realignment | ...
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_store_ids: Mapped[list] = mapped_column(ARRAY(UUID(as_uuid=True)), default=list)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    expected_impact_yen: Mapped[Decimal | None] = mapped_column(Numeric(14, 0), nullable=True)
    actual_impact_yen: Mapped[Decimal | None] = mapped_column(Numeric(14, 0), nullable=True)
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="planned")  # planned | running | completed | aborted
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    pilot = relationship("PilotProject", back_populates="interventions")


class PilotResult(Base):
    """KPI 単位の効果計測結果（statistical test 込み）"""
    __tablename__ = "pilot_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pilot_project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pilot_projects.id"), nullable=False, index=True)
    kpi_name: Mapped[str] = mapped_column(String(80), nullable=False)
    baseline_value: Mapped[Decimal | None] = mapped_column(Numeric(20, 4), nullable=True)
    intervention_value: Mapped[Decimal | None] = mapped_column(Numeric(20, 4), nullable=True)
    control_value: Mapped[Decimal | None] = mapped_column(Numeric(20, 4), nullable=True)
    delta_absolute: Mapped[Decimal | None] = mapped_column(Numeric(20, 4), nullable=True)
    delta_pct: Mapped[Decimal | None] = mapped_column(Numeric(8, 4), nullable=True)
    p_value: Mapped[Decimal | None] = mapped_column(Numeric(10, 6), nullable=True)
    confidence_interval_low: Mapped[Decimal | None] = mapped_column(Numeric(20, 4), nullable=True)
    confidence_interval_high: Mapped[Decimal | None] = mapped_column(Numeric(20, 4), nullable=True)
    sample_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    significant: Mapped[bool] = mapped_column(default=False)  # p < 0.05
    annualized_impact_yen: Mapped[Decimal | None] = mapped_column(Numeric(14, 0), nullable=True)
    calculation_method: Mapped[str] = mapped_column(String(40), default="welch_t")  # welch_t | did | bootstrap
    assumptions: Mapped[dict] = mapped_column(JSONB, default=dict)  # {conversion_factor, seasonality_correction, ...}
    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    pilot = relationship("PilotProject", back_populates="results")
