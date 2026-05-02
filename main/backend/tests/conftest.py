"""Pytest fixtures.

The test suite is split into:
  - unit/        : pure-python tests (no DB)
  - integration/ : require DB (skipped when DATABASE_URL is unset)
  - acceptance/  : end-to-end flow tests (golden paths)
  - perf/        : performance / load (locust-driven, not pytest)
"""
import os
import pytest


@pytest.fixture(scope="session")
def has_database() -> bool:
    return bool(os.environ.get("DATABASE_URL_SYNC") or os.environ.get("DATABASE_URL"))
