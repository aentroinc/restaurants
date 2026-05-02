"""労務コンプライアンス違反 永続化モデル。

rule_code:
  ART36_MONTHLY / ART36_YEARLY / ART36_SPECIAL
  BREAK_6H / BREAK_8H
  MINOR_NIGHT
  CONSECUTIVE_DAYS
  INTERVAL_11H
  MIN_WAGE

severity:
  warn  — 警告 (UIで黄色、シフト生成は通す)
  block — 違反 (UIで赤色、新規打刻 / シフト割当をブロック)
"""
from __future__ import annotations

import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, Index, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ComplianceViolation(Base):
    __tablename__ = "compliance_violations"
    __table_args__ = (
        Index("ix_cv_tenant_emp_time", "tenant_id", "employee_id", "occurred_at"),
        Index("ix_cv_tenant_store_time", "tenant_id", "store_id", "occurred_at"),
        Index("ix_cv_tenant_rule", "tenant_id", "rule_code"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=True, index=True)
    rule_code: Mapped[str] = mapped_column(String(32), nullable=False)
    severity: Mapped[str] = mapped_column(String(8), nullable=False)  # warn | block
    detail_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
