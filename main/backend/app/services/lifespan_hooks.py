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


async def on_shutdown(app: Any = None) -> None:
    try:
        from app.services.pipeline_scheduler import stop_scheduler
        await stop_scheduler()
    except Exception as e:  # noqa: BLE001
        logger.warning("pipeline scheduler failed to stop: %s", e)


__all__ = ["on_startup", "on_shutdown"]
