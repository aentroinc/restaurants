"""idempotency: ClockEvent.idempotency_key + IdempotencyRecord table

Revision ID: 20260502_idempotency
Revises: 20260502_face_auth_clock
Create Date: 2026-05-02

二重打刻防止と汎用 Idempotency-Key ミドルウェアのためのスキーマ:
  - clock_events.idempotency_key (unique partial)
  - idempotency_records (24h ローリングキャッシュ)
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "20260502_idempotency"
down_revision = "20260502_face_auth_clock"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "clock_events",
        sa.Column("idempotency_key", sa.String(length=64), nullable=True),
    )
    op.create_index(
        "ix_clock_idem_key",
        "clock_events",
        ["idempotency_key"],
        unique=True,
        postgresql_where=sa.text("idempotency_key IS NOT NULL"),
    )

    op.create_table(
        "idempotency_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("idempotency_key", sa.String(length=64), nullable=False),
        sa.Column("method", sa.String(length=8), nullable=False),
        sa.Column("path", sa.String(length=255), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=False),
        sa.Column("response_body", sa.LargeBinary(), nullable=False),
        sa.Column("tenant_id", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_idem_key", "idempotency_records", ["idempotency_key"], unique=True)
    op.create_index("ix_idem_created", "idempotency_records", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_idem_created", table_name="idempotency_records")
    op.drop_index("ix_idem_key", table_name="idempotency_records")
    op.drop_table("idempotency_records")

    op.drop_index("ix_clock_idem_key", table_name="clock_events")
    op.drop_column("clock_events", "idempotency_key")
