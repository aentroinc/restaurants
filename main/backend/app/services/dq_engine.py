import uuid
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy import select, func, and_
from sqlalchemy.orm import Session

from app.models.data_quality import DataQualityIssue
from app.models.store import Store
from app.models.daily_sales import DailyStoreSales
from app.models.labor import LaborActual
from app.models.store_pl import StorePL


def run_quality_checks(
    session: Session,
    tenant_id: str,
    entity_type: str | None = None,
) -> dict:
    tid = uuid.UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id
    new_issues = []
    today = date.today()

    if entity_type is None or entity_type == "stores":
        new_issues.extend(_check_stores(session, tid))

    if entity_type is None or entity_type == "daily_sales":
        new_issues.extend(_check_sales(session, tid, today))

    if entity_type is None or entity_type == "labor":
        new_issues.extend(_check_labor(session, tid))

    if entity_type is None or entity_type == "store_pl":
        new_issues.extend(_check_pl(session, tid))

    created = 0
    for issue_data in new_issues:
        existing = session.execute(
            select(DataQualityIssue).where(
                DataQualityIssue.tenant_id == tid,
                DataQualityIssue.entity_type == issue_data["entity_type"],
                DataQualityIssue.entity_id == issue_data["entity_id"],
                DataQualityIssue.rule_key == issue_data["rule_key"],
                DataQualityIssue.field_name == issue_data["field_name"],
                DataQualityIssue.status == "open",
            )
        ).scalar_one_or_none()
        if not existing:
            session.add(DataQualityIssue(**issue_data))
            created += 1

    session.commit()
    return {
        "checked_rules": _count_rules(entity_type),
        "new_issues_found": created,
        "total_candidates": len(new_issues),
    }


def _count_rules(entity_type: str | None) -> int:
    counts = {"stores": 3, "daily_sales": 4, "labor": 2, "store_pl": 2}
    if entity_type:
        return counts.get(entity_type, 0)
    return sum(counts.values())


def _check_stores(session: Session, tid: uuid.UUID) -> list[dict]:
    issues = []
    stores = session.execute(
        select(Store).where(Store.tenant_id == tid, Store.status == "active")
    ).scalars().all()

    for store in stores:
        if not store.prefecture or store.prefecture.strip() == "":
            issues.append(_make_issue(tid, "stores", store.id, "prefecture", "medium",
                                      "missing_prefecture", f"{store.name}: 都道府県が未設定です"))

        if store.seat_count is None or store.seat_count == 0:
            issues.append(_make_issue(tid, "stores", store.id, "seat_count", "low",
                                      "zero_seat_count", f"{store.name}: 席数が0または未設定です"))

        last_sale = session.execute(
            select(func.max(DailyStoreSales.business_date)).where(
                DailyStoreSales.store_id == store.id
            )
        ).scalar()
        if last_sale and (date.today() - last_sale).days > 30:
            issues.append(_make_issue(tid, "stores", store.id, "net_sales", "high",
                                      "no_recent_sales",
                                      f"{store.name}: 30日以上売上データがありません（最終: {last_sale}）"))

    return issues


def _check_sales(session: Session, tid: uuid.UUID, today: date) -> list[dict]:
    issues = []
    cutoff = today - timedelta(days=90)

    negative_sales = session.execute(
        select(DailyStoreSales).where(
            DailyStoreSales.tenant_id == tid,
            DailyStoreSales.net_sales < 0,
            DailyStoreSales.business_date >= cutoff,
        )
    ).scalars().all()
    for s in negative_sales:
        issues.append(_make_issue(tid, "daily_store_sales", s.store_id, "net_sales", "critical",
                                  "negative_value",
                                  f"売上データにマイナス値が検出: {s.business_date} net_sales={s.net_sales}"))

    zero_customers = session.execute(
        select(DailyStoreSales).where(
            DailyStoreSales.tenant_id == tid,
            DailyStoreSales.customer_count == 0,
            DailyStoreSales.net_sales > 0,
            DailyStoreSales.business_date >= cutoff,
        )
    ).scalars().all()
    for s in zero_customers:
        issues.append(_make_issue(tid, "daily_store_sales", s.store_id, "customer_count", "high",
                                  "zero_customers_with_sales",
                                  f"来客数0なのに売上あり: {s.business_date}"))

    outlier_tickets = session.execute(
        select(DailyStoreSales).where(
            DailyStoreSales.tenant_id == tid,
            DailyStoreSales.customer_count > 0,
            DailyStoreSales.business_date >= cutoff,
        )
    ).scalars().all()
    for s in outlier_tickets:
        if s.customer_count > 0:
            avg_ticket = float(s.net_sales) / s.customer_count
            if avg_ticket > 10000 or avg_ticket < 100:
                issues.append(_make_issue(tid, "daily_store_sales", s.store_id, "avg_ticket", "medium",
                                          "outlier_ticket",
                                          f"客単価が異常値: {s.business_date} avg={int(avg_ticket)}円"))

    stores = session.execute(
        select(Store.id).where(Store.tenant_id == tid, Store.status == "active")
    ).scalars().all()
    check_start = today - timedelta(days=30)
    for store_id in stores:
        dates_q = session.execute(
            select(DailyStoreSales.business_date).where(
                DailyStoreSales.store_id == store_id,
                DailyStoreSales.business_date >= check_start,
                DailyStoreSales.business_date <= today,
            ).order_by(DailyStoreSales.business_date)
        ).scalars().all()
        if len(dates_q) < 2:
            continue
        for i in range(1, len(dates_q)):
            gap = (dates_q[i] - dates_q[i - 1]).days
            if gap > 2:
                issues.append(_make_issue(tid, "daily_store_sales", store_id, "business_date", "medium",
                                          "gap_detected",
                                          f"売上データに{gap}日の欠落: {dates_q[i-1]}〜{dates_q[i]}"))
                break

    return issues


def _check_labor(session: Session, tid: uuid.UUID) -> list[dict]:
    issues = []
    cutoff = date.today() - timedelta(days=90)

    records = session.execute(
        select(LaborActual).where(
            LaborActual.tenant_id == tid,
            LaborActual.business_date >= cutoff,
        )
    ).scalars().all()

    for lb in records:
        if lb.labor_hours and lb.labor_hours > 0 and lb.labor_cost:
            wage = float(lb.labor_cost) / float(lb.labor_hours)
            if wage < 800 or wage > 3000:
                issues.append(_make_issue(tid, "labor_actuals", lb.store_id, "labor_cost", "medium",
                                          "suspicious_wage",
                                          f"時給換算が異常: {lb.business_date} wage={int(wage)}円"))

        if lb.labor_hours and float(lb.labor_hours) > 200:
            issues.append(_make_issue(tid, "labor_actuals", lb.store_id, "labor_hours", "high",
                                      "excessive_hours",
                                      f"1日の労働時間が異常: {lb.business_date} hours={lb.labor_hours}"))

    return issues


def _check_pl(session: Session, tid: uuid.UUID) -> list[dict]:
    issues = []

    pls = session.execute(
        select(StorePL).where(StorePL.tenant_id == tid)
    ).scalars().all()

    for pl in pls:
        if pl.sales and pl.cogs and pl.cogs > pl.sales:
            issues.append(_make_issue(tid, "store_pl", pl.store_id, "cogs", "critical",
                                      "cogs_exceeds_sales",
                                      f"原価が売上を超過: {pl.period_start}〜{pl.period_end}"))

        if pl.sales and pl.cogs and pl.labor_cost and pl.operating_profit:
            expected_op = int(pl.sales) - int(pl.cogs) - int(pl.labor_cost)
            actual_op = int(pl.operating_profit)
            if expected_op != 0:
                diff_pct = abs(actual_op - expected_op) / abs(expected_op) * 100
                if diff_pct > 50 and abs(actual_op - expected_op) > 100000:
                    issues.append(_make_issue(tid, "store_pl", pl.store_id, "operating_profit", "high",
                                              "profit_mismatch",
                                              f"営業利益の計算不整合: {pl.period_start}〜{pl.period_end} 乖離{int(diff_pct)}%"))

    return issues


def _make_issue(tenant_id, entity_type, entity_id, field_name, severity, rule_key, description):
    return {
        "tenant_id": tenant_id,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "field_name": field_name,
        "severity": severity,
        "rule_key": rule_key,
        "description": description,
        "status": "open",
    }
