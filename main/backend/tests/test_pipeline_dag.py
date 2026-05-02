"""Unit tests for the pipeline DAG engine.

Covers:
  - topological sort (linear, diamond, cycle, unknown ref)
  - registered node types
  - end-to-end execute_pipeline against in-memory SQLite (skipped if not avail)
  - failure isolation: B fails -> D is skipped, but C still runs and succeeds
  - pipeline branching: create / merge updates canonical definition
"""
from __future__ import annotations

import uuid

import pytest


# ---------------------------------------------------------------------------
# topo_sort & validation
# ---------------------------------------------------------------------------

def test_topo_sort_linear():
    from app.services.pipeline_dag import topo_sort
    nodes = [{"id": "A"}, {"id": "B"}, {"id": "C"}]
    edges = [["A", "B"], ["B", "C"]]
    assert topo_sort(nodes, edges) == ["A", "B", "C"]


def test_topo_sort_diamond():
    from app.services.pipeline_dag import topo_sort
    nodes = [{"id": "A"}, {"id": "B"}, {"id": "C"}, {"id": "D"}]
    edges = [["A", "B"], ["A", "C"], ["B", "D"], ["C", "D"]]
    order = topo_sort(nodes, edges)
    # A first, D last, B & C in between in some order
    assert order[0] == "A"
    assert order[-1] == "D"
    assert set(order[1:3]) == {"B", "C"}


def test_topo_sort_cycle_raises():
    from app.services.pipeline_dag import topo_sort, DAGError
    nodes = [{"id": "A"}, {"id": "B"}]
    edges = [["A", "B"], ["B", "A"]]
    with pytest.raises(DAGError):
        topo_sort(nodes, edges)


def test_topo_sort_unknown_node_raises():
    from app.services.pipeline_dag import topo_sort, DAGError
    nodes = [{"id": "A"}]
    edges = [["A", "X"]]
    with pytest.raises(DAGError):
        topo_sort(nodes, edges)


# ---------------------------------------------------------------------------
# Node handler registry
# ---------------------------------------------------------------------------

def test_node_types_registered():
    from app.services.pipeline_dag import list_node_types
    types = set(list_node_types())
    assert {"transform_sql", "connector_fetch", "validate", "writeback", "python_func"} <= types


@pytest.mark.asyncio
async def test_execute_node_validate_ok():
    from app.services.pipeline_dag import execute_node
    out = await execute_node({"id": "n", "type": "validate", "config": {"rules": [1, 2, 3]}}, {})
    assert out["passed"] is True
    assert out["rules_count"] == 3


@pytest.mark.asyncio
async def test_execute_node_validate_fail():
    from app.services.pipeline_dag import execute_node
    with pytest.raises(RuntimeError):
        await execute_node(
            {"id": "n", "type": "validate", "config": {"force_fail": True, "fail_message": "boom"}},
            {},
        )


@pytest.mark.asyncio
async def test_execute_node_python_func():
    from app.services.pipeline_dag import execute_node

    def add(args, ctx):
        return args.get("x", 0) + args.get("y", 0)

    out = await execute_node(
        {"id": "n", "type": "python_func", "config": {"func": "add", "args": {"x": 2, "y": 3}}},
        {"python_funcs": {"add": add}},
    )
    assert out["result"] == 5


# ---------------------------------------------------------------------------
# Models import sanity
# ---------------------------------------------------------------------------

def test_pipeline_models_imported():
    from app.models.pipeline import (
        Pipeline, PipelineRun, PipelineNodeRun, PipelineSchedule, PipelineBranch,
    )
    assert Pipeline.__tablename__ == "pipelines"
    assert PipelineRun.__tablename__ == "pipeline_runs"
    assert PipelineNodeRun.__tablename__ == "pipeline_node_runs"
    assert PipelineSchedule.__tablename__ == "pipeline_schedules"
    assert PipelineBranch.__tablename__ == "pipeline_branches"


def test_pipeline_router_registered():
    from app.api.v1.pipeline import router
    paths = {r.path for r in router.routes}
    assert "/api/v1/pipelines" in paths
    assert "/api/v1/pipelines/{pipeline_id}" in paths
    assert "/api/v1/pipelines/{pipeline_id}/run" in paths
    assert "/api/v1/pipelines/{pipeline_id}/runs" in paths
    assert "/api/v1/pipelines/runs/{run_id}" in paths
    assert "/api/v1/pipelines/{pipeline_id}/branches" in paths
    assert "/api/v1/pipelines/{pipeline_id}/merge" in paths
    assert "/api/v1/pipelines/{pipeline_id}/schedules" in paths


# ---------------------------------------------------------------------------
# In-memory integration: diamond DAG with B failing -> D skipped, C succeeds
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_execute_pipeline_diamond_with_failure():
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
    tenant_id = uuid.UUID("00000000-0000-0000-0000-000000000001")

    async with Session() as db:
        from app.models.tenant import Tenant
        try:
            db.add(Tenant(id=tenant_id, name="t"))
            await db.flush()
        except Exception:
            pass

        defn = {
            "nodes": [
                {"id": "A", "type": "transform_sql", "config": {"sql": "SELECT 1"}},
                {"id": "B", "type": "validate", "config": {"force_fail": True, "fail_message": "B failed"}},
                {"id": "C", "type": "validate", "config": {"rules": [1]}},
                {"id": "D", "type": "writeback", "config": {"target": "t"}},
            ],
            "edges": [["A", "B"], ["A", "C"], ["B", "D"], ["C", "D"]],
        }

        p = Pipeline(
            id=uuid.uuid4(), tenant_id=tenant_id, name="p1",
            definition_json=defn, branch_name="main", version=1, status="active",
        )
        db.add(p)
        await db.flush()

        result = await execute_pipeline(db, p.id, branch="main", triggered_by="manual")
        await db.commit()

        results = result["results"]
        assert result["order"][0] == "A"
        assert results["A"]["status"] == "success"
        assert results["B"]["status"] == "failed"
        assert results["C"]["status"] == "success"
        # D had a failed upstream (B) so it must be skipped
        assert results["D"]["status"] == "skipped"
        # overall: had at least one success and one failure -> partial
        assert result["status"] == "partial"


@pytest.mark.asyncio
async def test_execute_pipeline_all_success_linear():
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
    tenant_id = uuid.UUID("00000000-0000-0000-0000-000000000001")

    async with Session() as db:
        from app.models.tenant import Tenant
        try:
            db.add(Tenant(id=tenant_id, name="t"))
            await db.flush()
        except Exception:
            pass

        defn = {
            "nodes": [
                {"id": "A", "type": "connector_fetch", "config": {"connector": "pos"}},
                {"id": "B", "type": "transform_sql", "config": {"sql": "SELECT 1"}},
                {"id": "C", "type": "writeback", "config": {"target": "t"}},
            ],
            "edges": [["A", "B"], ["B", "C"]],
        }

        p = Pipeline(
            id=uuid.uuid4(), tenant_id=tenant_id, name="p2",
            definition_json=defn, branch_name="main", version=1, status="active",
        )
        db.add(p)
        await db.flush()

        result = await execute_pipeline(db, p.id, branch="main")
        await db.commit()

        assert result["order"] == ["A", "B", "C"]
        assert result["status"] == "success"
        assert all(r["status"] == "success" for r in result["results"].values())


@pytest.mark.asyncio
async def test_pipeline_branch_create_and_merge():
    pytest.importorskip("aiosqlite")

    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

    from app.database import Base
    from app.models.pipeline import Pipeline
    from app.services.pipeline_branch import create_branch, merge_branch, update_branch_definition

    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception:
        pytest.skip("SQLite cannot create the full schema")

    Session = async_sessionmaker(engine, expire_on_commit=False)
    tenant_id = uuid.UUID("00000000-0000-0000-0000-000000000001")

    async with Session() as db:
        from app.models.tenant import Tenant
        try:
            db.add(Tenant(id=tenant_id, name="t"))
            await db.flush()
        except Exception:
            pass

        defn_main = {
            "nodes": [{"id": "A", "type": "transform_sql", "config": {"sql": "v1"}}],
            "edges": [],
        }
        p = Pipeline(
            id=uuid.uuid4(), tenant_id=tenant_id, name="p3",
            definition_json=defn_main, branch_name="main", version=1, status="active",
        )
        db.add(p)
        await db.flush()

        branch = await create_branch(db, p.id, "feature-x")
        assert branch.definition_json == defn_main

        defn_v2 = {
            "nodes": [{"id": "A", "type": "transform_sql", "config": {"sql": "v2"}}],
            "edges": [],
        }
        await update_branch_definition(db, branch.id, defn_v2)

        merged = await merge_branch(db, branch.id, into="main")
        assert merged["new_version"] == 2

        await db.refresh(p)
        assert p.definition_json["nodes"][0]["config"]["sql"] == "v2"
        assert p.version == 2
