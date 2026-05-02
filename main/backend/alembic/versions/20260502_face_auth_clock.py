"""face auth + clock events + staff pin

Revision ID: 20260502_face_auth_clock
Revises:
Create Date: 2026-05-02

3秒打刻 (顔/QR/PIN) のためのテーブル群:
  - face_templates  (pii.biometric)
  - clock_events
  - staff_pins
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "20260502_face_auth_clock"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "face_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("embedding_jsonb", postgresql.JSONB(), nullable=False),
        sa.Column("enrolled_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("device_info", postgresql.JSONB(), nullable=True),
        sa.Column("status", sa.String(length=16), server_default="active"),
    )
    op.create_index("ix_face_tmpl_tenant_id", "face_templates", ["tenant_id"])
    op.create_index("ix_face_tmpl_employee_id", "face_templates", ["employee_id"])
    op.create_index("ix_face_tmpl_tenant_emp", "face_templates", ["tenant_id", "employee_id"])

    op.create_table(
        "clock_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("store_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("stores.id"), nullable=False),
        sa.Column("event_type", sa.String(length=16), nullable=False),
        sa.Column("lat", sa.Numeric(9, 6), nullable=True),
        sa.Column("lon", sa.Numeric(9, 6), nullable=True),
        sa.Column("geofence_ok", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("auth_method", sa.String(length=8), nullable=False),
        sa.Column("confidence", sa.Numeric(4, 3), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_clock_tenant_id", "clock_events", ["tenant_id"])
    op.create_index("ix_clock_employee_id", "clock_events", ["employee_id"])
    op.create_index("ix_clock_store_id", "clock_events", ["store_id"])
    op.create_index("ix_clock_tenant_emp_time", "clock_events", ["tenant_id", "employee_id", "occurred_at"])
    op.create_index("ix_clock_tenant_store_time", "clock_events", ["tenant_id", "store_id", "occurred_at"])

    op.create_table(
        "staff_pins",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("pin_hash", sa.String(length=255), nullable=False),
        sa.Column("failed_attempts", sa.Integer(), server_default="0"),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_staff_pin_tenant_id", "staff_pins", ["tenant_id"])
    op.create_index("ix_staff_pin_tenant_emp", "staff_pins", ["tenant_id", "employee_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_staff_pin_tenant_emp", table_name="staff_pins")
    op.drop_index("ix_staff_pin_tenant_id", table_name="staff_pins")
    op.drop_table("staff_pins")

    op.drop_index("ix_clock_tenant_store_time", table_name="clock_events")
    op.drop_index("ix_clock_tenant_emp_time", table_name="clock_events")
    op.drop_index("ix_clock_store_id", table_name="clock_events")
    op.drop_index("ix_clock_employee_id", table_name="clock_events")
    op.drop_index("ix_clock_tenant_id", table_name="clock_events")
    op.drop_table("clock_events")

    op.drop_index("ix_face_tmpl_tenant_emp", table_name="face_templates")
    op.drop_index("ix_face_tmpl_employee_id", table_name="face_templates")
    op.drop_index("ix_face_tmpl_tenant_id", table_name="face_templates")
    op.drop_table("face_templates")
