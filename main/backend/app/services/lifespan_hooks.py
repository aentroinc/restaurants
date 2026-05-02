"""App lifespan hooks — start/stop side services without touching main.py logic.

Usage from main.py:
    from app.services.lifespan_hooks import on_startup, on_shutdown

    @app.on_event("startup")
    async def _startup():
        await on_startup(app)

    @app.on_event("shutdown")
    async def _shutdown():
        await on_shutdown(app)
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


async def on_startup(app: Any = None, engine: Any = None) -> None:
    """Start the pipeline scheduler (no-op if APScheduler isn't installed)."""
    try:
        from app.services.pipeline_scheduler import start_scheduler
        await start_scheduler()
    except Exception as e:  # noqa: BLE001
        logger.warning("pipeline scheduler failed to start: %s", e)
    # AIP Logic: hourly anomaly scan + rehydrate per-function cron triggers
    try:
        from app.services.anomaly_detector import register_hourly_job, register_cron_function
        register_hourly_job()
        from sqlalchemy import select
        from app.database import async_session
        from app.models.aip_logic import LogicFunction
        async with async_session() as db:
            rows = (await db.execute(
                select(LogicFunction).where(LogicFunction.enabled.is_(True))
            )).scalars().all()
            for fn in rows:
                trig = fn.trigger_json or {}
                if (trig.get("type") or "").lower() == "cron":
                    cron = (trig.get("config") or {}).get("cron")
                    if cron:
                        register_cron_function(str(fn.id), cron)
    except Exception as e:  # noqa: BLE001
        logger.warning("aip_logic scheduler hooks failed: %s", e)


async def on_shutdown(app: Any = None) -> None:
    try:
        from app.services.pipeline_scheduler import stop_scheduler
        await stop_scheduler()
    except Exception as e:  # noqa: BLE001
        logger.warning("pipeline scheduler failed to stop: %s", e)


__all__ = ["on_startup", "on_shutdown"]
