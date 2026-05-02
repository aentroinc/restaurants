"""DAG execution engine for Pipeline Builder.

A pipeline definition (`Pipeline.definition_json`) is shaped like:
    {
        "nodes": [
            {"id": "A", "type": "transform_sql", "config": {...}, "inputs": []},
            {"id": "B", "type": "validate", "config": {...}, "inputs": ["A"]},
            ...
        ],
        "edges": [["A","B"], ["A","C"], ["B","D"], ["C","D"]]
    }

The engine resolves topological order, runs nodes serially, and skips
downstream nodes when an upstream fails. Each node emits a LineageEvent
and the run is recorded with per-node `PipelineNodeRun`.
"""
from __future__ import annotations

import uuid as uuid_mod
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware.audit import log_audit
from app.models.lineage import LineageEvent
from app.models.pipeline import (
    Pipeline,
    PipelineBranch,
    PipelineNodeRun,
    PipelineRun,
)


# ---------------------------------------------------------------------------
# Topological sort
# ---------------------------------------------------------------------------

class DAGError(Exception):
    pass


def topo_sort(nodes: list[dict], edges: list[list[str]]) -> list[str]:
    """Kahn's algorithm. Returns ordered list of node IDs.

    Raises DAGError on cycle or unknown node reference.
    """
    node_ids = [n["id"] for n in nodes]
    id_set = set(node_ids)
    indeg: dict[str, int] = {nid: 0 for nid in node_ids}
    adj: dict[str, list[str]] = {nid: [] for nid in node_ids}

    for src, dst in edges:
        if src not in id_set or dst not in id_set:
            raise DAGError(f"edge references unknown node: {src}->{dst}")
        adj[src].append(dst)
        indeg[dst] += 1

    queue = [nid for nid, d in indeg.items() if d == 0]
    order: list[str] = []
    while queue:
        # stable order: pick the first in node declaration order
        queue.sort(key=lambda nid: node_ids.index(nid))
        cur = queue.pop(0)
        order.append(cur)
        for nxt in adj[cur]:
            indeg[nxt] -= 1
            if indeg[nxt] == 0:
                queue.append(nxt)

    if len(order) != len(node_ids):
        raise DAGError("cycle detected in pipeline DAG")
    return order


def _build_predecessors(nodes: list[dict], edges: list[list[str]]) -> dict[str, list[str]]:
    preds: dict[str, list[str]] = {n["id"]: [] for n in nodes}
    for src, dst in edges:
        preds.setdefault(dst, []).append(src)
    return preds


# ---------------------------------------------------------------------------
# Node executors
# ---------------------------------------------------------------------------

NodeHandler = Callable[[dict, dict], Awaitable[dict]]
_NODE_HANDLERS: dict[str, NodeHandler] = {}


def register_node_type(name: str):
    def deco(fn: NodeHandler):
        _NODE_HANDLERS[name] = fn
        return fn
    return deco


def list_node_types() -> list[str]:
    return sorted(_NODE_HANDLERS.keys())


@register_node_type("transform_sql")
async def _h_transform_sql(node: dict, ctx: dict) -> dict:
    cfg = node.get("config") or {}
    return {
        "kind": "transform_sql",
        "sql_preview": (cfg.get("sql") or "")[:200],
        "output_dataset": cfg.get("output_dataset"),
        "rows_estimated": cfg.get("rows_estimated", 0),
    }


@register_node_type("connector_fetch")
async def _h_connector_fetch(node: dict, ctx: dict) -> dict:
    cfg = node.get("config") or {}
    return {
        "kind": "connector_fetch",
        "connector": cfg.get("connector"),
        "endpoint": cfg.get("endpoint"),
        "fetched": True,
    }


@register_node_type("validate")
async def _h_validate(node: dict, ctx: dict) -> dict:
    cfg = node.get("config") or {}
    rules = cfg.get("rules") or []
    if cfg.get("force_fail"):
        raise RuntimeError(cfg.get("fail_message", "validation failed"))
    return {"kind": "validate", "rules_count": len(rules), "passed": True}


@register_node_type("writeback")
async def _h_writeback(node: dict, ctx: dict) -> dict:
    cfg = node.get("config") or {}
    return {
        "kind": "writeback",
        "target": cfg.get("target"),
        "rows_written": cfg.get("rows_written", 0),
    }


@register_node_type("python_func")
async def _h_python_func(node: dict, ctx: dict) -> dict:
    """Invoke a registered Python callable from `ctx['python_funcs']`."""
    cfg = node.get("config") or {}
    name = cfg.get("func")
    funcs = (ctx or {}).get("python_funcs") or {}
    fn = funcs.get(name)
    if fn is None:
        raise RuntimeError(f"python_func '{name}' not registered in ctx")
    out = fn(cfg.get("args") or {}, ctx)
    if hasattr(out, "__await__"):
        out = await out  # type: ignore[assignment]
    return {"kind": "python_func", "func": name, "result": out}


async def execute_node(node_def: dict, ctx: dict) -> dict:
    """Dispatch to the registered handler for this node type."""
    ntype = node_def.get("type")
    handler = _NODE_HANDLERS.get(ntype)
    if handler is None:
        raise DAGError(f"unknown node type: {ntype}")
    return await handler(node_def, ctx)


# ---------------------------------------------------------------------------
# Pipeline execution
# ---------------------------------------------------------------------------

async def _emit_lineage(
    db: AsyncSession,
    tenant_id: UUID | str,
    run_id: UUID,
    node_id: str,
    ntype: str,
    ok: bool,
    details: dict,
) -> None:
    try:
        ev = LineageEvent(
            tenant_id=tenant_id if isinstance(tenant_id, uuid_mod.UUID) else uuid_mod.UUID(str(tenant_id)),
            event_type=f"pipeline.node.{'success' if ok else 'failure'}",
            source_type="pipeline_run",
            source_id=run_id,
            target_type="pipeline_node",
            target_id=None,
            transformation_name=f"pipeline.{ntype}",
            transformation_version="1.0",
            metadata_={
                "node_id": node_id,
                "node_type": ntype,
                "ok": ok,
                "details": details,
                "ts": datetime.now(timezone.utc).isoformat(),
            },
        )
        db.add(ev)
        await db.flush()
    except Exception:
        pass


async def _resolve_definition(
    db: AsyncSession,
    pipeline: Pipeline,
    branch: str,
) -> dict:
    """Pick the branch-specific definition if any, else the canonical one."""
    if branch and branch != "main":
        br = (await db.execute(
            select(PipelineBranch).where(
                PipelineBranch.pipeline_id == pipeline.id,
                PipelineBranch.name == branch,
            )
        )).scalar_one_or_none()
        if br and br.definition_json:
            return br.definition_json
    return pipeline.definition_json or {}


async def execute_pipeline(
    db: AsyncSession,
    pipeline_id: UUID,
    branch: str = "main",
    triggered_by: str = "manual",
    ctx: dict | None = None,
) -> dict:
    """Topologically run the pipeline serially.

    On node failure, downstream nodes are marked `skipped`. The run is
    `failed` if any node failed (otherwise `success`). A `partial` status
    is used when some nodes succeeded but at least one failed.
    """
    pipeline = (await db.execute(
        select(Pipeline).where(Pipeline.id == pipeline_id)
    )).scalar_one_or_none()
    if pipeline is None:
        raise DAGError("pipeline not found")

    definition = await _resolve_definition(db, pipeline, branch)
    nodes = definition.get("nodes") or []
    edges = definition.get("edges") or []
    order = topo_sort(nodes, edges)
    by_id = {n["id"]: n for n in nodes}
    preds = _build_predecessors(nodes, edges)

    run = PipelineRun(
        id=uuid_mod.uuid4(),
        pipeline_id=pipeline.id,
        branch_name=branch,
        status="running",
        started_at=datetime.now(timezone.utc),
        triggered_by=triggered_by,
        log_jsonb={"order": order},
    )
    db.add(run)
    await db.flush()

    ctx = dict(ctx or {})
    ctx.setdefault("tenant_id", str(pipeline.tenant_id))
    ctx.setdefault("pipeline_id", str(pipeline.id))
    ctx.setdefault("run_id", str(run.id))

    node_results: dict[str, dict] = {}
    failed_nodes: set[str] = set()
    succeeded_nodes: set[str] = set()

    for nid in order:
        node = by_id[nid]
        node_run = PipelineNodeRun(
            id=uuid_mod.uuid4(),
            pipeline_run_id=run.id,
            node_id=nid,
            status="pending",
            input_dataset_ids=(node.get("config") or {}).get("input_dataset_ids") or [],
            output_dataset_ids=[],
        )
        db.add(node_run)
        await db.flush()

        # skip if any upstream failed
        upstream_failed = any(p in failed_nodes for p in preds.get(nid, []))
        if upstream_failed:
            node_run.status = "skipped"
            node_run.finished_at = datetime.now(timezone.utc)
            node_run.error = "upstream node failed"
            failed_nodes.add(nid)  # propagate skip downstream
            node_results[nid] = {"status": "skipped", "error": "upstream node failed"}
            await db.flush()
            continue

        node_run.status = "running"
        node_run.started_at = datetime.now(timezone.utc)
        await db.flush()

        try:
            details = await execute_node(node, ctx)
            node_run.status = "success"
            node_run.finished_at = datetime.now(timezone.utc)
            out_ds = (node.get("config") or {}).get("output_dataset_ids") or []
            node_run.output_dataset_ids = out_ds
            node_results[nid] = {"status": "success", "details": details}
            succeeded_nodes.add(nid)
            await _emit_lineage(db, pipeline.tenant_id, run.id, nid, node.get("type", ""), True, details)
        except Exception as e:  # noqa: BLE001
            node_run.status = "failed"
            node_run.finished_at = datetime.now(timezone.utc)
            node_run.error = str(e)
            node_results[nid] = {"status": "failed", "error": str(e)}
            failed_nodes.add(nid)
            await _emit_lineage(
                db, pipeline.tenant_id, run.id, nid, node.get("type", ""), False,
                {"error": str(e)},
            )

        await db.flush()

    # final run status
    has_failures = any(r["status"] == "failed" for r in node_results.values())
    has_successes = any(r["status"] == "success" for r in node_results.values())
    if has_failures and has_successes:
        run.status = "partial"
    elif has_failures:
        run.status = "failed"
    else:
        run.status = "success"
    run.finished_at = datetime.now(timezone.utc)
    run.log_jsonb = {**(run.log_jsonb or {}), "results": node_results}
    await db.flush()

    log_audit(
        tenant_id=str(pipeline.tenant_id),
        user_id=triggered_by if triggered_by not in ("manual", "schedule") else None,
        action="pipeline_run",
        resource_type="pipeline",
        resource_id=str(pipeline.id),
        metadata={
            "run_id": str(run.id),
            "branch": branch,
            "status": run.status,
            "triggered_by": triggered_by,
            "node_count": len(order),
            "failed": sorted([n for n, r in node_results.items() if r["status"] == "failed"]),
        },
    )

    return {
        "run_id": str(run.id),
        "pipeline_id": str(pipeline.id),
        "branch": branch,
        "status": run.status,
        "order": order,
        "results": node_results,
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "finished_at": run.finished_at.isoformat() if run.finished_at else None,
    }
