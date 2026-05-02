"""labor forecast 30m + requirements + shift drafts

Revision ID: 20260502_labor_forecast
Revises:
Create Date: 2026-05-02

Adds tables for the +3 (Crunchtime Teamworx相当) labor forecasting & shift drafting:
  - demand_forecast_30m
  - labor_requirements
  - shift_drafts
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "20260502_labor_forecast"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "demand_forecast_30m",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("store_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("slot_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("predicted_customers", sa.Numeric(8, 2), nullable=False),
        sa.Column("predicted_sales", sa.Numeric(12, 0), nullable=False),
        sa.Column("confidence", sa.Numeric(4, 2), server_default="0.80"),
        sa.Column("factors_json", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("tenant_id", "store_id", "slot_start", name="uq_demand_30m_store_slot"),
    )
    op.create_index("ix_demand_30m_tenant_id", "demand_forecast_30m", ["tenant_id"])
    op.create_index("ix_demand_30m_store_id", "demand_forecast_30m", ["store_id"])
    op.create_index("ix_demand_30m_tenant_store_slot", "demand_forecast_30m", ["tenant_id", "store_id", "slot_start"])

    op.create_table(
        "labor_requirements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("store_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("slot_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("required_fte", sa.Numeric(5, 2), nullable=False),
        sa.Column("role_split_json", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("tenant_id", "store_id", "slot_start", name="uq_labor_req_store_slot"),
    )
    op.create_index("ix_labor_req_tenant_id", "labor_requirements", ["tenant_id"])
    op.create_index("ix_labor_req_store_id", "labor_requirements", ["store_id"])
    op.create_index("ix_labor_req_tenant_store_slot", "labor_requirements", ["tenant_id", "store_id", "slot_start"])

    op.create_table(
        "shift_drafts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("store_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("week_start", sa.Date(), nullable=False),
        sa.Column("draft_json", postgresql.JSONB(), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="draft"),
        sa.Column("cost_estimate", sa.Numeric(12, 0), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_shift_drafts_tenant_id", "shift_drafts", ["tenant_id"])
    op.create_index("ix_shift_drafts_store_id", "shift_drafts", ["store_id"])
    op.create_index("ix_shift_drafts_tenant_store_week", "shift_drafts", ["tenant_id", "store_id", "week_start"])


def downgrade() -> None:
    op.drop_index("ix_shift_drafts_tenant_store_week", table_name="shift_drafts")
    op.drop_index("ix_shift_drafts_store_id", table_name="shift_drafts")
    op.drop_index("ix_shift_drafts_tenant_id", table_name="shift_drafts")
    op.drop_table("shift_drafts")

    op.drop_index("ix_labor_req_tenant_store_slot", table_name="labor_requirements")
    op.drop_index("ix_labor_req_store_id", table_name="labor_requirements")
    op.drop_index("ix_labor_req_tenant_id", table_name="labor_requirements")
    op.drop_table("labor_requirements")

    op.drop_index("ix_demand_30m_tenant_store_slot", table_name="demand_forecast_30m")
    op.drop_index("ix_demand_30m_store_id", table_name="demand_forecast_30m")
    op.drop_index("ix_demand_30m_tenant_id", table_name="demand_forecast_30m")
    op.drop_table("demand_forecast_30m")
