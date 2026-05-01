import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import String, Date, Numeric, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    store_id: Mapped[str] = mapped_column(String(36), ForeignKey("stores.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    issue_type: Mapped[str | None] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(30), default="open")
    priority: Mapped[str | None] = mapped_column(String(20))
    assigned_to: Mapped[str | None] = mapped_column(String(36), ForeignKey("employees.id"))
    created_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("employees.id"))
    due_date: Mapped[date | None] = mapped_column(Date)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expected_impact_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 0))
    realized_impact_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 0))
    source: Mapped[str] = mapped_column(String(30), default="manual")
    related_workflow_id: Mapped[str | None] = mapped_column(String(36))
    related_value_case_id: Mapped[str | None] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    store = relationship("Store", back_populates="tasks")
    assignee = relationship("Employee", foreign_keys=[assigned_to])
    creator = relationship("Employee", foreign_keys=[created_by])
