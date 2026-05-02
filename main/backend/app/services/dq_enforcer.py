"""DataQuality enforcement — convert open issues into block/warn decisions
applied at query/endpoint time.

Modes:
- block: raise DataQualityBlocked → 503
- warn:  return issues count for header injection (X-DQ-Issues)
"""
from __future__ import annotations

import uuid
import logging
from dataclasses import dataclass

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.models.data_quality import DataQualityIssue

logger = logging.getLogger(__name__)


# Mapping: dataset_name (URL-friendly) → entity_types covered
DATASET_ENTITY_MAP: dict[str, list[str]] = {
    "stores": ["stores"],
    "daily_sales": ["daily_store_sales"],
    "labor": ["labor_actuals"],
    "store_pl": ["store_pl"],
    "all": ["stores", "daily_store_sales", "labor_actuals", "store_pl"],
}

CRITICAL_LEVELS = {"critical", "high"}


class DataQualityBlocked(Exception):
    def __init__(self, dataset: str, issue_count: int, severities: dict):
        self.dataset = dataset
        self.issue_count = issue_count
        self.severities = severities
        super().__init__(
            f"Dataset '{dataset}' blocked by data quality policy: "
            f"{issue_count} open critical/high issue(s)"
        )


@dataclass
class DQHealth:
    dataset: str
    total_open: int
    critical: int
    high: int
    medium: int
    low: int
    has_blocking: bool

    def to_dict(self) -> dict:
        return {
            "dataset": self.dataset,
            "total_open": self.total_open,
            "critical": self.critical,
            "high": self.high,
            "medium": self.medium,
            "low": self.low,
            "has_blocking": self.has_blocking,
        }


def _to_uuid(v) -> uuid.UUID | None:
    if v is None:
        return None
    if isinstance(v, uuid.UUID):
        return v
    try:
        return uuid.UUID(str(v))
    except (ValueError, TypeError):
        return None


async def check_dataset_health(
    db: AsyncSession,
    tenant_id: str,
    dataset_name: str,
) -> DQHealth:
    """Async — count open issues for a dataset."""
    tid = _to_uuid(tenant_id)
    entities = DATASET_ENTITY_MAP.get(dataset_name, [dataset_name])
    base = and_(
        DataQualityIssue.tenant_id == tid,
        DataQualityIssue.status == "open",
        DataQualityIssue.entity_type.in_(entities),
    )
    res = await db.execute(
        select(DataQualityIssue.severity, func.count(DataQualityIssue.id))
        .where(base).group_by(DataQualityIssue.severity)
    )
    counts = {row[0]: int(row[1]) for row in res.all()}
    critical = counts.get("critical", 0)
    high = counts.get("high", 0)
    medium = counts.get("medium", 0)
    low = counts.get("low", 0)
    total = critical + high + medium + low
    return DQHealth(
        dataset=dataset_name,
        total_open=total,
        critical=critical,
        high=high,
        medium=medium,
        low=low,
        has_blocking=(critical + high) > 0,
    )


def check_dataset_health_sync(
    session: Session,
    tenant_id: str,
    dataset_name: str,
) -> DQHealth:
    tid = _to_uuid(tenant_id)
    entities = DATASET_ENTITY_MAP.get(dataset_name, [dataset_name])
    res = session.execute(
        select(DataQualityIssue.severity, func.count(DataQualityIssue.id)).where(
            and_(
                DataQualityIssue.tenant_id == tid,
                DataQualityIssue.status == "open",
                DataQualityIssue.entity_type.in_(entities),
            )
        ).group_by(DataQualityIssue.severity)
    )
    counts = {row[0]: int(row[1]) for row in res.all()}
    critical = counts.get("critical", 0)
    high = counts.get("high", 0)
    medium = counts.get("medium", 0)
    low = counts.get("low", 0)
    total = critical + high + medium + low
    return DQHealth(
        dataset=dataset_name, total_open=total,
        critical=critical, high=high, medium=medium, low=low,
        has_blocking=(critical + high) > 0,
    )


async def enforce_or_warn(
    db: AsyncSession,
    tenant_id: str,
    dataset_name: str,
    mode: str = "warn",
) -> DQHealth:
    """If mode='block' and there are critical/high open issues, raise.
    Otherwise return health for header injection / logging."""
    health = await check_dataset_health(db, tenant_id, dataset_name)
    if mode == "block" and health.has_blocking:
        logger.warning(
            "DQ block: tenant=%s dataset=%s critical=%d high=%d",
            tenant_id, dataset_name, health.critical, health.high,
        )
        raise DataQualityBlocked(
            dataset_name, health.critical + health.high,
            {"critical": health.critical, "high": health.high},
        )
    return health
