import uuid
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime, func, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class IngestionBatch(Base):
    __tablename__ = "ingestion_batches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    source_system: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_name: Mapped[str | None] = mapped_column(String(500))
    file_hash: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(30), default="uploaded")
    row_count: Mapped[int | None] = mapped_column(Integer)
    valid_row_count: Mapped[int | None] = mapped_column(Integer)
    invalid_row_count: Mapped[int | None] = mapped_column(Integer)
    uploaded_by: Mapped[str | None] = mapped_column(String(36))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    promoted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class DataContract(Base):
    __tablename__ = "data_contracts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    source_system: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(30), default="draft")
    required_columns: Mapped[dict | None] = mapped_column(JSON)
    optional_columns: Mapped[dict | None] = mapped_column(JSON)
    validation_rules: Mapped[dict | None] = mapped_column(JSON)
    sample_file_url: Mapped[str | None] = mapped_column(String(500))
    approved_by: Mapped[str | None] = mapped_column(String(36))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SchemaMapping(Base):
    __tablename__ = "schema_mappings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    source_system: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    mapping_name: Mapped[str] = mapped_column(String(255), nullable=False)
    mapping_version: Mapped[int] = mapped_column(Integer, default=1)
    source_columns: Mapped[dict | None] = mapped_column(JSON)
    target_mappings: Mapped[dict | None] = mapped_column(JSON)
    transform_rules: Mapped[dict | None] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(30), default="draft")
    created_by: Mapped[str | None] = mapped_column(String(36))
    approved_by: Mapped[str | None] = mapped_column(String(36))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
