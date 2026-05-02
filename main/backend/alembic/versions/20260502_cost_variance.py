"""cost variance (food cost analytics)

Revision ID: 20260502_cost_variance
Revises:
Create Date: 2026-05-02

Creates three tables for theoretical-vs-actual food cost analytics:
- inventory_counts   : raw stocktake input
- theoretical_costs  : computed expected ingredient usage (BOM x sales)
- cost_variances     : (theoretical - actual) deltas with classified hint
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260502_cost_variance"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "inventory_counts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("store_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("count_date", sa.Date(), nullable=False),
        sa.Column("ingredient_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("qty_actual", sa.Numeric(12, 3), nullable=False),
        sa.Column("unit_cost", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("notes", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_inventory_counts_store_date", "inventory_counts", ["store_id", "count_date"])

    op.create_table(
        "theoretical_costs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("store_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("period_date", sa.Date(), nullable=False),
        sa.Column("ingredient_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("qty_theoretical", sa.Numeric(14, 3), nullable=False, server_default="0"),
        sa.Column("cost_theoretical", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_theoretical_costs_store_period", "theoretical_costs", ["store_id", "period_date"])

    op.create_table(
        "cost_variances",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("store_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("period_date", sa.Date(), nullable=False),
        sa.Column("ingredient_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("qty_diff", sa.Numeric(14, 3), nullable=False, server_default="0"),
        sa.Column("cost_diff", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("variance_pct", sa.Numeric(8, 4), nullable=False, server_default="0"),
        sa.Column("root_cause_hint", sa.String(length=30), nullable=False, server_default="ok"),
        sa.Column("severity", sa.String(length=10), nullable=False, server_default="low"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_cost_variances_store_period", "cost_variances", ["store_id", "period_date"])
    op.create_index("ix_cost_variances_severity", "cost_variances", ["severity"])


def downgrade() -> None:
    op.drop_index("ix_cost_variances_severity", table_name="cost_variances")
    op.drop_index("ix_cost_variances_store_period", table_name="cost_variances")
    op.drop_table("cost_variances")
    op.drop_index("ix_theoretical_costs_store_period", table_name="theoretical_costs")
    op.drop_table("theoretical_costs")
    op.drop_index("ix_inventory_counts_store_date", table_name="inventory_counts")
    op.drop_table("inventory_counts")
