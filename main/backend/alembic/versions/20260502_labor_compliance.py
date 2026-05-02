"""labor compliance: ComplianceViolation table + Employee.birth_date / hourly_rate / deep_night_allowed

Revision ID: 20260502_labor_compliance
Revises:
Create Date: 2026-05-02
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "20260502_labor_compliance"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "compliance_violations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("store_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("stores.id"), nullable=True),
        sa.Column("rule_code", sa.String(length=32), nullable=False),
        sa.Column("severity", sa.String(length=8), nullable=False),
        sa.Column("detail_json", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb")),
        sa.Column("occurred_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_cv_tenant_id", "compliance_violations", ["tenant_id"])
    op.create_index("ix_cv_employee_id", "compliance_violations", ["employee_id"])
    op.create_index("ix_cv_store_id", "compliance_violations", ["store_id"])
    op.create_index("ix_cv_tenant_emp_time", "compliance_violations", ["tenant_id", "employee_id", "occurred_at"])
    op.create_index("ix_cv_tenant_store_time", "compliance_violations", ["tenant_id", "store_id", "occurred_at"])
    op.create_index("ix_cv_tenant_rule", "compliance_violations", ["tenant_id", "rule_code"])

    # Employee に birth_date / hourly_rate / deep_night_allowed を追加
    with op.batch_alter_table("employees") as batch:
        batch.add_column(sa.Column("birth_date", sa.Date(), nullable=True))
        batch.add_column(sa.Column("hourly_rate", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("deep_night_allowed", sa.Boolean(), server_default=sa.text("false"), nullable=False))


def downgrade() -> None:
    with op.batch_alter_table("employees") as batch:
        batch.drop_column("deep_night_allowed")
        batch.drop_column("hourly_rate")
        batch.drop_column("birth_date")

    op.drop_index("ix_cv_tenant_rule", table_name="compliance_violations")
    op.drop_index("ix_cv_tenant_store_time", table_name="compliance_violations")
    op.drop_index("ix_cv_tenant_emp_time", table_name="compliance_violations")
    op.drop_index("ix_cv_store_id", table_name="compliance_violations")
    op.drop_index("ix_cv_employee_id", table_name="compliance_violations")
    op.drop_index("ix_cv_tenant_id", table_name="compliance_violations")
    op.drop_table("compliance_violations")
