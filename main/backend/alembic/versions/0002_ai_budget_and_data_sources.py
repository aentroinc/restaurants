"""Ensure AI budget / data source tables exist.

These tables are added in this push and depend on the baseline being applied.
Idempotent because Base.metadata.create_all skips existing tables.

Revision ID: 0002_ai_budget_and_data_sources
Revises: 0001_baseline
"""
from alembic import op

revision = "0002_ai_budget_and_data_sources"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None


def upgrade():
    from app.database import Base
    from app import models  # noqa: F401
    from app.models.ai_budget import (
        AIRedTeamResult, AIRefusalLog, AIUsageLog, TenantAIBudget,
    )
    from app.models.data_source import DataSource, IngestionJob, IngestionRecord

    bind = op.get_bind()
    tables = [
        TenantAIBudget.__table__,
        AIUsageLog.__table__,
        AIRefusalLog.__table__,
        AIRedTeamResult.__table__,
        DataSource.__table__,
        IngestionJob.__table__,
        IngestionRecord.__table__,
    ]
    for t in tables:
        t.create(bind=bind, checkfirst=True)


def downgrade():
    bind = op.get_bind()
    for t in [
        "ingestion_records",
        "ingestion_jobs",
        "data_sources",
        "ai_red_team_results",
        "ai_refusal_logs",
        "ai_usage_logs",
        "tenant_ai_budgets",
    ]:
        op.execute(f"DROP TABLE IF EXISTS {t} CASCADE")
