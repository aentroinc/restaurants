import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Boolean, Numeric, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    brand_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("brands.id"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category_l1: Mapped[str] = mapped_column(String(50), nullable=False)
    category_l2: Mapped[str | None] = mapped_column(String(50))
    price: Mapped[Decimal] = mapped_column(Numeric(10, 0), nullable=False)
    theoretical_cost: Mapped[Decimal | None] = mapped_column(Numeric(10, 0))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    limited_time_offer: Mapped[bool] = mapped_column(Boolean, default=False)
    # 軽減税率 (日本): 0.08 (食品/テイクアウト/新聞), 0.10 (酒類/イートイン/その他標準),
    # 0.00 (非課税)。tax_category: standard / reduced / exempt。
    tax_rate: Mapped[Decimal] = mapped_column(Numeric(4, 3), nullable=False, server_default="0.10")
    tax_category: Mapped[str] = mapped_column(String(20), nullable=False, server_default="standard")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    brand = relationship("Brand", back_populates="products")
