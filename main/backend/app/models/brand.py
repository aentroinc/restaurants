import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Brand(Base):
    __tablename__ = "brands"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    company_id: Mapped[str] = mapped_column(String(36), ForeignKey("companies.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    service_model: Mapped[str] = mapped_column(String(50), nullable=False)
    logo_url: Mapped[str | None] = mapped_column(String(500))
    settings: Mapped[dict | None] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    company = relationship("Company", back_populates="brands")
    stores = relationship("Store", back_populates="brand")
    products = relationship("Product", back_populates="brand")
