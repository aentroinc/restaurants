"""APScheduler-based cron scheduler for pipelines.

Lifespan-managed: `start_scheduler()` is called from app startup, and
`stop_scheduler()` from shutdown. Schedules are registered/unregistered
at runtime when users hit the schedule API.

Each fired job opens a fresh async session, calls `execute_pipeline`,
and updates `PipelineSchedule.last_run_at` / `next_run_at`.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

logger = logging.getLogger(__name__)

_scheduler: Any = None  # AsyncIOScheduler when running
_started: bool = False


def _get_scheduler():
    global _scheduler
    if _scheduler is not None:
        return _scheduler
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
    except Exception as e:  # noqa: BLE001
        logger.warning("apscheduler not installed: %s", e)
        return None
    _scheduler = AsyncIOScheduler(timezone="UTC")
    return _scheduler


async def _run_schedule_job(schedule_id: str) -> None:
    """Top-level coroutine fired by APScheduler — opens its own DB session."""
    from sqlalchemy import select
    from app.database import async_session
    from app.models.pipeline import PipelineSchedule
    from app.services.pipeline_dag import execute_pipeline

    sid = UUID(schedule_id)
    async with async_session() as db:
        sch = (await db.execute(
            select(PipelineSchedule).where(PipelineSchedule.id == sid)
        )).scalar_one_or_none()
        if sch is None or not sch.enabled:
            return
        try:
            await execute_pipeline(
                db=db,
                pipeline_id=sch.pipeline_id,
                branch=sch.branch_name or "main",
                triggered_by="schedule",
            )
        except Exception as e:  # noqa: BLE001
            logger.exception("scheduled pipeline run failed: %s", e)
        sch.last_run_at = datetime.now(timezone.utc)
        # next_run_at is recomputed by APScheduler; mirror it best-effort
        try:
            sched = _get_scheduler()
            if sched:
                job = sched.get_job(f"pipeline_schedule_{schedule_id}")
                if job and job.next_run_time:
                    sch.next_run_at = job.next_run_time
        except Exception:
            pass
        await db.commit()


def register_schedule(schedule_id: str, cron_expr: str) -> bool:
    """Register or replace a cron job. Returns True on success."""
    sched = _get_scheduler()
    if sched is None:
        return False
    try:
        from apscheduler.triggers.cron import CronTrigger
    except Exception:
        return False

    job_id = f"pipeline_schedule_{schedule_id}"
    try:
        trigger = CronTrigger.from_crontab(cron_expr, timezone="UTC")
    except Exception as e:  # noqa: BLE001
        logger.error("invalid cron expression %s: %s", cron_expr, e)
        return False

    # replace existing
    try:
        sched.remove_job(job_id)
    except Exception:
        pass

    sched.add_job(
        _run_schedule_job,
        trigger=trigger,
        id=job_id,
        args=[schedule_id],
        replace_existing=True,
        misfire_grace_time=60,
        coalesce=True,
    )
    return True


def unregister_schedule(schedule_id: str) -> bool:
    sched = _get_scheduler()
    if sched is None:
        return False
    job_id = f"pipeline_schedule_{schedule_id}"
    try:
        sched.remove_job(job_id)
        return True
    except Exception:
        return False


def get_next_run_at(schedule_id: str) -> datetime | None:
    sched = _get_scheduler()
    if sched is None:
        return None
    job = sched.get_job(f"pipeline_schedule_{schedule_id}")
    if job is None:
        return None
    return job.next_run_time


async def start_scheduler() -> None:
    """Start scheduler and rehydrate enabled schedules from the DB."""
    global _started
    sched = _get_scheduler()
    if sched is None:
        logger.warning("scheduler unavailable; skipping start")
        return
    if _started:
        return
    try:
        sched.start()
        _started = True
    except Exception as e:  # noqa: BLE001
        logger.warning("scheduler.start() failed: %s", e)
        return

    # rehydrate
    try:
        from sqlalchemy import select
        from app.database import async_session
        from app.models.pipeline import PipelineSchedule

        async with async_session() as db:
            rows = (await db.execute(
                select(PipelineSchedule).where(PipelineSchedule.enabled.is_(True))
            )).scalars().all()
            for r in rows:
                register_schedule(str(r.id), r.cron_expr)
    except Exception as e:  # noqa: BLE001
        logger.warning("scheduler rehydrate failed (likely DB not reachable yet): %s", e)


async def stop_scheduler() -> None:
    global _started, _scheduler
    if _scheduler is None or not _started:
        return
    try:
        _scheduler.shutdown(wait=False)
    except Exception:
        pass
    _started = False


# Synchronous helpers for tests
def is_started() -> bool:
    return _started
