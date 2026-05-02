"""Column-level security + PII redaction"""
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ColumnPolicy(Base):
    """role × resource × column × action のマスクポリシー"""
    __tablename__ = "column_policies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), index=True)
    role_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("roles.id"), nullable=True)  # None = 全 role 適用
    resource_name: Mapped[str] = mapped_column(String(100), nullable=False)  # store | employee | review | shift
    column_name: Mapped[str] = mapped_column(String(100), nullable=False)    # name | hourly_rate | ...
    action: Mapped[str] = mapped_column(String(20), default="read")          # read | write
    mask_type: Mapped[str] = mapped_column(String(20), default="full")       # full | partial | hash | drop
    condition_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # 条件: {"region": "関東"} 等
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PIIRedactionLog(Base):
    """LLM 送信前 / API レスポンス時の PII redaction 監査"""
    __tablename__ = "pii_redaction_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)  # api_response | ai_prompt | export
    resource_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pii_type: Mapped[str] = mapped_column(String(40), nullable=False)        # name | phone | email | address | employee_id
    redaction_method: Mapped[str] = mapped_column(String(20), default="mask")  # mask | hash | drop
    occurrences: Mapped[int] = mapped_column(default=1)
    ai_session_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
