import uuid
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime, func, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class DataSourceV2(Base):
    __tablename__ = "data_sources_v2"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)  # csv | smaregi | airregi | square | king_of_time
    system_category: Mapped[str] = mapped_column(String(50), nullable=False)  # pos | labor | accounting | review | manual
    auth_type: Mapped[str] = mapped_column(String(30), nullable=False, default="none")  # none | oauth2 | api_key
    credentials_encrypted: Mapped[str | None] = mapped_column(Text)
    config: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    status: Mapped[str] = mapped_column(String(30), default="disconnected")  # connected | disconnected | error
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class IngestionJob(Base):
    __tablename__ = "ingestion_jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    data_source_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("data_sources_v2.id"), nullable=False, index=True)
    job_type: Mapped[str] = mapped_column(String(50), nullable=False)  # initial_sync | incremental | manual_backfill | csv_upload
    status: Mapped[str] = mapped_column(String(30), default="queued")  # queued | running | success | failed | partial
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    rows_fetched: Mapped[int] = mapped_column(Integer, default=0)
    rows_loaded: Mapped[int] = mapped_column(Integer, default=0)
    rows_rejected: Mapped[int] = mapped_column(Integer, default=0)
    cursor_value: Mapped[str | None] = mapped_column(String(500))
    error_log: Mapped[list | None] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
