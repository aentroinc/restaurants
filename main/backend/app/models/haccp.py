import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Boolean, Numeric, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class CCPDefinition(Base):
    __tablename__ = "ccp_definitions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    threshold_min: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    threshold_max: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    monitoring_frequency: Mapped[str] = mapped_column(String(50), nullable=False, default="daily")
    monitoring_method: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    monitoring_records = relationship("HACCPMonitoring", back_populates="ccp")


class HACCPMonitoring(Base):
    __tablename__ = "haccp_monitoring"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)
    ccp_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ccp_definitions.id"), nullable=False, index=True)
    monitoring_date_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    measured_value: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    is_compliant: Mapped[bool] = mapped_column(Boolean, nullable=False)
    deviation_action: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    store = relationship("Store")
    ccp = relationship("CCPDefinition", back_populates="monitoring_records")


class AllergenMatrix(Base):
    __tablename__ = "allergen_matrix"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False, index=True)
    allergen_code: Mapped[str] = mapped_column(String(50), nullable=False)
    presence: Mapped[str] = mapped_column(String(20), nullable=False, default="none")
    cross_contamination_risk: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product")
