"""Connector productionization: credential vault + schedule + data contract"""
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, ForeignKey, DateTime, Integer, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ConnectorCredentialRef(Base):
    """credentials は Vault/Secrets Manager に保存、DB は参照IDのみ"""
    __tablename__ = "connector_credential_refs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    data_source_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("data_sources_v2.id"), unique=True)
    secret_provider: Mapped[str] = mapped_column(String(30), default="local_fernet")  # local_fernet | aws_sm | vault
    secret_ref: Mapped[str] = mapped_column(String(500), nullable=False)  # Vault path or ARN or local key id
    rotation_status: Mapped[str] = mapped_column(String(20), default="active")  # active | rotating | expired
    last_rotated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rotation_interval_days: Mapped[int] = mapped_column(default=90)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ConnectorSchedule(Base):
    __tablename__ = "connector_schedules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    data_source_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("data_sources_v2.id"))
    frequency: Mapped[str] = mapped_column(String(20), default="daily")     # hourly | daily | weekly | manual
    cron_expression: Mapped[str | None] = mapped_column(String(50), nullable=True)
    timezone: Mapped[str] = mapped_column(String(40), default="Asia/Tokyo")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    retry_policy: Mapped[dict] = mapped_column(JSONB, default=lambda: {"max_attempts": 5, "backoff": "exponential"})
    next_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DataContractRule(Base):
    """ingest 時に検査するルール（必須列・型・freshness・volume）"""
    __tablename__ = "data_contract_rules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    data_contract_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("data_contracts.id"))
    rule_type: Mapped[str] = mapped_column(String(40), nullable=False)
    # required_field | type_check | enum | not_null | range | freshness_sla | volume_min | volume_max
    field_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    expected_value: Mapped[dict] = mapped_column(JSONB, default=dict)        # {"min": 0, "max": 100} 等
    severity: Mapped[str] = mapped_column(String(20), default="warning")     # blocker | error | warning | info
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
