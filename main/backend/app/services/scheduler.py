"""APScheduler-backed nightly ingestion runner.

Fires once a day (default 03:00 JST) and runs run_sync() for every
DataSource with status='connected'. Lock-free for now; in multi-replica
production, use postgres advisory locks per data_source_id.
"""
from __future__ import annotations

import asyncio
import logging

from app.config import settings

logger = logging.getLogger("aentro.scheduler")


_scheduler = None


def start_scheduler():
    global _scheduler
    if _scheduler is not None:
        return _scheduler
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.cron import CronTrigger
    except ImportError:
        logger.warning("APScheduler not installed; scheduler disabled")
        return None

    sch = AsyncIOScheduler(timezone=settings.SCHEDULER_TZ)
    sch.add_job(
        nightly_sync_all,
        CronTrigger(hour=3, minute=0),
        id="nightly_sync_all",
        replace_existing=True,
    )
    sch.start()
    _scheduler = sch
    return sch


async def nightly_sync_all():
    """Run incremental sync for every connected data source."""
    from sqlalchemy import select
    from app.database import async_session
    from app.models.data_source import DataSource
    from app.services.ingestion_runner import run_sync

    async with async_session() as session:
        res = await session.execute(
            select(DataSource).where(DataSource.status == "connected")
        )
        sources = list(res.scalars().all())

    for s in sources:
        try:
            async with async_session() as session:
                await run_sync(session, data_source_id=str(s.id), job_type="incremental")
                await session.commit()
        except Exception as e:
            logger.exception("Sync failed for %s: %s", s.id, e)
