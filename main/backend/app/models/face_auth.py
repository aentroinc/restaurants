"""3秒打刻のための軽量認証モデル。

顔認証 (FaceTemplate) + 打刻イベント (ClockEvent) を保持。
embedding は 128次元 float の配列を JSONB で持つ。pgvector がある環境では
将来的に専用カラムに移行可能だが、Postgres 標準で動かすため現状は JSONB。

NOTE: pii.biometric marking 対象。embedding は復元可能性ゼロではないので
個人情報保護法上 sensitive。MarkingAssignment 側に "pii.biometric" を貼る運用を
別エージェントで marking_seeds.py に追加すること。ここでは comment だけ残す。
"""
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Numeric, ForeignKey, DateTime, Index, Boolean, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class FaceTemplate(Base):
    """従業員の顔 embedding テンプレ。1名複数登録可（status=active のみ照合）。"""

    __tablename__ = "face_templates"
    __table_args__ = (
        Index("ix_face_tmpl_tenant_emp", "tenant_id", "employee_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False, index=True)
    # pii.biometric — 配列長は通常 128 (face-api.js) / 512 (insightface)
    embedding_jsonb: Mapped[list] = mapped_column(JSONB, nullable=False)
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    device_info: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    status: Mapped[str] = mapped_column(String(16), default="active")  # active | revoked


class ClockEvent(Base):
    """打刻イベント。出勤・退勤・休憩開始・休憩終了。"""

    __tablename__ = "clock_events"
    __table_args__ = (
        Index("ix_clock_tenant_emp_time", "tenant_id", "employee_id", "occurred_at"),
        Index("ix_clock_tenant_store_time", "tenant_id", "store_id", "occurred_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False, index=True)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(16), nullable=False)  # in | out | break_start | break_end
    lat: Mapped[float | None] = mapped_column(Numeric(9, 6))
    lon: Mapped[float | None] = mapped_column(Numeric(9, 6))
    geofence_ok: Mapped[bool] = mapped_column(Boolean, default=False)
    auth_method: Mapped[str] = mapped_column(String(8), nullable=False)  # face | qr | pin
    confidence: Mapped[float | None] = mapped_column(Numeric(4, 3))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class StaffPin(Base):
    """4桁PIN (bcrypt hash) と brute-force ロックアウト。"""

    __tablename__ = "staff_pins"
    __table_args__ = (
        Index("ix_staff_pin_tenant_emp", "tenant_id", "employee_id", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False)
    pin_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
