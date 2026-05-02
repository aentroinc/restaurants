import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.data_source import DataSourceV2, IngestionJob
from app.connectors.registry import get_connector


async def run_sync_job(
    db: AsyncSession,
    tenant_id: str,
    data_source_id: str,
    job_type: str = "incremental",
) -> dict:
    # 1. Load DataSource
    result = await db.execute(
        select(DataSourceV2).where(
            DataSourceV2.id == data_source_id,
            DataSourceV2.tenant_id == tenant_id,
        )
    )
    ds = result.scalar_one_or_none()
    if not ds:
        raise ValueError(f"DataSource not found: {data_source_id}")

    # 2. Get connector
    connector = get_connector(ds.source_type)

    # 3. Create IngestionJob
    job = IngestionJob(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        data_source_id=ds.id,
        job_type=job_type,
        status="running",
        started_at=datetime.now(timezone.utc),
    )
    db.add(job)
    await db.flush()

    try:
        # 4. Fetch
        config = ds.config or {}
        fetch_result = await connector.fetch(config, cursor=job.cursor_value)

        # 5. Transform
        transformed = connector.transform(fetch_result.records)

        # 6. Update job stats
        job.rows_fetched = fetch_result.total_fetched
        job.rows_loaded = len(transformed)
        job.rows_rejected = fetch_result.total_fetched - len(transformed)
        job.cursor_value = fetch_result.cursor
        job.status = "success"
        job.finished_at = datetime.now(timezone.utc)

        # 7. Update data source
        ds.last_sync_at = datetime.now(timezone.utc)
        ds.last_error = None
        ds.status = "connected"

        await db.commit()

        return {
            "job_id": str(job.id),
            "status": job.status,
            "rows_fetched": job.rows_fetched,
            "rows_loaded": job.rows_loaded,
            "rows_rejected": job.rows_rejected,
            "records": transformed,
        }

    except Exception as e:
        job.status = "failed"
        job.finished_at = datetime.now(timezone.utc)
        job.error_log = [{"error": str(e), "at": datetime.now(timezone.utc).isoformat()}]

        ds.last_error = str(e)
        ds.status = "error"

        await db.commit()

        return {
            "job_id": str(job.id),
            "status": "failed",
            "error": str(e),
        }
