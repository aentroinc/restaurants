"""connector_credentials table

Revision ID: 0001_connector_cred
Revises:
Create Date: 2026-05-02

Stores per-tenant per-connector OAuth tokens (Fernet-encrypted) and pending
state tokens for the authorize-callback handshake.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "0001_connector_cred"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "connector_credentials",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False, index=True),
        sa.Column("connector_type", sa.String(length=50), nullable=False, index=True),
        sa.Column("auth_type", sa.String(length=30), nullable=False, server_default="oauth2"),
        sa.Column("access_token_enc", sa.Text(), nullable=True),
        sa.Column("refresh_token_enc", sa.Text(), nullable=True),
        sa.Column("api_key_enc", sa.Text(), nullable=True),
        sa.Column("api_secret_enc", sa.Text(), nullable=True),
        sa.Column("token_type", sa.String(length=30), nullable=True),
        sa.Column("scope", sa.String(length=500), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("merchant_id", sa.String(length=255), nullable=True),
        sa.Column("contract_id", sa.String(length=255), nullable=True),
        sa.Column("state_token", sa.String(length=255), nullable=True, index=True),
        sa.Column("code_verifier", sa.String(length=255), nullable=True),
        sa.Column("extra", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="pending"),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("refresh_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_connector_cred_tenant_type",
        "connector_credentials",
        ["tenant_id", "connector_type"],
        unique=True,
    )
    op.create_index(
        "ix_connector_cred_state",
        "connector_credentials",
        ["state_token"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_connector_cred_state", table_name="connector_credentials")
    op.drop_index("ix_connector_cred_tenant_type", table_name="connector_credentials")
    op.drop_table("connector_credentials")
