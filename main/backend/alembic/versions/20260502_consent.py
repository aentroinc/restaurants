"""consent templates / records / deletion requests

Revision ID: 20260502_consent
Revises:
Create Date: 2026-05-02

個人情報保護法（2022改正）+ GDPR 風 同意管理.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "20260502_consent"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "consent_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("body_md", sa.Text(), nullable=False),
        sa.Column("required_fields_jsonb", postgresql.JSONB(), nullable=True),
        sa.Column("valid_from", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_consent_tmpl_tenant_id", "consent_templates", ["tenant_id"])
    op.create_index(
        "ix_consent_tmpl_tenant_code_ver",
        "consent_templates",
        ["tenant_id", "code", "version"],
        unique=True,
    )

    op.create_table(
        "consent_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("consent_templates.id"), nullable=False),
        sa.Column("template_code", sa.String(length=80), nullable=False),
        sa.Column("template_version", sa.Integer(), nullable=False),
        sa.Column("granted_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("withdrawn_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scope_jsonb", postgresql.JSONB(), nullable=True),
    )
    op.create_index("ix_consent_rec_tenant_user", "consent_records", ["tenant_id", "user_id"])
    op.create_index("ix_consent_rec_template", "consent_records", ["template_id"])
    op.create_index("ix_consent_rec_user_id", "consent_records", ["user_id"])

    op.create_table(
        "data_deletion_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requested_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requested_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("scope", sa.String(length=20), nullable=False, server_default="all"),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="pending"),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("processor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("deletion_log_jsonb", postgresql.JSONB(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
    )
    op.create_index("ix_ddr_tenant_user", "data_deletion_requests", ["tenant_id", "user_id"])
    op.create_index("ix_ddr_status", "data_deletion_requests", ["status"])


def downgrade() -> None:
    op.drop_index("ix_ddr_status", table_name="data_deletion_requests")
    op.drop_index("ix_ddr_tenant_user", table_name="data_deletion_requests")
    op.drop_table("data_deletion_requests")

    op.drop_index("ix_consent_rec_user_id", table_name="consent_records")
    op.drop_index("ix_consent_rec_template", table_name="consent_records")
    op.drop_index("ix_consent_rec_tenant_user", table_name="consent_records")
    op.drop_table("consent_records")

    op.drop_index("ix_consent_tmpl_tenant_code_ver", table_name="consent_templates")
    op.drop_index("ix_consent_tmpl_tenant_id", table_name="consent_templates")
    op.drop_table("consent_templates")
