"""Ontology migration runner — transform instances between schema versions."""
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ontology_migration import OntologyMigrationJob
from app.models.ontology_v2 import OntologyInstance


async def run_migration(session: AsyncSession, job_id: str, tenant_id: str) -> dict:
    """Execute a migration job: transform all instances from old version to new."""
    result = await session.execute(
        select(OntologyMigrationJob).where(OntologyMigrationJob.id == job_id)
    )
    job = result.scalar_one_or_none()
    if not job:
        return {"error": "job not found"}

    job.status = "running"
    job.started_at = datetime.utcnow()
    await session.commit()

    inst_result = await session.execute(
        select(OntologyInstance).where(
            OntologyInstance.object_type_id == job.object_type_id,
            OntologyInstance.tenant_id == tenant_id,
            OntologyInstance.object_type_version == job.from_version,
        )
    )
    instances = inst_result.scalars().all()

    rollback_data = []
    processed = 0
    failed = 0

    for inst in instances:
        try:
            old_props = dict(inst.properties)
            rollback_data.append({
                "id": str(inst.id),
                "properties": old_props,
                "version": inst.object_type_version,
            })

            new_props = dict(old_props)
            spec = job.migration_spec

            # Apply removes
            for field in spec.get("removes", []):
                new_props.pop(field, None)

            # Apply renames
            for old_name, new_name in spec.get("renames", {}).items():
                if old_name in new_props:
                    new_props[new_name] = new_props.pop(old_name)

            # Apply type changes (best-effort cast)
            type_cast_failed = False
            for change in spec.get("type_changes", []):
                field = change["field"]
                to_type = change["to_type"]
                if field in new_props:
                    try:
                        if to_type == "int":
                            new_props[field] = int(new_props[field])
                        elif to_type == "float":
                            new_props[field] = float(new_props[field])
                        elif to_type == "string":
                            new_props[field] = str(new_props[field])
                        elif to_type == "bool":
                            new_props[field] = bool(new_props[field])
                    except (ValueError, TypeError):
                        type_cast_failed = True
                        failed += 1
                        break

            if type_cast_failed:
                continue

            inst.properties = new_props
            inst.object_type_version = job.to_version
            processed += 1
        except Exception:
            failed += 1

    job.rows_processed = processed
    job.rows_failed = failed
    job.rollback_data = rollback_data
    job.status = "success" if failed == 0 else "failed"
    job.finished_at = datetime.utcnow()
    await session.commit()

    return {"processed": processed, "failed": failed, "status": job.status}


async def rollback_migration(session: AsyncSession, job_id: str) -> dict:
    """Rollback a migration using stored rollback_data."""
    result = await session.execute(
        select(OntologyMigrationJob).where(OntologyMigrationJob.id == job_id)
    )
    job = result.scalar_one_or_none()
    if not job:
        return {"error": "job not found"}
    if not job.rollback_data:
        return {"error": "no rollback data"}

    for entry in job.rollback_data:
        inst_result = await session.execute(
            select(OntologyInstance).where(OntologyInstance.id == entry["id"])
        )
        inst = inst_result.scalar_one_or_none()
        if inst:
            inst.properties = entry["properties"]
            inst.object_type_version = entry["version"]

    job.status = "rolled_back"
    await session.commit()
    return {"rolled_back": len(job.rollback_data)}
