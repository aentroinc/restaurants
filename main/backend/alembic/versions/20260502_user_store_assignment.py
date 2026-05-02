"""user store assignments + users.default_store_id

Revision ID: 20260502_user_store_assignment
Revises: 20260502_aip_logic
Create Date: 2026-05-02

複数店舗 RBAC + 既定店舗のためのテーブルとカラムを追加。
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "20260502_user_store_assignment"
down_revision = "20260502_aip_logic"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("default_store_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("stores.id"), nullable=True),
    )

    op.create_table(
        "user_store_assignments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("store_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("is_default", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("granted_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("granted_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.UniqueConstraint("user_id", "store_id", name="uq_user_store"),
    )
    op.create_index("ix_usa_tenant", "user_store_assignments", ["tenant_id"])
    op.create_index("ix_usa_user", "user_store_assignments", ["user_id"])
    op.create_index("ix_usa_store", "user_store_assignments", ["store_id"])


def downgrade() -> None:
    op.drop_index("ix_usa_store", table_name="user_store_assignments")
    op.drop_index("ix_usa_user", table_name="user_store_assignments")
    op.drop_index("ix_usa_tenant", table_name="user_store_assignments")
    op.drop_table("user_store_assignments")
    op.drop_column("users", "default_store_id")
