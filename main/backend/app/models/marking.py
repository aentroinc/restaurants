"""Foundry-style marking-based ACL.

RBAC は「誰が何リソースに何アクション可能か」を制御する一方、Marking はリソース
（テーブル / 行 / 列）に貼られたラベルとユーザの purpose-token を AND で評価して、
purpose に紐づく marking を保有していなければ deny / mask する。

- Marking: ラベル定義（pii.basic, fc.financial 等）
- MarkingAssignment: marking をテーブル / 行 / 列に貼る
- UserPurpose: ユーザに与える短命 purpose-token とそれが解放する markings
"""
import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, func, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Marking(Base):
    """Marking 定義 (e.g. pii.basic / labor.confidential / fc.financial)."""
    __tablename__ = "markings"
    __table_args__ = (Index("ix_markings_tenant_code", "tenant_id", "code", unique=True),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(80), nullable=False)
    display_name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    level: Mapped[str] = mapped_column(String(10), default="medium")  # low | medium | high
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class MarkingAssignment(Base):
    """Marking をテーブル / 行 / 列の任意粒度に付与."""
    __tablename__ = "marking_assignments"
    __table_args__ = (
        Index("ix_marking_assignments_resource", "tenant_id", "resource_type", "resource_id"),
        Index("ix_marking_assignments_marking", "marking_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    marking_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("markings.id"), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(80), nullable=False)  # store | employee | store_pl ...
    resource_id: Mapped[str | None] = mapped_column(String(100), nullable=True)  # None = type 全体
    column_name: Mapped[str | None] = mapped_column(String(120), nullable=True)  # None = 行/テーブル全体
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class UserPurpose(Base):
    """ユーザに付与された purpose-token + 解放可能 markings (短命)."""
    __tablename__ = "user_purposes"
    __table_args__ = (Index("ix_user_purposes_user_active", "user_id", "valid_to"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    purpose_token: Mapped[str] = mapped_column(String(40), nullable=False)  # operation|audit|executive|research
    granted_markings: Mapped[list | None] = mapped_column(JSONB, nullable=True)  # ["pii.basic", "fc.financial"]
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    valid_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    granted_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
