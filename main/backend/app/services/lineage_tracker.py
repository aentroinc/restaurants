import uuid
from app.database import SyncSession
from app.models.lineage import LineageEvent


def track_lineage(
    tenant_id: str,
    event_type: str,
    source_type: str,
    source_id: str | None,
    target_type: str,
    target_id: str | None,
    transformation_name: str | None = None,
    transformation_version: str | None = None,
    metadata: dict | None = None,
):
    with SyncSession() as session:
        event = LineageEvent(
            tenant_id=uuid.UUID(tenant_id),
            event_type=event_type,
            source_type=source_type,
            source_id=uuid.UUID(source_id) if source_id else None,
            target_type=target_type,
            target_id=uuid.UUID(target_id) if target_id else None,
            transformation_name=transformation_name,
            transformation_version=transformation_version,
            metadata_=metadata or {},
        )
        session.add(event)
        session.commit()
        return str(event.id)


async def track_lineage_async(
    db,
    tenant_id: str,
    event_type: str,
    source_type: str,
    source_id: str | None,
    target_type: str,
    target_id: str | None,
    transformation_name: str | None = None,
    transformation_version: str | None = None,
    metadata: dict | None = None,
):
    event = LineageEvent(
        tenant_id=uuid.UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
        event_type=event_type,
        source_type=source_type,
        source_id=uuid.UUID(source_id) if source_id and isinstance(source_id, str) else source_id,
        target_type=target_type,
        target_id=uuid.UUID(target_id) if target_id and isinstance(target_id, str) else target_id,
        transformation_name=transformation_name,
        transformation_version=transformation_version,
        metadata_=metadata or {},
    )
    db.add(event)
    await db.flush()
    return str(event.id)
