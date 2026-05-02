"""phase4 aip eval threads

Revision ID: 20260502_aip_eval_threads
Revises:
Create Date: 2026-05-02

Adds tables for the AIP (AI Platform) phase:
- eval_runs       : per-run scoreboard for AI eval harness
- ai_threads      : multi-turn AI conversation thread root
- ai_thread_messages : per-message rows under each thread
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260502_aip_eval_threads"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "eval_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("set_name", sa.String(length=120), nullable=False),
        sa.Column("model_tier", sa.String(length=40), nullable=False, server_default="default"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("total_cases", sa.Integer(), server_default="0"),
        sa.Column("passed_cases", sa.Integer(), server_default="0"),
        sa.Column("avg_tool_match_rate", sa.Float(), nullable=True),
        sa.Column("avg_substring_hit_rate", sa.Float(), nullable=True),
        sa.Column("avg_judge_score", sa.Float(), nullable=True),
        sa.Column("results", postgresql.JSONB(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "ai_threads",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("title", sa.String(length=500), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("message_count", sa.Integer(), server_default="0"),
        sa.Column("total_tokens", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_ai_threads_tenant_owner", "ai_threads", ["tenant_id", "owner_user_id"])

    op.create_table(
        "ai_thread_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("thread_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ai_threads.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("content_text", sa.Text(), nullable=True),
        sa.Column("tool_use_json", postgresql.JSONB(), nullable=True),
        sa.Column("tokens", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_ai_thread_messages_thread_created", "ai_thread_messages", ["thread_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_ai_thread_messages_thread_created", table_name="ai_thread_messages")
    op.drop_table("ai_thread_messages")
    op.drop_index("ix_ai_threads_tenant_owner", table_name="ai_threads")
    op.drop_table("ai_threads")
    op.drop_table("eval_runs")
