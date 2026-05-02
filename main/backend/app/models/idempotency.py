"""IdempotencyRecord — 汎用冪等性ミドルウェア用テーブル。

クライアントから `Idempotency-Key` ヘッダで送信された UUID と、その時の
レスポンス (status_code + body bytes) を 24時間保存する。同じ key で
再送が来たら、ハンドラを実行せずに保存済みレスポンスをそのまま返す。

NOTE:
- in-memory cache が一次キャッシュ、DB バックアップは複数 worker / 再起動越え
  に効くようにするためのもの。
- body は JSON のみを想定（POST のレスポンスは APIResponse[T] 統一）。
"""
from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Index, LargeBinary, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class IdempotencyRecord(Base):
    """`Idempotency-Key` ヘッダ → 過去レスポンスのマッピング。"""

    __tablename__ = "idempotency_records"
    __table_args__ = (
        Index("ix_idem_key", "idempotency_key", unique=True),
        Index("ix_idem_created", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    idempotency_key: Mapped[str] = mapped_column(String(64), nullable=False)
    method: Mapped[str] = mapped_column(String(8), nullable=False)
    path: Mapped[str] = mapped_column(String(255), nullable=False)
    status_code: Mapped[int] = mapped_column(Integer, nullable=False)
    response_body: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    tenant_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
