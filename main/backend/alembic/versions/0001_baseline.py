"""Baseline migration — create all tables from current models.

This pragmatic baseline uses Base.metadata.create_all to materialize the
current model state. Subsequent revisions should be authored as deltas
via `alembic revision --autogenerate`.

Revision ID: 0001_baseline
Created: 2026-05-02
"""
from alembic import op

revision = "0001_baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Importing models registers them on Base.metadata.
    from app.database import Base
    from app import models  # noqa: F401

    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade():
    from app.database import Base
    from app import models  # noqa: F401

    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
