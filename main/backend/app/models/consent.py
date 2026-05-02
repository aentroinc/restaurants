"""個人情報保護法（2022改正）+ GDPR 風 同意管理モデル.

- ConsentTemplate: 同意文書テンプレ（バージョン管理）
- ConsentRecord: 個別ユーザの同意記録（granted / withdrawn）
- DataDeletionRequest: 「忘れられる権利」リクエスト
"""
from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, Index, Integer, func
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ConsentTemplate(Base):
    """同意文書テンプレ。code+version で一意。"""

    __tablename__ = "consent_templates"
    __table_args__ = (
        Index("ix_consent_tmpl_tenant_code_ver", "tenant_id", "code", "version", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(80), nullable=False)  # face | gps | clock_retention | interview
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body_md: Mapped[str] = mapped_column(Text, nullable=False)
    required_fields_jsonb: Mapped[list | None] = mapped_column(JSONB, default=list)  # ["face","gps",...]
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ConsentRecord(Base):
    """ユーザの同意（granted / withdrawn）記録. AuditLog 相当の法令保管対象."""

    __tablename__ = "consent_records"
    __table_args__ = (
        Index("ix_consent_rec_tenant_user", "tenant_id", "user_id"),
        Index("ix_consent_rec_template", "template_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("consent_templates.id"), nullable=False)
    template_code: Mapped[str] = mapped_column(String(80), nullable=False)  # 非正規化で取得高速化
    template_version: Mapped[int] = mapped_column(Integer, nullable=False)
    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    withdrawn_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    scope_jsonb: Mapped[dict] = mapped_column(JSONB, default=dict)  # {face: bool, gps: bool, personal_info: bool, training: bool}


class DataDeletionRequest(Base):
    """個人データ削除リクエスト."""

    __tablename__ = "data_deletion_requests"
    __table_args__ = (
        Index("ix_ddr_tenant_user", "tenant_id", "user_id"),
        Index("ix_ddr_status", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    requested_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    scope: Mapped[str] = mapped_column(String(20), nullable=False, default="all")  # all | face | personal | training
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="pending")  # pending | processing | done | rejected
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    processor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    deletion_log_jsonb: Mapped[dict | None] = mapped_column(JSONB, default=dict)  # {face_templates_deleted: 3, employee_anonymized: true, ...}
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
