"""Pipeline branching — Foundry-style versioning of DAG definitions.

`create_branch` snapshots the current pipeline definition into a new
PipelineBranch row. `merge_branch` overwrites the canonical
Pipeline.definition_json with the branch's (and bumps version).
"""
from __future__ import annotations

import uuid as uuid_mod
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware.audit import log_audit
from app.models.pipeline import Pipeline, PipelineBranch, PipelineRun


async def create_branch(
    db: AsyncSession,
    pipeline_id: UUID,
    name: str,
    base: str = "main",
    created_from_run_id: UUID | None = None,
    user: str | None = None,
) -> PipelineBranch:
    pipeline = (await db.execute(
        select(Pipeline).where(Pipeline.id == pipeline_id)
    )).scalar_one_or_none()
    if pipeline is None:
        raise ValueError("pipeline not found")

    existing = (await db.execute(
        select(PipelineBranch).where(
            PipelineBranch.pipeline_id == pipeline_id,
            PipelineBranch.name == name,
        )
    )).scalar_one_or_none()
    if existing:
        raise ValueError(f"branch '{name}' already exists")

    base_def: dict | None = None
    if base == "main":
        base_def = pipeline.definition_json or {}
    else:
        base_branch = (await db.execute(
            select(PipelineBranch).where(
                PipelineBranch.pipeline_id == pipeline_id,
                PipelineBranch.name == base,
            )
        )).scalar_one_or_none()
        if base_branch is None:
            raise ValueError(f"base branch '{base}' not found")
        base_def = base_branch.definition_json or {}

    branch = PipelineBranch(
        id=uuid_mod.uuid4(),
        pipeline_id=pipeline_id,
        name=name,
        base_branch=base,
        created_from_run_id=created_from_run_id,
        status="open",
        definition_json=base_def,
    )
    db.add(branch)
    await db.flush()

    log_audit(
        tenant_id=str(pipeline.tenant_id), user_id=user,
        action="pipeline_branch_create", resource_type="pipeline_branch",
        resource_id=str(branch.id),
        metadata={"pipeline_id": str(pipeline_id), "name": name, "base": base},
    )
    return branch


async def list_branches(db: AsyncSession, pipeline_id: UUID) -> list[PipelineBranch]:
    res = await db.execute(
        select(PipelineBranch).where(PipelineBranch.pipeline_id == pipeline_id)
        .order_by(PipelineBranch.created_at.desc())
    )
    return list(res.scalars().all())


async def get_branch(db: AsyncSession, branch_id: UUID) -> PipelineBranch | None:
    return (await db.execute(
        select(PipelineBranch).where(PipelineBranch.id == branch_id)
    )).scalar_one_or_none()


async def update_branch_definition(
    db: AsyncSession,
    branch_id: UUID,
    definition_json: dict,
    user: str | None = None,
) -> PipelineBranch:
    branch = await get_branch(db, branch_id)
    if branch is None:
        raise ValueError("branch not found")
    if branch.status != "open":
        raise ValueError(f"branch is {branch.status}; cannot update")
    branch.definition_json = definition_json
    await db.flush()
    log_audit(
        tenant_id=None, user_id=user,
        action="pipeline_branch_update", resource_type="pipeline_branch",
        resource_id=str(branch.id),
        metadata={"pipeline_id": str(branch.pipeline_id)},
    )
    return branch


async def merge_branch(
    db: AsyncSession,
    branch_id: UUID,
    into: str = "main",
    user: str | None = None,
) -> dict:
    branch = await get_branch(db, branch_id)
    if branch is None:
        raise ValueError("branch not found")
    if branch.status != "open":
        raise ValueError(f"branch is {branch.status}; cannot merge")
    if into != "main":
        raise ValueError("only merge into 'main' is supported")

    pipeline = (await db.execute(
        select(Pipeline).where(Pipeline.id == branch.pipeline_id)
    )).scalar_one_or_none()
    if pipeline is None:
        raise ValueError("pipeline not found")

    before = {
        "version": pipeline.version,
        "definition_json": pipeline.definition_json,
    }
    pipeline.definition_json = branch.definition_json or {}
    pipeline.version = (pipeline.version or 1) + 1

    branch.status = "merged"
    branch.merged_at = datetime.now(timezone.utc)
    await db.flush()

    log_audit(
        tenant_id=str(pipeline.tenant_id), user_id=user,
        action="pipeline_branch_merge", resource_type="pipeline_branch",
        resource_id=str(branch.id),
        metadata={
            "pipeline_id": str(pipeline.id),
            "into": into,
            "branch_name": branch.name,
            "before_version": before["version"],
            "after_version": pipeline.version,
        },
    )

    return {
        "branch_id": str(branch.id),
        "pipeline_id": str(pipeline.id),
        "into": into,
        "new_version": pipeline.version,
        "merged_at": branch.merged_at.isoformat(),
    }


__all__ = [
    "create_branch", "list_branches", "get_branch",
    "update_branch_definition", "merge_branch",
]


# Re-export PipelineRun for convenience to API layer.
_ = PipelineRun
