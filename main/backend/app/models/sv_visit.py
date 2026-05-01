import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import String, Date, Numeric, Text, ForeignKey, DateTime, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class SVVisit(Base):
    __tablename__ = "sv_visits"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[str] = mapped_column(String(36), ForeignKey("stores.id"), nullable=False, index=True)
    sv_employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id"), nullable=False)
    visit_date: Mapped[date] = mapped_column(Date, nullable=False)
    visit_type: Mapped[str] = mapped_column(String(50), nullable=False)
    checklist_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    notes: Mapped[str | None] = mapped_column(Text)
    findings: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    store = relationship("Store", back_populates="sv_visits")
    sv = relationship("Employee")
