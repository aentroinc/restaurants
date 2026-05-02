import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import Date, Numeric, Integer, ForeignKey, DateTime, UniqueConstraint, Index, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class SalesTaxBreakdown(Base):
    """日次・税率別 売上集計 (軽減税率 8% / 10% の混在を分離)。

    インボイス制度 (適格請求書) の集計元データ。
    POS 取込時に dining_type (eat_in/takeout/delivery) と
    Product.tax_category から税率を確定し、ここに 1 日 1 (store, rate) で投入。
    """
    __tablename__ = "sales_tax_breakdown"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "store_id", "business_date", "tax_rate",
            name="uq_tax_breakdown_store_date_rate",
        ),
        Index("ix_tax_breakdown_tenant_date", "tenant_id", "business_date"),
        Index("ix_tax_breakdown_store_date", "store_id", "business_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)
    business_date: Mapped[date] = mapped_column(Date, nullable=False)
    tax_rate: Mapped[Decimal] = mapped_column(Numeric(4, 3), nullable=False)
    net_sales: Mapped[Decimal] = mapped_column(Numeric(12, 0), nullable=False, default=0)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 0), nullable=False, default=0)
    transaction_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    store = relationship("Store")
