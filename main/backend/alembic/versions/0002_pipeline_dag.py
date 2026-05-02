"""pipeline DAG: pipelines, runs, node_runs, schedules, branches.

Revision ID: 0002_pipeline_dag
Revises: 20260502_action_branch
Create Date: 2026-05-02
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "0002_pipeline_dag"
down_revision = "20260502_action_branch"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pipelines",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), index=True, nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("definition_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("branch_name", sa.String(), server_default="main", nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("created_by", sa.String(), nullable=True),
        sa.Column("status", sa.String(), server_default="active", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_pipeline_tenant_name", "pipelines", ["tenant_id", "name"])

    op.create_table(
        "pipeline_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("pipeline_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pipelines.id"), index=True, nullable=False),
        sa.Column("branch_name", sa.String(), server_default="main", nullable=False),
        sa.Column("status", sa.String(), server_default="pending", nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("triggered_by", sa.String(), nullable=True),
        sa.Column("log_jsonb", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )

    op.create_table(
        "pipeline_node_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("pipeline_run_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pipeline_runs.id"), index=True, nullable=False),
        sa.Column("node_id", sa.String(), nullable=False),
        sa.Column("status", sa.String(), server_default="pending", nullable=False),
        sa.Column("input_dataset_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("output_dataset_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error", sa.String(), nullable=True),
    )

    op.create_table(
        "pipeline_schedules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("pipeline_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pipelines.id"), index=True, nullable=False),
        sa.Column("cron_expr", sa.String(), nullable=False),
        sa.Column("branch_name", sa.String(), server_default="main", nullable=False),
        sa.Column("enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("next_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "pipeline_branches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("pipeline_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pipelines.id"), index=True, nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("base_branch", sa.String(), server_default="main", nullable=False),
        sa.Column("created_from_run_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pipeline_runs.id"), nullable=True),
        sa.Column("status", sa.String(), server_default="open", nullable=False),
        sa.Column("definition_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("merged_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_pipeline_branch_name", "pipeline_branches", ["pipeline_id", "name"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_pipeline_branch_name", table_name="pipeline_branches")
    op.drop_table("pipeline_branches")
    op.drop_table("pipeline_schedules")
    op.drop_table("pipeline_node_runs")
    op.drop_table("pipeline_runs")
    op.drop_index("ix_pipeline_tenant_name", table_name="pipelines")
    op.drop_table("pipelines")
