"""manual-input ontology objects (8 tables)

Revision ID: 20260502_manual_input
Revises:
Create Date: 2026-05-02

Creates the 8 tables backing the manual-input ontology objects:
  manual_daily_reports, manual_waste_logs, manual_complaints,
  manual_equipment_issues, manual_allergy_responses, manual_loss_reports,
  manual_customer_voices, manual_competitor_scans
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260502_manual_input"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. DailyReport
    op.create_table(
        "manual_daily_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("store_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("report_date", sa.Date(), nullable=False),
        sa.Column("sales_summary_text", sa.Text(), nullable=True),
        sa.Column("weather", sa.String(length=40), nullable=True),
        sa.Column("special_events_text", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("predicted_customers_tomorrow", sa.Integer(), nullable=True),
        sa.Column("predicted_sales_tomorrow", sa.Numeric(12, 0), nullable=True),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_manual_daily_reports_store_date", "manual_daily_reports", ["store_id", "report_date"])

    # 2. WasteLog
    op.create_table(
        "manual_waste_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("store_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("waste_date", sa.Date(), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("ingredient_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("qty", sa.Numeric(12, 3), nullable=False, server_default="0"),
        sa.Column("unit", sa.String(length=20), nullable=True),
        sa.Column("reason", sa.String(length=20), nullable=False, server_default="other"),
        sa.Column("cost_estimate", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("photo_url", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_manual_waste_logs_store_date", "manual_waste_logs", ["store_id", "waste_date"])
    op.create_index("ix_manual_waste_logs_reason", "manual_waste_logs", ["reason"])

    # 3. Complaint
    op.create_table(
        "manual_complaints",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("store_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("complaint_date", sa.Date(), nullable=False),
        sa.Column("customer_age_range", sa.String(length=20), nullable=True),
        sa.Column("customer_gender", sa.String(length=20), nullable=True),
        sa.Column("channel", sa.String(length=20), nullable=False, server_default="in_store"),
        sa.Column("severity", sa.String(length=10), nullable=False, server_default="low"),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("response_taken", sa.Text(), nullable=True),
        sa.Column("resolved", sa.Boolean(), server_default=sa.false()),
        sa.Column("follow_up_needed", sa.Boolean(), server_default=sa.false()),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_manual_complaints_store_date", "manual_complaints", ["store_id", "complaint_date"])
    op.create_index("ix_manual_complaints_severity", "manual_complaints", ["severity"])

    # 4. EquipmentIssue
    op.create_table(
        "manual_equipment_issues",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("store_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("equipment_name", sa.String(length=200), nullable=False),
        sa.Column("equipment_category", sa.String(length=30), nullable=False, server_default="other"),
        sa.Column("severity", sa.String(length=10), nullable=False, server_default="minor"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("photo_url", sa.String(length=500), nullable=True),
        sa.Column("repair_requested", sa.Boolean(), server_default=sa.false()),
        sa.Column("repair_status", sa.String(length=20), nullable=False, server_default="reported"),
        sa.Column("requested_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_manual_equipment_issues_store_status", "manual_equipment_issues", ["store_id", "repair_status"])
    op.create_index("ix_manual_equipment_issues_severity", "manual_equipment_issues", ["severity"])

    # 5. AllergyResponse
    op.create_table(
        "manual_allergy_responses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("store_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("response_date", sa.Date(), nullable=False),
        sa.Column("customer_age_range", sa.String(length=20), nullable=True),
        sa.Column("allergen", sa.String(length=20), nullable=False),
        sa.Column("items_provided_json", postgresql.JSONB(), nullable=True),
        sa.Column("response_taken", sa.Text(), nullable=True),
        sa.Column("incident_occurred", sa.Boolean(), server_default=sa.false()),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_manual_allergy_store_date", "manual_allergy_responses", ["store_id", "response_date"])
    op.create_index("ix_manual_allergy_allergen", "manual_allergy_responses", ["allergen"])

    # 6. LossReport
    op.create_table(
        "manual_loss_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("store_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("item_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("item_name", sa.String(length=200), nullable=False),
        sa.Column("qty", sa.Numeric(12, 3), nullable=False, server_default="0"),
        sa.Column("reason", sa.String(length=20), nullable=False, server_default="other"),
        sa.Column("photo_url", sa.String(length=500), nullable=True),
        sa.Column("cost_estimate", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("occurred_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_manual_loss_reports_store_occurred", "manual_loss_reports", ["store_id", "occurred_at"])

    # 7. CustomerVoice
    op.create_table(
        "manual_customer_voices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("store_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("sentiment", sa.String(length=20), nullable=False, server_default="neutral"),
        sa.Column("source", sa.String(length=20), nullable=False, server_default="heard"),
        sa.Column("rating", sa.Numeric(3, 1), nullable=True),
        sa.Column("customer_age_range", sa.String(length=20), nullable=True),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_manual_customer_voices_store_recorded", "manual_customer_voices", ["store_id", "recorded_at"])
    op.create_index("ix_manual_customer_voices_sentiment", "manual_customer_voices", ["sentiment"])

    # 8. CompetitorScan
    op.create_table(
        "manual_competitor_scans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("sv_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("competitor_name", sa.String(length=200), nullable=False),
        sa.Column("competitor_address", sa.String(length=500), nullable=True),
        sa.Column("latitude", sa.Numeric(9, 6), nullable=True),
        sa.Column("longitude", sa.Numeric(9, 6), nullable=True),
        sa.Column("observations_text", sa.Text(), nullable=True),
        sa.Column("menu_observations_json", postgresql.JSONB(), nullable=True),
        sa.Column("photos_json", postgresql.JSONB(), nullable=True),
        sa.Column("visited_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("area_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_manual_competitor_scans_visited", "manual_competitor_scans", ["visited_at"])
    op.create_index("ix_manual_competitor_scans_area", "manual_competitor_scans", ["area_id"])


def downgrade() -> None:
    op.drop_index("ix_manual_competitor_scans_area", table_name="manual_competitor_scans")
    op.drop_index("ix_manual_competitor_scans_visited", table_name="manual_competitor_scans")
    op.drop_table("manual_competitor_scans")

    op.drop_index("ix_manual_customer_voices_sentiment", table_name="manual_customer_voices")
    op.drop_index("ix_manual_customer_voices_store_recorded", table_name="manual_customer_voices")
    op.drop_table("manual_customer_voices")

    op.drop_index("ix_manual_loss_reports_store_occurred", table_name="manual_loss_reports")
    op.drop_table("manual_loss_reports")

    op.drop_index("ix_manual_allergy_allergen", table_name="manual_allergy_responses")
    op.drop_index("ix_manual_allergy_store_date", table_name="manual_allergy_responses")
    op.drop_table("manual_allergy_responses")

    op.drop_index("ix_manual_equipment_issues_severity", table_name="manual_equipment_issues")
    op.drop_index("ix_manual_equipment_issues_store_status", table_name="manual_equipment_issues")
    op.drop_table("manual_equipment_issues")

    op.drop_index("ix_manual_complaints_severity", table_name="manual_complaints")
    op.drop_index("ix_manual_complaints_store_date", table_name="manual_complaints")
    op.drop_table("manual_complaints")

    op.drop_index("ix_manual_waste_logs_reason", table_name="manual_waste_logs")
    op.drop_index("ix_manual_waste_logs_store_date", table_name="manual_waste_logs")
    op.drop_table("manual_waste_logs")

    op.drop_index("ix_manual_daily_reports_store_date", table_name="manual_daily_reports")
    op.drop_table("manual_daily_reports")
