"""RAG document store.

Uses pgvector when available (`Vector`); falls back to JSONB array of
floats otherwise so seed + search work in environments without the
extension installed (CI, dev). Production must enable `CREATE EXTENSION
vector` for native cosine_distance.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

EMBEDDING_DIM = 1024


# Try to use the real Vector type; fall back to JSONB if pgvector is missing.
try:
    from pgvector.sqlalchemy import Vector  # type: ignore
    _embedding_col = lambda: mapped_column(Vector(EMBEDDING_DIM))  # noqa: E731
    PGVECTOR_AVAILABLE = True
except Exception:  # pragma: no cover -- optional dep
    _embedding_col = lambda: mapped_column(JSONB)  # noqa: E731
    PGVECTOR_AVAILABLE = False


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, nullable=False)
    type: Mapped[str] = mapped_column(String(32), nullable=False)
    source_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding = _embedding_col()
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_documents_tenant_type", "tenant_id", "type"),
    )
