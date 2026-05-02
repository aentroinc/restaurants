"""軽減税率 (8%/10%) 対応 — Product 拡張 / DailyStoreSales 拡張 / SalesTaxBreakdown 新設

Revision ID: 20260502_tax_breakdown
Revises:
Create Date: 2026-05-02
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "20260502_tax_breakdown"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Product: tax_rate / tax_category
    op.add_column(
        "products",
        sa.Column("tax_rate", sa.Numeric(4, 3), nullable=False, server_default="0.10"),
    )
    op.add_column(
        "products",
        sa.Column("tax_category", sa.String(length=20), nullable=False, server_default="standard"),
    )

    # DailyStoreSales: net_sales_8pct / net_sales_10pct / tax_8pct / tax_10pct
    for col, default in (
        ("net_sales_8pct", "0"),
        ("net_sales_10pct", "0"),
        ("tax_8pct", "0"),
        ("tax_10pct", "0"),
    ):
        op.add_column(
            "daily_store_sales",
            sa.Column(col, sa.Numeric(12, 0), nullable=False, server_default=default),
        )

    # SalesTaxBreakdown
    op.create_table(
        "sales_tax_breakdown",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("store_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("business_date", sa.Date(), nullable=False),
        sa.Column("tax_rate", sa.Numeric(4, 3), nullable=False),
        sa.Column("net_sales", sa.Numeric(12, 0), nullable=False, server_default="0"),
        sa.Column("tax_amount", sa.Numeric(12, 0), nullable=False, server_default="0"),
        sa.Column("transaction_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("tenant_id", "store_id", "business_date", "tax_rate", name="uq_tax_breakdown_store_date_rate"),
    )
    op.create_index("ix_tax_breakdown_tenant_date", "sales_tax_breakdown", ["tenant_id", "business_date"])
    op.create_index("ix_tax_breakdown_store_date", "sales_tax_breakdown", ["store_id", "business_date"])


def downgrade() -> None:
    op.drop_index("ix_tax_breakdown_store_date", table_name="sales_tax_breakdown")
    op.drop_index("ix_tax_breakdown_tenant_date", table_name="sales_tax_breakdown")
    op.drop_table("sales_tax_breakdown")

    for col in ("tax_10pct", "tax_8pct", "net_sales_10pct", "net_sales_8pct"):
        op.drop_column("daily_store_sales", col)

    op.drop_column("products", "tax_category")
    op.drop_column("products", "tax_rate")
