import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class IndustryPlaybook(Base):
    __tablename__ = "industry_playbooks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    company_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("companies.id"))
    service_model: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    kpi_definitions: Mapped[dict | None] = mapped_column(JSON)
    issue_rules: Mapped[dict | None] = mapped_column(JSON)
    recommended_actions: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    company = relationship("Company")
