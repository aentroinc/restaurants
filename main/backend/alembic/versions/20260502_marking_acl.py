"""marking-based ACL

Revision ID: 20260502_marking_acl
Revises: 20260502_aip_eval_threads
Create Date: 2026-05-02

Foundry-style marking ACL:
- markings              : marking 定義 (code, level, ...)
- marking_assignments   : テーブル/行/列に marking を貼る
- user_purposes         : ユーザに付与された purpose-token + 解放 markings
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260502_marking_acl"
down_revision: Union[str, None] = "20260502_aip_eval_threads"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "markings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("display_name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("level", sa.String(length=10), server_default="medium"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_markings_tenant_code", "markings", ["tenant_id", "code"], unique=True)

    op.create_table(
        "marking_assignments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("marking_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("markings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("resource_type", sa.String(length=80), nullable=False),
        sa.Column("resource_id", sa.String(length=100), nullable=True),
        sa.Column("column_name", sa.String(length=120), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_marking_assignments_resource", "marking_assignments", ["tenant_id", "resource_type", "resource_id"])
    op.create_index("ix_marking_assignments_marking", "marking_assignments", ["marking_id"])

    op.create_table(
        "user_purposes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("purpose_token", sa.String(length=40), nullable=False),
        sa.Column("granted_markings", postgresql.JSONB(), nullable=True),
        sa.Column("valid_from", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("valid_to", sa.DateTime(timezone=True), nullable=True),
        sa.Column("granted_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_user_purposes_user_active", "user_purposes", ["user_id", "valid_to"])


def downgrade() -> None:
    op.drop_index("ix_user_purposes_user_active", table_name="user_purposes")
    op.drop_table("user_purposes")
    op.drop_index("ix_marking_assignments_marking", table_name="marking_assignments")
    op.drop_index("ix_marking_assignments_resource", table_name="marking_assignments")
    op.drop_table("marking_assignments")
    op.drop_index("ix_markings_tenant_code", table_name="markings")
    op.drop_table("markings")
