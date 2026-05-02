import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import String, Integer, Numeric, Date, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class FranchiseAgreement(Base):
    __tablename__ = "franchise_agreements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    franchisee_company_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)
    agreement_type: Mapped[str] = mapped_column(String(30), nullable=False, default="direct")
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[date | None] = mapped_column(Date)
    royalty_structure: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    advertising_fund_rate: Mapped[Decimal] = mapped_column(Numeric(5, 4), default=Decimal("0"))
    territory_rights: Mapped[dict | None] = mapped_column(JSONB)
    minimum_revenue_guarantee: Mapped[Decimal | None] = mapped_column(Numeric(14, 0))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    store = relationship("Store")


class FranchiseRoyaltyCalc(Base):
    __tablename__ = "franchise_royalty_calcs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    agreement_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("franchise_agreements.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)
    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    period_month: Mapped[int] = mapped_column(Integer, nullable=False)
    gross_revenue: Mapped[Decimal] = mapped_column(Numeric(14, 0), nullable=False)
    royalty_base: Mapped[Decimal] = mapped_column(Numeric(14, 0), nullable=False)
    royalty_amount: Mapped[Decimal] = mapped_column(Numeric(14, 0), nullable=False)
    advertising_amount: Mapped[Decimal] = mapped_column(Numeric(14, 0), nullable=False, default=0)
    net_payable: Mapped[Decimal] = mapped_column(Numeric(14, 0), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    invoice_id: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    agreement = relationship("FranchiseAgreement")
    store = relationship("Store")
