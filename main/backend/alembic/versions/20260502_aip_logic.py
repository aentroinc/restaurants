"""aip logic — LogicFunction & LogicRun.

Revision ID: 20260502_aip_logic
Revises: 0002_pipeline_dag
Create Date: 2026-05-02
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "20260502_aip_logic"
down_revision = "0002_pipeline_dag"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "aip_logic_functions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), index=True, nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("trigger_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("predicate_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("actions_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_by", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_aip_logic_tenant_name", "aip_logic_functions", ["tenant_id", "name"])

    op.create_table(
        "aip_logic_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("function_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("aip_logic_functions.id", ondelete="CASCADE"), index=True, nullable=False),
        sa.Column("triggered_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("trigger_payload_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("predicate_result", sa.Boolean(), nullable=True),
        sa.Column("actions_executed_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="pending", nullable=False),
        sa.Column("error", sa.Text(), nullable=True),
    )
    op.create_index("ix_aip_logic_run_function_time", "aip_logic_runs", ["function_id", "triggered_at"])


def downgrade() -> None:
    op.drop_index("ix_aip_logic_run_function_time", table_name="aip_logic_runs")
    op.drop_table("aip_logic_runs")
    op.drop_index("ix_aip_logic_tenant_name", table_name="aip_logic_functions")
    op.drop_table("aip_logic_functions")
