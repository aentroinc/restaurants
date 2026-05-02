"""Eval framework models — runs and per-case results."""
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Float, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class EvalRun(Base):
    __tablename__ = "eval_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    set_name: Mapped[str] = mapped_column(String(120), nullable=False)
    model_tier: Mapped[str] = mapped_column(String(40), nullable=False, default="default")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")  # pending|running|done|error
    total_cases: Mapped[int] = mapped_column(Integer, default=0)
    passed_cases: Mapped[int] = mapped_column(Integer, default=0)
    avg_tool_match_rate: Mapped[float | None] = mapped_column(Float)
    avg_substring_hit_rate: Mapped[float | None] = mapped_column(Float)
    avg_judge_score: Mapped[float | None] = mapped_column(Float)
    results: Mapped[list | None] = mapped_column(JSONB, default=list)
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
