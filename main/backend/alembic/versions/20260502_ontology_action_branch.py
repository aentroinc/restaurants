"""ontology action types, actions, branches and snapshots

Revision ID: 20260502_action_branch
Revises:
Create Date: 2026-05-02

Adds:
  - ontology_action_types
  - ontology_actions
  - ontology_branches
  - ontology_snapshots
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20260502_action_branch"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ontology_action_types",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id"), index=True, nullable=False),
        sa.Column("object_type_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ontology_object_types_v2.id"), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("parameters_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("side_effects_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("requires_approval", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_action_type_tenant_name",
        "ontology_action_types",
        ["tenant_id", "object_type_id", "name"],
        unique=True,
    )

    op.create_table(
        "ontology_actions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), index=True, nullable=False),
        sa.Column("action_type_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ontology_action_types.id"), nullable=False),
        sa.Column("instance_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ontology_instances.id"), nullable=True),
        sa.Column("params_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("executed_by", sa.String(), nullable=True),
        sa.Column("executed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("status", sa.String(), server_default="pending", nullable=False),
        sa.Column("result_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )

    op.create_table(
        "ontology_branches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), index=True, nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("base_branch", sa.String(), server_default="main", nullable=False),
        sa.Column("status", sa.String(), server_default="open", nullable=False),
        sa.Column("created_by", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("merged_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_branch_tenant_name",
        "ontology_branches",
        ["tenant_id", "name"],
        unique=True,
    )

    op.create_table(
        "ontology_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("branch_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ontology_branches.id"), nullable=False),
        sa.Column("object_type_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ontology_object_types_v2.id"), nullable=False),
        sa.Column("snapshot_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_snapshot_branch_ot",
        "ontology_snapshots",
        ["branch_id", "object_type_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_snapshot_branch_ot", table_name="ontology_snapshots")
    op.drop_table("ontology_snapshots")
    op.drop_index("ix_branch_tenant_name", table_name="ontology_branches")
    op.drop_table("ontology_branches")
    op.drop_table("ontology_actions")
    op.drop_index("ix_action_type_tenant_name", table_name="ontology_action_types")
    op.drop_table("ontology_action_types")
