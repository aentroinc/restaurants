"""Foundry-style ontology branching.

A `branch` is a named copy of the ontology definitions (object types +
their properties + outgoing link types) at the moment of creation. Edits
on a branch update OntologySnapshot rows only — they don't touch the
canonical OntologyObjectTypeV2 rows until merged.

Snapshots store an opaque JSON blob per (branch, object_type) so we can
diff and apply without coupling to the live schema.
"""
from __future__ import annotations

import uuid as uuid_mod
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware.audit import log_audit
from app.models.ontology_v2 import (
    OntologyBranch,
    OntologyLinkType,
    OntologyObjectTypeV2,
    OntologyPropertyType,
    OntologySnapshot,
)


# ---------------------------------------------------------------------------
# Snapshot serialization
# ---------------------------------------------------------------------------

async def _serialize_object_type(db: AsyncSession, ot: OntologyObjectTypeV2) -> dict[str, Any]:
    """Capture a JSON snapshot of an object type + its properties + outgoing links."""
    props = (await db.execute(
        select(OntologyPropertyType).where(
            OntologyPropertyType.object_type_id == ot.id,
        ).order_by(OntologyPropertyType.sort_order)
    )).scalars().all()

    links = (await db.execute(
        select(OntologyLinkType).where(
            OntologyLinkType.from_object_type_id == ot.id,
        )
    )).scalars().all()

    return {
        "id": str(ot.id),
        "api_name": ot.api_name,
        "display_name": ot.display_name,
        "icon": ot.icon,
        "primary_key_field": ot.primary_key_field,
        "version": ot.version,
        "status": ot.status,
        "properties": [
            {
                "id": str(p.id),
                "api_name": p.api_name,
                "display_name": p.display_name,
                "data_type": p.data_type,
                "required": p.required,
                "enum_values": p.enum_values,
                "validation": p.validation,
                "pii_level": p.pii_level,
                "sort_order": p.sort_order,
                "version": p.version,
            }
            for p in props
        ],
        "outgoing_links": [
            {
                "id": str(lt.id),
                "api_name": lt.api_name,
                "display_name": lt.display_name,
                "to_object_type_id": str(lt.to_object_type_id),
                "cardinality": lt.cardinality,
                "version": lt.version,
                "status": lt.status,
            }
            for lt in links
        ],
    }


# ---------------------------------------------------------------------------
# Branch CRUD
# ---------------------------------------------------------------------------

async def create_branch(
    db: AsyncSession,
    tenant_id: str,
    name: str,
    base: str = "main",
    created_by: str | None = None,
) -> OntologyBranch:
    """Create a new branch and snapshot every active object type into it."""
    existing = (await db.execute(
        select(OntologyBranch).where(
            OntologyBranch.tenant_id == tenant_id,
            OntologyBranch.name == name,
        )
    )).scalar_one_or_none()
    if existing:
        raise ValueError(f"branch '{name}' already exists")

    branch = OntologyBranch(
        id=uuid_mod.uuid4(),
        tenant_id=UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
        name=name,
        base_branch=base,
        status="open",
        created_by=created_by,
    )
    db.add(branch)
    await db.flush()

    # snapshot every object type for this tenant
    ots = (await db.execute(
        select(OntologyObjectTypeV2).where(OntologyObjectTypeV2.tenant_id == tenant_id)
    )).scalars().all()

    for ot in ots:
        snap_json = await _serialize_object_type(db, ot)
        snap = OntologySnapshot(
            id=uuid_mod.uuid4(),
            branch_id=branch.id,
            object_type_id=ot.id,
            snapshot_json=snap_json,
            version=ot.version,
        )
        db.add(snap)

    await db.flush()

    log_audit(
        tenant_id=tenant_id, user_id=created_by,
        action="ontology_branch_create", resource_type="ontology_branch",
        resource_id=str(branch.id),
        metadata={"name": name, "base": base, "snapshot_count": len(ots)},
    )

    return branch


async def get_branch(db: AsyncSession, tenant_id: str, branch_id: UUID) -> OntologyBranch | None:
    return (await db.execute(
        select(OntologyBranch).where(
            OntologyBranch.id == branch_id,
            OntologyBranch.tenant_id == tenant_id,
        )
    )).scalar_one_or_none()


async def list_branches(db: AsyncSession, tenant_id: str) -> list[OntologyBranch]:
    res = await db.execute(
        select(OntologyBranch).where(OntologyBranch.tenant_id == tenant_id)
        .order_by(OntologyBranch.created_at.desc())
    )
    return list(res.scalars().all())


async def get_branch_by_name(
    db: AsyncSession, tenant_id: str, name: str
) -> OntologyBranch | None:
    return (await db.execute(
        select(OntologyBranch).where(
            OntologyBranch.tenant_id == tenant_id,
            OntologyBranch.name == name,
        )
    )).scalar_one_or_none()


async def list_snapshots(
    db: AsyncSession, branch_id: UUID
) -> list[OntologySnapshot]:
    res = await db.execute(
        select(OntologySnapshot).where(OntologySnapshot.branch_id == branch_id)
    )
    return list(res.scalars().all())


# ---------------------------------------------------------------------------
# Commit / merge / diff
# ---------------------------------------------------------------------------

async def commit_to_branch(
    db: AsyncSession,
    tenant_id: str,
    branch_id: UUID,
    object_type_id: UUID,
    new_def: dict,
    user: str | None = None,
) -> OntologySnapshot:
    """Update or create the snapshot for object_type on the given branch."""
    branch = await get_branch(db, tenant_id, branch_id)
    if not branch:
        raise ValueError("branch not found")
    if branch.status != "open":
        raise ValueError(f"branch is {branch.status}; cannot commit")

    snap = (await db.execute(
        select(OntologySnapshot).where(
            OntologySnapshot.branch_id == branch_id,
            OntologySnapshot.object_type_id == object_type_id,
        )
    )).scalar_one_or_none()

    if snap is None:
        snap = OntologySnapshot(
            id=uuid_mod.uuid4(),
            branch_id=branch_id,
            object_type_id=object_type_id,
            snapshot_json=new_def,
            version=int(new_def.get("version", 1)),
        )
        db.add(snap)
    else:
        snap.snapshot_json = new_def
        snap.version = int(new_def.get("version", snap.version + 1))

    await db.flush()

    log_audit(
        tenant_id=tenant_id, user_id=user,
        action="ontology_branch_commit", resource_type="ontology_snapshot",
        resource_id=str(snap.id),
        metadata={"branch_id": str(branch_id), "object_type_id": str(object_type_id)},
    )
    return snap


async def merge_branch(
    db: AsyncSession,
    tenant_id: str,
    branch_id: UUID,
    into: str = "main",
    user: str | None = None,
) -> dict:
    """Apply all snapshots from `branch_id` to canonical OT rows, mark merged."""
    branch = await get_branch(db, tenant_id, branch_id)
    if not branch:
        raise ValueError("branch not found")
    if branch.status != "open":
        raise ValueError(f"branch is {branch.status}; cannot merge")
    if into != "main":
        # only "main" merges supported in this iteration
        raise ValueError("only merge into 'main' is supported")

    snaps = await list_snapshots(db, branch_id)
    applied: list[dict] = []

    for snap in snaps:
        ot = (await db.execute(
            select(OntologyObjectTypeV2).where(
                OntologyObjectTypeV2.id == snap.object_type_id,
                OntologyObjectTypeV2.tenant_id == tenant_id,
            )
        )).scalar_one_or_none()
        if ot is None:
            continue

        body = snap.snapshot_json or {}
        before = {
            "display_name": ot.display_name,
            "icon": ot.icon,
            "version": ot.version,
            "status": ot.status,
        }
        if "display_name" in body:
            ot.display_name = body["display_name"]
        if "icon" in body:
            ot.icon = body["icon"]
        if "primary_key_field" in body:
            ot.primary_key_field = body["primary_key_field"]
        if "status" in body:
            ot.status = body["status"]
        # bump version on merge
        ot.version = max(ot.version + 1, int(body.get("version", ot.version)))

        applied.append({
            "object_type_id": str(ot.id),
            "api_name": ot.api_name,
            "before": before,
            "after_version": ot.version,
        })

    branch.status = "merged"
    branch.merged_at = datetime.now(timezone.utc)
    await db.flush()

    log_audit(
        tenant_id=tenant_id, user_id=user,
        action="ontology_branch_merge", resource_type="ontology_branch",
        resource_id=str(branch.id),
        metadata={"into": into, "applied": applied},
    )

    return {
        "branch_id": str(branch.id),
        "into": into,
        "applied": applied,
        "merged_at": branch.merged_at.isoformat() if branch.merged_at else None,
    }


def _diff_dicts(a: dict, b: dict, path: str = "") -> list[dict]:
    """Produce a list of {path, op, before, after} differences."""
    out: list[dict] = []
    keys = set(a.keys()) | set(b.keys())
    for k in sorted(keys):
        sub_path = f"{path}.{k}" if path else k
        av, bv = a.get(k, _MISSING), b.get(k, _MISSING)
        if av is _MISSING:
            out.append({"path": sub_path, "op": "add", "before": None, "after": bv})
        elif bv is _MISSING:
            out.append({"path": sub_path, "op": "remove", "before": av, "after": None})
        elif isinstance(av, dict) and isinstance(bv, dict):
            out.extend(_diff_dicts(av, bv, sub_path))
        elif isinstance(av, list) and isinstance(bv, list):
            if av != bv:
                out.append({"path": sub_path, "op": "replace", "before": av, "after": bv})
        elif av != bv:
            out.append({"path": sub_path, "op": "replace", "before": av, "after": bv})
    return out


_MISSING = object()


async def diff_branches(
    db: AsyncSession,
    tenant_id: str,
    branch_a: UUID,
    branch_b: UUID,
) -> dict:
    """Return diff between snapshots of two branches (per object type)."""
    a = await get_branch(db, tenant_id, branch_a)
    b = await get_branch(db, tenant_id, branch_b)
    if not a or not b:
        raise ValueError("branch not found")

    snaps_a = {s.object_type_id: s.snapshot_json or {} for s in await list_snapshots(db, branch_a)}
    snaps_b = {s.object_type_id: s.snapshot_json or {} for s in await list_snapshots(db, branch_b)}

    diffs: list[dict] = []
    all_ids = set(snaps_a.keys()) | set(snaps_b.keys())
    for ot_id in all_ids:
        sa, sb = snaps_a.get(ot_id, {}), snaps_b.get(ot_id, {})
        d = _diff_dicts(sa, sb)
        if d or (ot_id not in snaps_a) or (ot_id not in snaps_b):
            diffs.append({
                "object_type_id": str(ot_id),
                "api_name": (sa or sb).get("api_name"),
                "in_a": ot_id in snaps_a,
                "in_b": ot_id in snaps_b,
                "changes": d,
            })

    return {
        "branch_a": {"id": str(a.id), "name": a.name},
        "branch_b": {"id": str(b.id), "name": b.name},
        "diffs": diffs,
        "total_changed_object_types": len(diffs),
    }
