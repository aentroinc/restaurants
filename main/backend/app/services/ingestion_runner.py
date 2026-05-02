import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.models.data_source import DataSourceV2, IngestionJob
from app.models.daily_sales import DailyStoreSales
from app.models.store import Store
from app.connectors.registry import get_connector


async def _persist_daily_sales(db: AsyncSession, tenant_id: str, records: list[dict], job: IngestionJob) -> int:
    """Persist transformed records to daily_store_sales via UPSERT."""
    persisted = 0
    for rec in records:
        store_code = rec.get("store_code")
        if not store_code:
            job.rows_rejected = (job.rows_rejected or 0) + 1
            continue

        store_result = await db.execute(
            select(Store.id).where(Store.code == store_code, Store.tenant_id == tenant_id)
        )
        store_id = store_result.scalar_one_or_none()
        if not store_id:
            job.rows_rejected = (job.rows_rejected or 0) + 1
            continue

        values = {
            "tenant_id": uuid.UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
            "store_id": store_id,
            "business_date": rec["business_date"],
            "net_sales": int(rec.get("net_sales", 0)),
            "customer_count": int(rec.get("customer_count", 0)),
            "gross_sales": int(rec.get("gross_sales", 0)),
            "order_count": int(rec.get("order_count", 0)),
            "discount_amount": int(rec.get("discount_amount", 0)),
        }

        stmt = pg_insert(DailyStoreSales).values(**values)
        stmt = stmt.on_conflict_do_update(
            constraint="uq_daily_sales_store_date",
            set_={k: stmt.excluded[k] for k in ["net_sales", "customer_count", "gross_sales", "order_count", "discount_amount"]},
        )
        await db.execute(stmt)
        persisted += 1

    await db.flush()
    return persisted


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

        # 6. Persist to canonical tables
        job.rows_fetched = fetch_result.total_fetched
        job.rows_rejected = 0
        persisted = await _persist_daily_sales(db, tenant_id, transformed, job)
        job.rows_loaded = persisted

        job.cursor_value = fetch_result.cursor
        job.status = "success"
        job.finished_at = datetime.now(timezone.utc)

        # 7. Update data source
        ds.last_sync_at = datetime.now(timezone.utc)
        ds.last_error = None
        ds.status = "connected"

        await db.commit()

        # 8. Trigger KPI recalculation for affected dates
        try:
            from app.database import SyncSession
            from app.services.kpi_engine import recalculate_kpis
            dates = [rec.get("business_date") for rec in transformed if rec.get("business_date")]
            if dates:
                min_date = min(dates) if dates else None
                max_date = max(dates) if dates else None
                with SyncSession() as sync_db:
                    recalculate_kpis(sync_db, tenant_id, start_date=min_date, end_date=max_date)
        except Exception:
            pass  # non-critical

        # 9. Emit lineage event
        try:
            from app.services.lineage_tracker import track_lineage
            track_lineage(
                tenant_id, "sync", "connector", str(ds.id), "canonical_table", None,
                transformation_name="connector_sync",
                metadata={"rows_fetched": job.rows_fetched, "rows_loaded": job.rows_loaded, "rows_rejected": job.rows_rejected},
            )
        except Exception:
            pass  # non-critical

        return {
            "job_id": str(job.id),
            "status": job.status,
            "rows_fetched": job.rows_fetched,
            "rows_loaded": job.rows_loaded,
            "rows_rejected": job.rows_rejected,
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
