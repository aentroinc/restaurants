"""POS <-> PL reconciliation.

For each store and PL period, compare PL.sales to the sum of
DailyStoreSales.net_sales over the same period. Flag a DQ issue when the
relative difference exceeds tolerance (default 1%).
"""
from __future__ import annotations

import uuid
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.daily_sales import DailyStoreSales
from app.models.data_quality import DataQualityIssue
from app.models.store import Store
from app.models.store_pl import StorePL


def reconcile_pos_to_pl(
    session: Session,
    tenant_id: str,
    *,
    tolerance_pct: float = 0.01,
    months_back: int = 6,
) -> dict:
    """Run reconciliation. Returns counts; persists DQ issues."""
    tid = uuid.UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id
    cutoff = date.today() - timedelta(days=30 * months_back)

    pls = session.execute(
        select(StorePL).where(
            StorePL.tenant_id == tid,
            StorePL.period_end >= cutoff,
        )
    ).scalars().all()

    created = 0
    matched = 0
    over_tolerance = 0
    for pl in pls:
        sum_q = session.execute(
            select(func.coalesce(func.sum(DailyStoreSales.net_sales), 0)).where(
                DailyStoreSales.tenant_id == tid,
                DailyStoreSales.store_id == pl.store_id,
                DailyStoreSales.business_date >= pl.period_start,
                DailyStoreSales.business_date <= pl.period_end,
            )
        ).scalar()
        pos_total = Decimal(sum_q or 0)
        pl_total = Decimal(pl.sales or 0)

        if pl_total == 0 and pos_total == 0:
            matched += 1
            continue
        if pl_total == 0:
            denom = pos_total
        else:
            denom = pl_total
        diff_pct = float(abs(pos_total - pl_total) / denom) if denom else 0

        if diff_pct <= tolerance_pct:
            matched += 1
            continue
        over_tolerance += 1

        existing = session.execute(
            select(DataQualityIssue).where(
                DataQualityIssue.tenant_id == tid,
                DataQualityIssue.entity_type == "store_pl",
                DataQualityIssue.entity_id == pl.store_id,
                DataQualityIssue.rule_key == "pos_pl_reconciliation",
                DataQualityIssue.field_name == "sales",
                DataQualityIssue.status == "open",
            )
        ).scalar_one_or_none()
        if existing:
            continue

        severity = "critical" if diff_pct >= 0.05 else "high"
        session.add(DataQualityIssue(
            tenant_id=tid,
            entity_type="store_pl",
            entity_id=pl.store_id,
            field_name="sales",
            severity=severity,
            rule_key="pos_pl_reconciliation",
            description=(
                f"POS↔PL 不整合: {pl.period_start}〜{pl.period_end} "
                f"POS={int(pos_total):,}円 / PL={int(pl_total):,}円 "
                f"(差分 {diff_pct * 100:.2f}%, 許容 {tolerance_pct * 100:.1f}%)"
            ),
            status="open",
        ))
        created += 1

    session.commit()
    return {
        "pl_records_checked": len(pls),
        "matched_within_tolerance": matched,
        "over_tolerance": over_tolerance,
        "new_issues_created": created,
        "tolerance_pct": tolerance_pct,
    }
