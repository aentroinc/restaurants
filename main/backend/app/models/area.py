import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Area(Base):
    __tablename__ = "areas"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    region_id: Mapped[str] = mapped_column(String(36), ForeignKey("regions.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    sv_employee_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("employees.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    region = relationship("Region", back_populates="areas")
    stores = relationship("Store", back_populates="area")
    sv = relationship("Employee", foreign_keys=[sv_employee_id])
