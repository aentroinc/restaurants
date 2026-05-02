import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, func, Text, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ConnectorCredential(Base):
    """Per-tenant per-connector OAuth/API credentials.

    access_token_enc / refresh_token_enc are Fernet-encrypted ciphertext.
    """

    __tablename__ = "connector_credentials"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    connector_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    auth_type: Mapped[str] = mapped_column(String(30), nullable=False, default="oauth2")
    access_token_enc: Mapped[str | None] = mapped_column(Text)
    refresh_token_enc: Mapped[str | None] = mapped_column(Text)
    api_key_enc: Mapped[str | None] = mapped_column(Text)
    api_secret_enc: Mapped[str | None] = mapped_column(Text)
    token_type: Mapped[str | None] = mapped_column(String(30))
    scope: Mapped[str | None] = mapped_column(String(500))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    merchant_id: Mapped[str | None] = mapped_column(String(255))
    contract_id: Mapped[str | None] = mapped_column(String(255))
    state_token: Mapped[str | None] = mapped_column(String(255), index=True)
    code_verifier: Mapped[str | None] = mapped_column(String(255))
    extra: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    status: Mapped[str] = mapped_column(String(30), default="pending")  # pending | connected | expired | error
    last_error: Mapped[str | None] = mapped_column(Text)
    refresh_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
