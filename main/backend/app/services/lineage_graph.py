"""Lineage graph builder.

Walks LineageEvent rows recursively from a root node to produce
{nodes: [...], edges: [...]} suitable for graph visualization.

direction:
- 'downstream' — follow source_id == current → target_id
- 'upstream'   — follow target_id == current → source_id
- 'both'       — both at each step
"""
from __future__ import annotations

import uuid
from functools import lru_cache
from typing import Iterable

from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lineage import LineageEvent


def _node_key(node_type: str, node_id: str) -> str:
    return f"{node_type}:{node_id}"


def _to_uuid(v) -> uuid.UUID | None:
    if v is None:
        return None
    if isinstance(v, uuid.UUID):
        return v
    try:
        return uuid.UUID(str(v))
    except (ValueError, TypeError):
        return None


async def _fetch_outbound(db: AsyncSession, tenant_id: uuid.UUID, source_type: str, source_id: uuid.UUID) -> list[LineageEvent]:
    res = await db.execute(
        select(LineageEvent).where(
            and_(
                LineageEvent.tenant_id == tenant_id,
                LineageEvent.source_type == source_type,
                LineageEvent.source_id == source_id,
            )
        ).limit(500)
    )
    return list(res.scalars().all())


async def _fetch_inbound(db: AsyncSession, tenant_id: uuid.UUID, target_type: str, target_id: uuid.UUID) -> list[LineageEvent]:
    res = await db.execute(
        select(LineageEvent).where(
            and_(
                LineageEvent.tenant_id == tenant_id,
                LineageEvent.target_type == target_type,
                LineageEvent.target_id == target_id,
            )
        ).limit(500)
    )
    return list(res.scalars().all())


async def build_graph(
    db: AsyncSession,
    tenant_id: str,
    root_type: str,
    root_id: str,
    depth: int = 3,
    direction: str = "both",
) -> dict:
    """BFS traversal of LineageEvent producing nodes + edges.

    Returns:
        {
            "root": {"type": str, "id": str},
            "nodes": [{"key": str, "type": str, "id": str, "depth": int}, ...],
            "edges": [{"id": str, "from": key, "to": key, "event_type": str,
                       "transformation": str|None, "metadata": dict, "created_at": str}, ...],
            "stats": {"node_count": int, "edge_count": int, "max_depth": int, "truncated": bool}
        }
    """
    if direction not in ("downstream", "upstream", "both"):
        direction = "both"
    depth = max(0, min(int(depth), 6))

    tid = _to_uuid(tenant_id)
    rid = _to_uuid(root_id)
    if tid is None or rid is None:
        return {
            "root": {"type": root_type, "id": root_id},
            "nodes": [], "edges": [],
            "stats": {"node_count": 0, "edge_count": 0, "max_depth": 0, "truncated": False, "error": "invalid_uuid"},
        }

    root_key = _node_key(root_type, str(rid))
    nodes: dict[str, dict] = {root_key: {"key": root_key, "type": root_type, "id": str(rid), "depth": 0}}
    edges: dict[str, dict] = {}
    truncated = False
    max_seen_depth = 0

    # frontier: list of (type, uuid, depth)
    frontier: list[tuple[str, uuid.UUID, int]] = [(root_type, rid, 0)]
    visited: set[str] = {root_key}
    EDGE_LIMIT = 2000

    while frontier:
        node_type, node_id, d = frontier.pop(0)
        if d >= depth:
            continue
        events: list[LineageEvent] = []
        if direction in ("downstream", "both"):
            events.extend(await _fetch_outbound(db, tid, node_type, node_id))
        if direction in ("upstream", "both"):
            events.extend(await _fetch_inbound(db, tid, node_type, node_id))

        for ev in events:
            if not ev.source_id or not ev.target_id:
                continue
            from_key = _node_key(ev.source_type, str(ev.source_id))
            to_key = _node_key(ev.target_type, str(ev.target_id))
            edge_id = str(ev.id)
            if edge_id in edges:
                continue
            if len(edges) >= EDGE_LIMIT:
                truncated = True
                break
            edges[edge_id] = {
                "id": edge_id,
                "from": from_key,
                "to": to_key,
                "event_type": ev.event_type,
                "transformation": ev.transformation_name,
                "metadata": ev.metadata_ or {},
                "created_at": ev.created_at.isoformat() if ev.created_at else None,
            }
            for k, ntype, nid in ((from_key, ev.source_type, ev.source_id), (to_key, ev.target_type, ev.target_id)):
                if k not in nodes:
                    nd = d + 1
                    nodes[k] = {"key": k, "type": ntype, "id": str(nid), "depth": nd}
                    if nd > max_seen_depth:
                        max_seen_depth = nd
                    if k not in visited and nd < depth:
                        visited.add(k)
                        frontier.append((ntype, nid, nd))
        if truncated:
            break

    return {
        "root": {"type": root_type, "id": str(rid)},
        "nodes": list(nodes.values()),
        "edges": list(edges.values()),
        "stats": {
            "node_count": len(nodes),
            "edge_count": len(edges),
            "max_depth": max_seen_depth,
            "truncated": truncated,
            "direction": direction,
            "depth_limit": depth,
        },
    }


# A small in-process LRU cache keyed by (tenant, type, id, depth, direction).
# Cleared on writes — caller must invalidate.
@lru_cache(maxsize=256)
def _cache_key(tenant_id: str, root_type: str, root_id: str, depth: int, direction: str) -> str:
    return f"{tenant_id}|{root_type}|{root_id}|{depth}|{direction}"


_GRAPH_CACHE: dict[str, dict] = {}


async def build_graph_cached(
    db: AsyncSession,
    tenant_id: str,
    root_type: str,
    root_id: str,
    depth: int = 3,
    direction: str = "both",
    use_cache: bool = True,
) -> dict:
    key = _cache_key(tenant_id, root_type, root_id, depth, direction)
    if use_cache and key in _GRAPH_CACHE:
        return _GRAPH_CACHE[key]
    result = await build_graph(db, tenant_id, root_type, root_id, depth, direction)
    if use_cache and len(_GRAPH_CACHE) < 512:
        _GRAPH_CACHE[key] = result
    return result


def invalidate_graph_cache():
    _GRAPH_CACHE.clear()
    _cache_key.cache_clear()
