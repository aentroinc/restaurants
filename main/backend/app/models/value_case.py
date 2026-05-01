import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import String, Date, Numeric, ForeignKey, DateTime, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ValueCase(Base):
    __tablename__ = "value_cases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    issue_type: Mapped[str] = mapped_column(String(50), nullable=False)
    target_store_ids: Mapped[list | None] = mapped_column(JSON)
    baseline_start: Mapped[date] = mapped_column(Date, nullable=False)
    baseline_end: Mapped[date] = mapped_column(Date, nullable=False)
    measurement_start: Mapped[date] = mapped_column(Date, nullable=False)
    measurement_end: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(30), default="active")
    expected_impact_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 0))
    realized_impact_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 0))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    company = relationship("Company")
    metrics = relationship("ValueCaseMetric", back_populates="value_case")


class ValueCaseMetric(Base):
    __tablename__ = "value_case_metrics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    value_case_id: Mapped[str] = mapped_column(String(36), ForeignKey("value_cases.id"), nullable=False, index=True)
    metric_name: Mapped[str] = mapped_column(String(100), nullable=False)
    baseline_value: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    measured_value: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    peer_adjusted_value: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    estimated_impact_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 0))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    value_case = relationship("ValueCase", back_populates="metrics")
