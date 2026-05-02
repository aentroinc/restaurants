"""KPI anomaly detector — periodically inspects recent KPI rows and fires
LogicFunctions whose `trigger_json.type == "anomaly"` is breached.

毎時バッチで `scan_and_fire(db)` が呼ばれ、各 LogicFunction を見て
trigger に応じた KPI コンテキストを作って `run_function` を実行する。
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.aip_logic import LogicFunction
from app.models.kpi import StoreDailyKPI

logger = logging.getLogger(__name__)


def _coerce_float(v: Any) -> float | None:
    if v is None:
        return None
    try:
        return float(v)
    except Exception:
        return None


async def _build_kpi_context(
    db: AsyncSession,
    tenant_id: str,
    store_id: str | None = None,
    days: int = 1,
) -> dict[str, Any]:
    """Pull the latest KPI row(s) and flatten them into a context dict."""
    today = datetime.now(timezone.utc).date()
    since = today - timedelta(days=days)
    q = (
        select(StoreDailyKPI)
        .where(StoreDailyKPI.tenant_id == tenant_id)
        .where(StoreDailyKPI.business_date >= since)
        .order_by(StoreDailyKPI.business_date.desc())
        .limit(1)
    )
    if store_id:
        q = q.where(StoreDailyKPI.store_id == store_id)
    row = (await db.execute(q)).scalar_one_or_none()
    if row is None:
        return {}
    fields = [
        "net_sales", "customer_count", "avg_ticket", "cogs", "cogs_rate",
        "labor_cost", "labor_cost_rate", "fl_ratio", "sales_per_labor_hour",
        "gross_profit", "gross_profit_rate", "operating_profit",
        "operating_profit_rate", "review_score", "health_score",
    ]
    return {k: _coerce_float(getattr(row, k, None)) for k in fields}


async def scan_and_fire(db: AsyncSession) -> dict[str, Any]:
    """Scan all enabled anomaly-triggered functions and fire those whose
    threshold is breached. Returns a summary dict."""
    from app.services.aip_logic_engine import run_function

    fns = (await db.execute(
        select(LogicFunction).where(LogicFunction.enabled.is_(True))
    )).scalars().all()

    fired = 0
    skipped = 0
    failed = 0

    for fn in fns:
        trig = fn.trigger_json or {}
        if (trig.get("type") or "").lower() != "anomaly":
            skipped += 1
            continue
        cfg = trig.get("config", {}) or {}
        store_id = cfg.get("store_id")
        kpi_ctx = await _build_kpi_context(db, str(fn.tenant_id), store_id=store_id)
        if not kpi_ctx:
            skipped += 1
            continue
        payload = {
            "type": "anomaly",
            "kpi": kpi_ctx,
            "store_id": store_id,
            "trigger": trig,
        }
        try:
            result = await run_function(db, fn.id, trigger_payload=payload)
            if result.get("status") == "success":
                fired += 1
            elif result.get("status") == "skipped":
                skipped += 1
            else:
                failed += 1
        except Exception as e:  # noqa: BLE001
            logger.exception("anomaly run_function failed for %s: %s", fn.id, e)
            failed += 1

    await db.commit()
    return {"fired": fired, "skipped": skipped, "failed": failed, "scanned": len(fns)}


async def _hourly_job() -> None:
    """APScheduler entrypoint — opens its own DB session."""
    from app.database import async_session

    async with async_session() as db:
        try:
            summary = await scan_and_fire(db)
            logger.info("[anomaly_detector] %s", summary)
        except Exception as e:  # noqa: BLE001
            logger.exception("anomaly_detector hourly job failed: %s", e)


def register_hourly_job() -> bool:
    """Wire the hourly batch into the existing pipeline scheduler."""
    try:
        from app.services.pipeline_scheduler import _get_scheduler
    except Exception:
        return False
    sched = _get_scheduler()
    if sched is None:
        return False
    try:
        from apscheduler.triggers.cron import CronTrigger
        trigger = CronTrigger.from_crontab("0 * * * *", timezone="UTC")
        sched.add_job(
            _hourly_job,
            trigger=trigger,
            id="aip_logic_anomaly_scan",
            replace_existing=True,
            misfire_grace_time=300,
            coalesce=True,
        )
        return True
    except Exception as e:  # noqa: BLE001
        logger.warning("anomaly hourly registration failed: %s", e)
        return False


def register_cron_function(function_id: str, cron_expr: str) -> bool:
    """Register a per-function cron trigger."""
    try:
        from app.services.pipeline_scheduler import _get_scheduler
        from apscheduler.triggers.cron import CronTrigger
    except Exception:
        return False
    sched = _get_scheduler()
    if sched is None:
        return False
    try:
        trigger = CronTrigger.from_crontab(cron_expr, timezone="UTC")
    except Exception as e:  # noqa: BLE001
        logger.error("invalid cron expr %s: %s", cron_expr, e)
        return False

    job_id = f"aip_logic_cron_{function_id}"

    async def _job():
        from app.database import async_session
        from app.services.aip_logic_engine import run_function
        from uuid import UUID

        async with async_session() as db:
            try:
                await run_function(db, UUID(function_id), trigger_payload={"type": "cron"})
                await db.commit()
            except Exception as e:  # noqa: BLE001
                logger.exception("cron run_function failed: %s", e)

    try:
        sched.remove_job(job_id)
    except Exception:
        pass
    sched.add_job(
        _job,
        trigger=trigger,
        id=job_id,
        replace_existing=True,
        misfire_grace_time=60,
        coalesce=True,
    )
    return True


def unregister_cron_function(function_id: str) -> bool:
    try:
        from app.services.pipeline_scheduler import _get_scheduler
    except Exception:
        return False
    sched = _get_scheduler()
    if sched is None:
        return False
    try:
        sched.remove_job(f"aip_logic_cron_{function_id}")
        return True
    except Exception:
        return False


__all__ = [
    "scan_and_fire",
    "register_hourly_job",
    "register_cron_function",
    "unregister_cron_function",
]
