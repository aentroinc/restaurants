"""Unit tests for ontology Action engine and Branch versioning."""
from __future__ import annotations


def test_action_engine_handlers_registered():
    from app.services.action_engine import list_registered_actions
    names = list_registered_actions()
    for expected in ("update_property", "link_to", "unlink", "archive", "create_task", "notify"):
        assert expected in names, f"missing standard action: {expected}"


def test_action_engine_register_decorator():
    from app.services.action_engine import register_action, list_registered_actions

    @register_action("custom_test_action")
    async def _handler(db, tenant_id, instance, params):
        return {"success": True, "echo": params}

    assert "custom_test_action" in list_registered_actions()


def test_action_models_imported():
    from app.models.ontology_v2 import (
        OntologyAction, OntologyActionType, OntologyBranch, OntologySnapshot,
    )
    assert OntologyActionType.__tablename__ == "ontology_action_types"
    assert OntologyAction.__tablename__ == "ontology_actions"
    assert OntologyBranch.__tablename__ == "ontology_branches"
    assert OntologySnapshot.__tablename__ == "ontology_snapshots"


def test_action_type_columns():
    from app.models.ontology_v2 import OntologyActionType
    cols = {c.name for c in OntologyActionType.__table__.columns}
    assert {
        "id", "tenant_id", "object_type_id", "name", "description",
        "parameters_json", "side_effects_json", "requires_approval", "version",
    } <= cols


def test_branch_models_columns():
    from app.models.ontology_v2 import OntologyBranch, OntologySnapshot
    branch_cols = {c.name for c in OntologyBranch.__table__.columns}
    assert {"id", "tenant_id", "name", "base_branch", "status", "created_by", "created_at", "merged_at"} <= branch_cols
    snap_cols = {c.name for c in OntologySnapshot.__table__.columns}
    assert {"id", "branch_id", "object_type_id", "snapshot_json", "version"} <= snap_cols


def test_diff_dicts_basic():
    from app.services.ontology_branch import _diff_dicts
    a = {"display_name": "Store", "version": 1, "icon": "shop"}
    b = {"display_name": "Store v2", "version": 2, "icon": "shop"}
    diffs = _diff_dicts(a, b)
    paths = {d["path"] for d in diffs}
    assert "display_name" in paths
    assert "version" in paths
    assert "icon" not in paths


def test_diff_dicts_add_remove():
    from app.services.ontology_branch import _diff_dicts
    a = {"x": 1}
    b = {"y": 2}
    diffs = _diff_dicts(a, b)
    ops = {d["path"]: d["op"] for d in diffs}
    assert ops.get("x") == "remove"
    assert ops.get("y") == "add"


def test_diff_dicts_nested():
    from app.services.ontology_branch import _diff_dicts
    a = {"meta": {"foo": 1, "bar": 2}}
    b = {"meta": {"foo": 1, "bar": 3, "baz": 4}}
    diffs = _diff_dicts(a, b)
    paths = {d["path"] for d in diffs}
    assert "meta.bar" in paths
    assert "meta.baz" in paths


def test_validate_params_required():
    from app.services.action_engine import _validate_params
    schema = {"required": ["target"], "properties": {"target": {"type": "string"}}}
    assert _validate_params(schema, {}) == ["missing required parameter: target"]
    assert _validate_params(schema, {"target": "abc"}) == []


def test_validate_params_type():
    from app.services.action_engine import _validate_params
    schema = {"properties": {"count": {"type": "integer"}}}
    errors = _validate_params(schema, {"count": "five"})
    assert any("count" in e for e in errors)
    assert _validate_params(schema, {"count": 5}) == []


def test_standard_actions_spec_complete():
    from app.services.action_engine import STANDARD_ACTIONS
    names = {a["name"] for a in STANDARD_ACTIONS}
    assert {"update_property", "link_to", "unlink", "archive", "create_task", "notify"} <= names


def test_action_router_registered():
    from app.api.v1.actions import router
    paths = {r.path for r in router.routes}
    assert "/api/v1/ontology/object-types/{type_id}/actions" in paths
    assert "/api/v1/ontology/instances/{instance_id}/actions/{action_name}" in paths
    assert "/api/v1/ontology/actions" in paths


def test_branch_router_registered():
    from app.api.v1.ontology_branches import router
    paths = {r.path for r in router.routes}
    assert "/api/v1/ontology/branches" in paths
    assert "/api/v1/ontology/branches/{branch_id}" in paths
    assert "/api/v1/ontology/branches/{branch_id}/commit" in paths
    assert "/api/v1/ontology/branches/{branch_id}/merge" in paths
    assert "/api/v1/ontology/branches/{branch_a}/diff/{branch_b}" in paths


# ---------------------------------------------------------------------------
# Async integration tests against in-memory SQLite (skipped if not available)
# ---------------------------------------------------------------------------

import pytest


@pytest.mark.asyncio
async def test_action_execute_in_memory():
    """End-to-end test: create OT + instance, register action, execute, verify result."""
    pytest.importorskip("aiosqlite")

    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from app.database import Base
    from app.models.ontology_v2 import (
        OntologyObjectTypeV2, OntologyInstance,
    )
    from app.services.action_engine import (
        bootstrap_standard_actions, execute_action,
    )
    from sqlalchemy import select
    from app.models.ontology_v2 import OntologyActionType
    import uuid

    # Use SQLite for the test (drops Postgres-only types via fallback).
    # NOTE: production uses postgres; here we just verify object-relational logic.
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    # Workaround: SQLite doesn't support JSONB / UUID natively; we skip if it fails.
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception:
        pytest.skip("SQLite does not support full ontology schema (postgres-only types)")

    Session = async_sessionmaker(engine, expire_on_commit=False)
    tenant_id = "00000000-0000-0000-0000-000000000001"

    async with Session() as db:
        # tenant + object type minimum
        from app.models.tenant import Tenant
        try:
            t = Tenant(id=uuid.UUID(tenant_id), name="t")
            db.add(t)
            await db.flush()
        except Exception:
            pass

        ot = OntologyObjectTypeV2(
            id=uuid.uuid4(),
            tenant_id=uuid.UUID(tenant_id),
            api_name="test_obj",
            display_name="Test",
            primary_key_field="id",
            version=1,
            status="active",
        )
        db.add(ot)
        await db.flush()

        inst = OntologyInstance(
            id=uuid.uuid4(),
            tenant_id=uuid.UUID(tenant_id),
            object_type_id=ot.id,
            object_type_version=1,
            primary_key_value="row1",
            properties={"foo": "bar"},
            status="active",
        )
        db.add(inst)
        await db.flush()

        await bootstrap_standard_actions(db, tenant_id)
        await db.flush()

        at = (await db.execute(
            select(OntologyActionType).where(
                OntologyActionType.tenant_id == tenant_id,
                OntologyActionType.name == "update_property",
            )
        )).scalar_one()

        result = await execute_action(
            db=db,
            tenant_id=tenant_id,
            action_type_id=at.id,
            instance_id=inst.id,
            params={"property": "foo", "value": "baz"},
            user="tester",
        )
        assert result["status"] == "executed"
        assert result["result"]["after"] == "baz"

        # Re-read instance to verify mutation
        await db.refresh(inst)
        assert inst.properties.get("foo") == "baz"


@pytest.mark.asyncio
async def test_branch_create_commit_merge_diff_in_memory():
    pytest.importorskip("aiosqlite")

    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from app.database import Base
    from app.models.ontology_v2 import OntologyObjectTypeV2
    from app.services.ontology_branch import (
        create_branch, commit_to_branch, merge_branch, diff_branches,
    )
    import uuid

    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception:
        pytest.skip("SQLite does not support full ontology schema")

    Session = async_sessionmaker(engine, expire_on_commit=False)
    tenant_id = "00000000-0000-0000-0000-000000000001"

    async with Session() as db:
        from app.models.tenant import Tenant
        try:
            db.add(Tenant(id=uuid.UUID(tenant_id), name="t"))
            await db.flush()
        except Exception:
            pass

        ot = OntologyObjectTypeV2(
            id=uuid.uuid4(),
            tenant_id=uuid.UUID(tenant_id),
            api_name="store",
            display_name="Store",
            primary_key_field="id",
            version=1,
            status="active",
        )
        db.add(ot)
        await db.flush()

        # create two branches off main
        b1 = await create_branch(db, tenant_id, "feature-a")
        b2 = await create_branch(db, tenant_id, "feature-b")
        await db.flush()

        # commit divergent change on b1
        await commit_to_branch(
            db, tenant_id, b1.id, ot.id,
            new_def={
                "id": str(ot.id),
                "api_name": "store",
                "display_name": "Store (renamed)",
                "version": 2,
                "status": "active",
            },
        )
        await db.flush()

        # diff
        diff = await diff_branches(db, tenant_id, b1.id, b2.id)
        assert diff["total_changed_object_types"] >= 1
        assert any(
            any(c["path"] == "display_name" for c in d["changes"])
            for d in diff["diffs"]
        )

        # merge b1 into main
        merge_result = await merge_branch(db, tenant_id, b1.id, into="main")
        assert merge_result["into"] == "main"
        assert len(merge_result["applied"]) >= 1

        await db.refresh(ot)
        assert ot.display_name == "Store (renamed)"
        assert ot.version >= 2
