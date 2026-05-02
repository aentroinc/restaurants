"""Verify the Prometheus instrumentation hooks are actually wired in.

These tests do NOT exercise Prometheus itself — they only confirm that the
helper functions in `app.middleware.metrics` are called by the relevant
production code paths. Each call site is patched and we assert the patch
was hit.

Hooks under test:
  - record_ai_tokens          ← Anthropic SDK call sites
  - inc_login_failure         ← /api/v1/auth login + login_v2 (bad password)
  - inc_lockout               ← lockout_service.check_lockout (lock created)
  - inc_access_deny           ← auth_rbac.require_permission (deny)
  - inc_pii_redaction         ← middleware.column_mask.mask_pii
  - inc_pipeline_run          ← pipeline_dag.execute_pipeline
                                ingestion_pipeline.run_pipeline
"""
from __future__ import annotations

import sys
import types
import uuid
from unittest.mock import patch, MagicMock

import pytest


# ---------------------------------------------------------------------------
# 1. record_ai_tokens — patch at the call-site module to catch the lazy import
# ---------------------------------------------------------------------------

def _make_anthropic_response(in_tok=42, out_tok=17):
    """Stand-in for an Anthropic Messages response."""
    resp = MagicMock()
    resp.usage.input_tokens = in_tok
    resp.usage.output_tokens = out_tok
    resp.content = []  # iterated by some callers
    return resp


def test_record_ai_tokens_helper_called_via_client_wrapper():
    """The client.record_usage wrapper forwards to record_ai_tokens."""
    from app.services.ai import client as ai_client

    with patch("app.middleware.metrics.record_ai_tokens") as mocked:
        ai_client.record_usage("claude-sonnet-4", _make_anthropic_response(11, 22))
        mocked.assert_called_once_with("claude-sonnet-4", 11, 22)


def test_record_ai_tokens_wrapper_swallows_missing_usage():
    """If usage is None, the wrapper does not call record_ai_tokens."""
    from app.services.ai import client as ai_client

    resp = MagicMock()
    resp.usage = None
    with patch("app.middleware.metrics.record_ai_tokens") as mocked:
        ai_client.record_usage("claude-sonnet-4", resp)
        mocked.assert_not_called()


# ---------------------------------------------------------------------------
# 2. inc_login_failure — exercised on bad-password / unknown-user paths
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_inc_login_failure_called_on_unknown_user():
    """login() with an unknown email should hit inc_login_failure."""
    from app.api.v1 import auth as auth_mod

    db = MagicMock()
    # check_lockout: not locked
    async def _no_lock(*a, **kw):
        return False
    # record_attempt: no-op
    async def _record(*a, **kw):
        return None
    # db.execute -> result with scalar_one_or_none returning None (no user)
    class _Res:
        def scalar_one_or_none(self):
            return None
    async def _execute(*a, **kw):
        return _Res()
    db.execute = _execute

    body = auth_mod.LoginRequest(email="nobody@example.com", password="x")

    with patch.object(auth_mod, "check_lockout", _no_lock), \
         patch.object(auth_mod, "record_attempt", _record), \
         patch("app.middleware.metrics.inc_login_failure") as mocked:
        from fastapi import HTTPException
        with pytest.raises(HTTPException):
            await auth_mod.login(body, db=db)
        mocked.assert_called()


@pytest.mark.asyncio
async def test_inc_login_failure_called_on_login_v2_unknown_user():
    from app.api.v1 import auth as auth_mod

    db = MagicMock()
    async def _no_lock(*a, **kw):
        return False
    async def _record(*a, **kw):
        return None
    class _Res:
        def scalar_one_or_none(self):
            return None
    async def _execute(*a, **kw):
        return _Res()
    db.execute = _execute

    body = auth_mod.LoginRequest(email="nobody2@example.com", password="x")

    with patch.object(auth_mod, "check_lockout", _no_lock), \
         patch.object(auth_mod, "record_attempt", _record), \
         patch("app.middleware.metrics.inc_login_failure") as mocked:
        from fastapi import HTTPException
        with pytest.raises(HTTPException):
            await auth_mod.login_v2(body, db=db)
        mocked.assert_called()


# ---------------------------------------------------------------------------
# 3. inc_lockout — fired when MAX_ATTEMPTS exceeded inside check_lockout
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_inc_lockout_called_when_threshold_exceeded():
    from app.services import lockout_service as lk

    # Build a fake AsyncSession-like object with the two execute() shapes used.
    class _UserRes:
        def scalar_one_or_none(self):
            return None  # no user → skips user-specific lock-cleanup branch

    class _CountRes:
        def scalar(self):
            return lk.MAX_ATTEMPTS  # at threshold → triggers lockout path

    calls = {"n": 0}

    async def _execute(stmt, *a, **kw):
        calls["n"] += 1
        # First execute is for the User select, second for the count
        if calls["n"] == 1:
            return _UserRes()
        return _CountRes()

    db = MagicMock()
    db.execute = _execute
    async def _commit():
        return None
    db.commit = _commit

    with patch("app.middleware.metrics.inc_lockout") as mocked:
        result = await lk.check_lockout(db, "victim@example.com")
        assert result is True
        mocked.assert_called_once()


# ---------------------------------------------------------------------------
# 4. inc_access_deny — invoked when require_permission denies
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_inc_access_deny_called_on_permission_denied():
    from app import auth_rbac

    dep = auth_rbac.require_permission("secret_thing", "write")

    # Fake user with a role that has no "write" in fallback
    user = {"sub": "u1", "tenant_id": "t1", "role": "viewer"}

    # _user_has_permission returns False (db check fails)
    async def _no_perm(*a, **kw):
        return False

    db = MagicMock()

    with patch.object(auth_rbac, "_user_has_permission", _no_perm), \
         patch("app.middleware.metrics.inc_access_deny") as mocked:
        from fastapi import HTTPException
        with pytest.raises(HTTPException):
            await dep(user=user, db=db)
        mocked.assert_called_once()
        args, kwargs = mocked.call_args
        # Either positional or kwargs — accept both
        flat = list(args) + list(kwargs.values())
        assert "secret_thing" in flat
        assert "write" in flat


# ---------------------------------------------------------------------------
# 5. inc_pii_redaction — fired once per masked field
# ---------------------------------------------------------------------------

def test_inc_pii_redaction_called_per_field():
    from app.middleware import column_mask as cm

    data = {
        "id": 1,
        "name": "Alice",      # PII
        "email": "a@b.com",   # PII
        "store": {"manager_name": "Bob", "code": "X1"},  # nested PII
        "team": [{"phone": "090"}, {"phone": "080"}],    # list-of-dicts PII
    }
    with patch("app.middleware.metrics.inc_pii_redaction") as mocked:
        out = cm.mask_pii(data, user_roles=["sv"])
        # name + email + manager_name + 2 phones = 5 redactions
        assert mocked.call_count == 5
        # masked values are "***"
        assert out["name"] == "***"
        assert out["email"] == "***"
        assert out["store"]["manager_name"] == "***"
        assert out["team"][0]["phone"] == "***"


def test_inc_pii_redaction_skipped_for_exempt_role():
    from app.middleware import column_mask as cm
    with patch("app.middleware.metrics.inc_pii_redaction") as mocked:
        cm.mask_pii({"name": "Alice"}, user_roles=["admin"])
        mocked.assert_not_called()


# ---------------------------------------------------------------------------
# 6. inc_pipeline_run — pipeline_dag.execute_pipeline (success path)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_inc_pipeline_run_called_on_pipeline_dag_success():
    pytest.importorskip("aiosqlite")

    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from app.database import Base
    from app.models.pipeline import Pipeline
    from app.services.pipeline_dag import execute_pipeline

    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception:
        pytest.skip("SQLite cannot create the full schema")

    Session = async_sessionmaker(engine, expire_on_commit=False)
    tenant_id = uuid.UUID("00000000-0000-0000-0000-000000000099")

    async with Session() as db:
        from app.models.tenant import Tenant
        try:
            db.add(Tenant(id=tenant_id, name="t-instr"))
            await db.flush()
        except Exception:
            pass

        defn = {
            "nodes": [
                {"id": "A", "type": "transform_sql", "config": {"sql": "SELECT 1"}},
            ],
            "edges": [],
        }
        p = Pipeline(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            name="instr-pipeline",
            definition_json=defn,
        )
        db.add(p)
        await db.flush()

        with patch("app.middleware.metrics.inc_pipeline_run") as mocked:
            res = await execute_pipeline(db, p.id)
            assert res["status"] == "success"
            mocked.assert_called_once_with("ok")


# ---------------------------------------------------------------------------
# 7. inc_pipeline_run — ingestion_pipeline.run_pipeline (success path)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_inc_pipeline_run_called_on_ingestion_pipeline_success():
    pytest.importorskip("aiosqlite")

    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from app.database import Base
    from app.models.ingestion import IngestionBatch
    from app.services.ingestion_pipeline import run_pipeline

    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception:
        pytest.skip("SQLite cannot create the full schema")

    Session = async_sessionmaker(engine, expire_on_commit=False)
    tenant_id = uuid.UUID("00000000-0000-0000-0000-0000000000aa")

    async with Session() as db:
        from app.models.tenant import Tenant
        try:
            db.add(Tenant(id=tenant_id, name="t-ing"))
            await db.flush()
        except Exception:
            pass

        batch = IngestionBatch(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            entity_type="sales",
            row_count=10,
            valid_row_count=10,
            invalid_row_count=0,
            status="pending",
        )
        db.add(batch)
        await db.flush()

        with patch("app.middleware.metrics.inc_pipeline_run") as mocked:
            res = await run_pipeline(db, batch.id, auto_approve=True)
            assert "stages" in res
            mocked.assert_called_once_with("ok")
