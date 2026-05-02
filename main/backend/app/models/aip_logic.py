"""AIP Logic — ノーコード AI ロジック関数 (Foundry "AIP Logic" 相当).

`LogicFunction` は trigger (cron / event / anomaly) → predicate (式 AST) →
actions (action chain) を JSON で保持する。`LogicRun` は各実行の監査ログ。
既存 workflow / pipeline とは独立に動作する。
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class LogicFunction(Base):
    __tablename__ = "aip_logic_functions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    trigger_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    predicate_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    actions_json: Mapped[list] = mapped_column(JSONB, default=list)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        Index("ix_aip_logic_tenant_name", "tenant_id", "name"),
    )


class LogicRun(Base):
    __tablename__ = "aip_logic_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    function_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("aip_logic_functions.id", ondelete="CASCADE"), index=True, nullable=False)
    triggered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    trigger_payload_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    predicate_result: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    actions_executed_json: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)  # pending|success|failed|skipped
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("ix_aip_logic_run_function_time", "function_id", "triggered_at"),
    )
