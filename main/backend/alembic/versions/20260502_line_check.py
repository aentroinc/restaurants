"""line check templates / items / runs / answers

Revision ID: 20260502_line_check
Revises: 20260502_aip_eval_threads
Create Date: 2026-05-02

Adds Line Check (digital opening/closing/4h checklist) tables: photos required,
geofence-aware, NG answers auto-issue tasks elsewhere in the app.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260502_line_check"
down_revision: Union[str, None] = "20260502_aip_eval_threads"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "checklist_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False, index=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("schedule_type", sa.String(length=20), nullable=False),
        sa.Column("items_json", postgresql.JSONB(), nullable=True),
        sa.Column("brand_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("brands.id"), nullable=True),
        sa.Column("store_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("stores.id"), nullable=True),
        sa.Column("active", sa.Boolean(), server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "checklist_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("checklist_templates.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("required", sa.Boolean(), server_default=sa.true()),
        sa.Column("requires_photo", sa.Boolean(), server_default=sa.false()),
        sa.Column("requires_temperature", sa.Boolean(), server_default=sa.false()),
        sa.Column("min_temp", sa.Numeric(6, 2), nullable=True),
        sa.Column("max_temp", sa.Numeric(6, 2), nullable=True),
        sa.Column("ng_action_template_id", postgresql.UUID(as_uuid=True), nullable=True),
    )

    op.create_table(
        "checklist_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False, index=True),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("checklist_templates.id"), nullable=False, index=True),
        sa.Column("store_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("stores.id"), nullable=False, index=True),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("geofence_ok", sa.Boolean(), server_default=sa.false()),
        sa.Column("status", sa.String(length=20), server_default="in_progress"),
        sa.Column("lat", sa.Numeric(9, 6), nullable=True),
        sa.Column("lon", sa.Numeric(9, 6), nullable=True),
    )
    op.create_index("ix_checklist_runs_store_started", "checklist_runs", ["store_id", "started_at"])

    op.create_table(
        "checklist_answers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("run_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("checklist_runs.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("checklist_items.id"), nullable=False),
        sa.Column("value_text", sa.Text(), nullable=True),
        sa.Column("value_number", sa.Numeric(8, 2), nullable=True),
        sa.Column("photo_url", sa.String(length=500), nullable=True),
        sa.Column("ok", sa.Boolean(), server_default=sa.true()),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("checklist_answers")
    op.drop_index("ix_checklist_runs_store_started", table_name="checklist_runs")
    op.drop_table("checklist_runs")
    op.drop_table("checklist_items")
    op.drop_table("checklist_templates")
