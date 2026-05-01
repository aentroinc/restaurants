import uuid
from datetime import datetime
from sqlalchemy import String, Text, ForeignKey, DateTime, func, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class AIQueryLog(Base):
    __tablename__ = "ai_query_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    user_id: Mapped[str | None] = mapped_column(String(36))
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[dict | None] = mapped_column(JSON)
    referenced_entities: Mapped[dict | None] = mapped_column(JSON)
    confidence: Mapped[str | None] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
