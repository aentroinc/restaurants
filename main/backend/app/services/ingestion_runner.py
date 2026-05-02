"""Orchestrates one ingestion job: fetch -> Bronze -> Silver.

Idempotent on (tenant_id, source_id, target_table). Errors at the row level
are recorded in IngestionRecord.error and the job continues. Errors at the
fetch level abort the job with status='failed'.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.connectors.base import BaseConnector, CanonicalRecord, ConnectorRegistry
from app.core.secrets import decrypt_for_tenant
from app.models.data_source import DataSource, IngestionJob, IngestionRecord
from app.services.silver_writer import write_canonical

logger = logging.getLogger("aentro.ingestion")


async def _instantiate(source: DataSource) -> BaseConnector:
    cls = ConnectorRegistry.get(source.type)
    creds: dict = {}
    if source.credentials_encrypted:
        try:
            decrypted = decrypt_for_tenant(str(source.tenant_id), source.credentials_encrypted)
            if isinstance(decrypted, dict):
                creds = decrypted
        except Exception as e:
            logger.warning("Failed to decrypt credentials for source %s: %s", source.id, e)
    return cls(credentials=creds, config=source.config or {})


async def run_sync(
    session: AsyncSession,
    *,
    data_source_id: str,
    job_type: str = "incremental",
) -> IngestionJob:
    res = await session.execute(
        select(DataSource).where(DataSource.id == data_source_id)
    )
    source = res.scalar_one_or_none()
    if not source:
        raise ValueError(f"Unknown data_source_id={data_source_id}")

    job = IngestionJob(
        tenant_id=source.tenant_id,
        data_source_id=source.id,
        job_type=job_type,
        status="running",
        started_at=datetime.now(timezone.utc),
    )
    session.add(job)
    await session.flush()

    try:
        connector = await _instantiate(source)
        result = await connector.fetch(cursor=None)
        if result.error:
            job.status = "failed"
            job.error_log = [{"phase": "fetch", "error": result.error}]
            job.finished_at = datetime.now(timezone.utc)
            await session.flush()
            return job

        job.rows_fetched = len(result.raw_records)
        canonicals: list[CanonicalRecord] = connector.transform(result.raw_records)

        # Bronze: persist provenance per canonical record
        loaded = 0
        rejected = 0
        errors = []
        for cr in canonicals:
            rec = IngestionRecord(
                tenant_id=source.tenant_id,
                ingestion_job_id=job.id,
                source_payload={"target_table": cr.target_table, **cr.payload},
                source_id=cr.source_id,
                target_table=cr.target_table,
            )
            session.add(rec)
            try:
                await write_canonical(session, str(source.tenant_id), cr)
                rec.processed_at = datetime.now(timezone.utc)
                loaded += 1
            except Exception as e:
                rejected += 1
                rec.error = str(e)[:512]
                errors.append({"source_id": cr.source_id, "error": str(e)[:200]})
                if len(errors) >= 50:
                    break

        job.rows_loaded = loaded
        job.rows_rejected = rejected
        job.error_log = errors
        job.cursor = result.next_cursor
        job.status = "success" if rejected == 0 else "partial"
        job.finished_at = datetime.now(timezone.utc)
        source.last_sync_at = job.finished_at
        source.status = "connected"
        await session.flush()
        return job
    except Exception as e:
        job.status = "failed"
        job.error_log = [{"phase": "runner", "error": str(e)[:512]}]
        job.finished_at = datetime.now(timezone.utc)
        source.status = "error"
        source.last_error = str(e)[:512]
        await session.flush()
        return job
