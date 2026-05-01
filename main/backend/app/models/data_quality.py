import uuid
from datetime import datetime
from sqlalchemy import String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class DataQualityIssue(Base):
    __tablename__ = "data_quality_issues"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(36), nullable=False)
    field_name: Mapped[str] = mapped_column(String(100), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    rule_key: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="open")
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
