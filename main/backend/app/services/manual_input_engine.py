"""Manual-input engine — CRUD orchestration + cross-domain side effects.

Side effects implemented here:

  * WasteLog.create:
      Inserts a CostVariance "hint" row keyed at (store_id, today, ingredient_id?).
      When `reason == over_made` → root_cause_hint="over_portion".
      When `reason == expired/dropped/wrong_made` → root_cause_hint="waste".
      Severity is taken from cost_estimate magnitude.

  * Complaint.create:
      When severity == "high" auto-issues a Task (status=open, priority=high,
      source="complaint") so the SV ops queue picks it up.

  * EquipmentIssue.create:
      When severity == "critical", trigger an AIP-Logic function named
      "headquarters_alert_critical_equipment" via aip_logic_engine.run_function.
      If no such function exists we degrade gracefully (still create the issue).

  * AllergyResponse.create:
      When incident_occurred=True we also create a high-priority Task so HQ
      can follow up.

All write operations append an audit_logs row using the existing pattern
(tenant_id + resource_type + resource_id + action).
"""
from __future__ import annotations

import logging
from datetime import date as date_cls, datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.cost_variance import CostVariance
from app.models.manual_input import (
    AllergyResponse,
    Complaint,
    CompetitorScan,
    CustomerVoice,
    DailyReport,
    EquipmentIssue,
    LossReport,
    WasteLog,
)
from app.models.task import Task

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# audit helper
# ---------------------------------------------------------------------------

def _audit(
    db: AsyncSession,
    *,
    tenant_id: str,
    action: str,
    resource_type: str,
    resource_id: UUID,
    metadata: dict[str, Any] | None = None,
) -> None:
    db.add(AuditLog(
        id=uuid4(),
        tenant_id=UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
        user_id=None,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        metadata_=metadata or {},
    ))


# ---------------------------------------------------------------------------
# generic CRUD helpers (model-agnostic)
# ---------------------------------------------------------------------------

async def _list_objects(
    db: AsyncSession,
    *,
    tenant_id: str,
    model,
    store_id: UUID | None = None,
    limit: int = 200,
    offset: int = 0,
    order_by: Any = None,
) -> list:
    q = select(model).where(model.tenant_id == tenant_id)
    if store_id is not None and hasattr(model, "store_id"):
        q = q.where(model.store_id == store_id)
    if order_by is not None:
        q = q.order_by(order_by)
    elif hasattr(model, "created_at"):
        q = q.order_by(model.created_at.desc())
    q = q.offset(offset).limit(limit)
    return (await db.execute(q)).scalars().all()


async def _get_object(
    db: AsyncSession,
    *,
    tenant_id: str,
    model,
    obj_id: UUID,
):
    q = select(model).where(and_(model.id == obj_id, model.tenant_id == tenant_id))
    return (await db.execute(q)).scalar_one_or_none()


async def _delete_object(
    db: AsyncSession,
    *,
    tenant_id: str,
    model,
    obj_id: UUID,
    resource_type: str,
) -> bool:
    obj = await _get_object(db, tenant_id=tenant_id, model=model, obj_id=obj_id)
    if obj is None:
        return False
    await db.delete(obj)
    _audit(db, tenant_id=tenant_id, action="delete", resource_type=resource_type, resource_id=obj_id)
    await db.commit()
    return True


async def _patch_object(
    db: AsyncSession,
    *,
    tenant_id: str,
    model,
    obj_id: UUID,
    patch: dict[str, Any],
    resource_type: str,
):
    obj = await _get_object(db, tenant_id=tenant_id, model=model, obj_id=obj_id)
    if obj is None:
        return None
    for k, v in (patch or {}).items():
        if v is None:
            continue
        if hasattr(obj, k):
            setattr(obj, k, v)
    _audit(
        db,
        tenant_id=tenant_id,
        action="update",
        resource_type=resource_type,
        resource_id=obj_id,
        metadata={"fields": list(patch.keys())},
    )
    await db.commit()
    await db.refresh(obj)
    return obj


# ---------------------------------------------------------------------------
# 1. DailyReport
# ---------------------------------------------------------------------------

async def create_daily_report(
    db: AsyncSession, *, tenant_id: str, payload: dict[str, Any]
) -> DailyReport:
    obj = DailyReport(
        id=uuid4(),
        tenant_id=UUID(tenant_id),
        store_id=payload["store_id"],
        report_date=payload["report_date"],
        sales_summary_text=payload.get("sales_summary_text"),
        weather=payload.get("weather"),
        special_events_text=payload.get("special_events_text"),
        notes=payload.get("notes"),
        predicted_customers_tomorrow=payload.get("predicted_customers_tomorrow"),
        predicted_sales_tomorrow=payload.get("predicted_sales_tomorrow"),
        employee_id=payload.get("employee_id"),
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(obj)
    _audit(db, tenant_id=tenant_id, action="create", resource_type="daily_report", resource_id=obj.id)
    await db.commit()
    await db.refresh(obj)
    return obj


# ---------------------------------------------------------------------------
# 2. WasteLog — also writes a CostVariance hint row
# ---------------------------------------------------------------------------

def _waste_to_variance_hint(reason: str, cost_estimate: Decimal | float) -> tuple[str, str]:
    """Map WasteLog.reason → (root_cause_hint, severity)."""
    cost = float(cost_estimate or 0)
    if reason == "over_made":
        hint = "over_portion"
    elif reason in ("expired", "dropped", "wrong_made"):
        hint = "waste"
    else:
        hint = "waste"
    if cost >= 5000:
        sev = "high"
    elif cost >= 1000:
        sev = "medium"
    else:
        sev = "low"
    return hint, sev


async def create_waste_log(
    db: AsyncSession, *, tenant_id: str, payload: dict[str, Any]
) -> tuple[WasteLog, CostVariance | None]:
    obj = WasteLog(
        id=uuid4(),
        tenant_id=UUID(tenant_id),
        store_id=payload["store_id"],
        waste_date=payload["waste_date"],
        product_id=payload.get("product_id"),
        ingredient_id=payload.get("ingredient_id"),
        qty=Decimal(str(payload.get("qty") or 0)),
        unit=payload.get("unit"),
        reason=payload.get("reason") or "other",
        cost_estimate=Decimal(str(payload.get("cost_estimate") or 0)),
        employee_id=payload.get("employee_id"),
        photo_url=payload.get("photo_url"),
    )
    db.add(obj)

    cv: CostVariance | None = None
    # Only emit a hint when we have an ingredient (variance grid is keyed at ingredient).
    if obj.ingredient_id is not None:
        hint, sev = _waste_to_variance_hint(obj.reason, obj.cost_estimate)
        cv = CostVariance(
            id=uuid4(),
            tenant_id=UUID(tenant_id),
            store_id=obj.store_id,
            period_date=obj.waste_date,
            ingredient_id=obj.ingredient_id,
            qty_diff=-Decimal(str(obj.qty)),
            cost_diff=-Decimal(str(obj.cost_estimate)),
            variance_pct=Decimal("0"),
            root_cause_hint=hint,
            severity=sev,
        )
        db.add(cv)

    _audit(
        db,
        tenant_id=tenant_id,
        action="create",
        resource_type="waste_log",
        resource_id=obj.id,
        metadata={"reason": obj.reason, "variance_hint_emitted": cv is not None},
    )
    await db.commit()
    await db.refresh(obj)
    return obj, cv


# ---------------------------------------------------------------------------
# 3. Complaint — auto Task on severity=high
# ---------------------------------------------------------------------------

async def create_complaint(
    db: AsyncSession, *, tenant_id: str, payload: dict[str, Any]
) -> tuple[Complaint, Task | None]:
    obj = Complaint(
        id=uuid4(),
        tenant_id=UUID(tenant_id),
        store_id=payload["store_id"],
        complaint_date=payload["complaint_date"],
        customer_age_range=payload.get("customer_age_range"),
        customer_gender=payload.get("customer_gender"),
        channel=payload.get("channel") or "in_store",
        severity=payload.get("severity") or "low",
        content=payload["content"],
        response_taken=payload.get("response_taken"),
        resolved=bool(payload.get("resolved", False)),
        follow_up_needed=bool(payload.get("follow_up_needed", False)),
        employee_id=payload.get("employee_id"),
    )
    db.add(obj)
    await db.flush()

    task: Task | None = None
    if obj.severity == "high":
        task = Task(
            id=uuid4(),
            tenant_id=UUID(tenant_id),
            store_id=obj.store_id,
            title=f"[クレーム-高] {obj.content[:80]}",
            description=(
                f"{obj.content}\n\n対応: {obj.response_taken or '未対応'}\n"
                f"channel={obj.channel} / complaint_id={obj.id}"
            ),
            issue_type="complaint",
            status="open",
            priority="high",
            source="complaint",
        )
        db.add(task)

    _audit(
        db,
        tenant_id=tenant_id,
        action="create",
        resource_type="complaint",
        resource_id=obj.id,
        metadata={"severity": obj.severity, "task_issued": task is not None},
    )
    await db.commit()
    await db.refresh(obj)
    if task:
        await db.refresh(task)
    return obj, task


# ---------------------------------------------------------------------------
# 4. EquipmentIssue — fire AIP logic when severity=critical
# ---------------------------------------------------------------------------

CRITICAL_EQUIPMENT_LOGIC_NAME = "headquarters_alert_critical_equipment"


async def _trigger_critical_equipment_logic(
    db: AsyncSession, *, tenant_id: str, issue: EquipmentIssue
) -> dict[str, Any] | None:
    """Look up the named LogicFunction for this tenant and fire it.
    Falls back gracefully if the function does not exist."""
    try:
        from app.models.aip_logic import LogicFunction
        from app.services.aip_logic_engine import run_function

        fn = (
            await db.execute(
                select(LogicFunction).where(
                    and_(
                        LogicFunction.tenant_id == tenant_id,
                        LogicFunction.name == CRITICAL_EQUIPMENT_LOGIC_NAME,
                    )
                )
            )
        ).scalar_one_or_none()
        if fn is None:
            logger.info(
                "[manual_input] critical equipment logic function not registered "
                "(name=%s); skipping AIP trigger.",
                CRITICAL_EQUIPMENT_LOGIC_NAME,
            )
            return None
        return await run_function(
            db,
            fn.id,
            trigger_payload={
                "store_id": str(issue.store_id),
                "equipment_name": issue.equipment_name,
                "equipment_category": issue.equipment_category,
                "severity": issue.severity,
                "issue_id": str(issue.id),
            },
        )
    except Exception as e:  # noqa: BLE001
        logger.warning("[manual_input] AIP logic trigger failed: %s", e)
        return None


async def create_equipment_issue(
    db: AsyncSession, *, tenant_id: str, payload: dict[str, Any]
) -> tuple[EquipmentIssue, dict[str, Any] | None]:
    obj = EquipmentIssue(
        id=uuid4(),
        tenant_id=UUID(tenant_id),
        store_id=payload["store_id"],
        equipment_name=payload["equipment_name"],
        equipment_category=payload.get("equipment_category") or "other",
        severity=payload.get("severity") or "minor",
        description=payload.get("description"),
        photo_url=payload.get("photo_url"),
        repair_requested=bool(payload.get("repair_requested", False)),
        repair_status=payload.get("repair_status") or "reported",
        requested_at=datetime.now(timezone.utc),
        employee_id=payload.get("employee_id"),
    )
    db.add(obj)
    await db.flush()

    aip_result: dict[str, Any] | None = None
    if obj.severity == "critical":
        aip_result = await _trigger_critical_equipment_logic(db, tenant_id=tenant_id, issue=obj)

    _audit(
        db,
        tenant_id=tenant_id,
        action="create",
        resource_type="equipment_issue",
        resource_id=obj.id,
        metadata={"severity": obj.severity, "aip_fired": aip_result is not None},
    )
    await db.commit()
    await db.refresh(obj)
    return obj, aip_result


# ---------------------------------------------------------------------------
# 5. AllergyResponse
# ---------------------------------------------------------------------------

async def create_allergy_response(
    db: AsyncSession, *, tenant_id: str, payload: dict[str, Any]
) -> tuple[AllergyResponse, Task | None]:
    obj = AllergyResponse(
        id=uuid4(),
        tenant_id=UUID(tenant_id),
        store_id=payload["store_id"],
        response_date=payload["response_date"],
        customer_age_range=payload.get("customer_age_range"),
        allergen=payload["allergen"],
        items_provided_json=payload.get("items_provided_json") or [],
        response_taken=payload.get("response_taken"),
        incident_occurred=bool(payload.get("incident_occurred", False)),
        employee_id=payload.get("employee_id"),
    )
    db.add(obj)
    await db.flush()

    task: Task | None = None
    if obj.incident_occurred:
        task = Task(
            id=uuid4(),
            tenant_id=UUID(tenant_id),
            store_id=obj.store_id,
            title=f"[アレルギー事故] allergen={obj.allergen}",
            description=(
                f"アレルギー対応中に事故発生。即時 SV / 本部対応要。\n"
                f"allergy_response_id={obj.id}"
            ),
            issue_type="allergy_incident",
            status="open",
            priority="high",
            source="allergy_response",
        )
        db.add(task)

    _audit(
        db,
        tenant_id=tenant_id,
        action="create",
        resource_type="allergy_response",
        resource_id=obj.id,
        metadata={"allergen": obj.allergen, "incident": obj.incident_occurred},
    )
    await db.commit()
    await db.refresh(obj)
    return obj, task


# ---------------------------------------------------------------------------
# 6. LossReport
# ---------------------------------------------------------------------------

async def create_loss_report(
    db: AsyncSession, *, tenant_id: str, payload: dict[str, Any]
) -> LossReport:
    obj = LossReport(
        id=uuid4(),
        tenant_id=UUID(tenant_id),
        store_id=payload["store_id"],
        employee_id=payload.get("employee_id"),
        item_id=payload.get("item_id"),
        item_name=payload["item_name"],
        qty=Decimal(str(payload.get("qty") or 0)),
        reason=payload.get("reason") or "other",
        photo_url=payload.get("photo_url"),
        cost_estimate=Decimal(str(payload.get("cost_estimate") or 0)),
        occurred_at=payload.get("occurred_at") or datetime.now(timezone.utc),
    )
    db.add(obj)
    _audit(db, tenant_id=tenant_id, action="create", resource_type="loss_report", resource_id=obj.id)
    await db.commit()
    await db.refresh(obj)
    return obj


# ---------------------------------------------------------------------------
# 7. CustomerVoice
# ---------------------------------------------------------------------------

async def create_customer_voice(
    db: AsyncSession, *, tenant_id: str, payload: dict[str, Any]
) -> CustomerVoice:
    obj = CustomerVoice(
        id=uuid4(),
        tenant_id=UUID(tenant_id),
        store_id=payload["store_id"],
        content=payload["content"],
        sentiment=payload.get("sentiment") or "neutral",
        source=payload.get("source") or "heard",
        rating=Decimal(str(payload["rating"])) if payload.get("rating") is not None else None,
        customer_age_range=payload.get("customer_age_range"),
        employee_id=payload.get("employee_id"),
        recorded_at=payload.get("recorded_at") or datetime.now(timezone.utc),
    )
    db.add(obj)
    _audit(db, tenant_id=tenant_id, action="create", resource_type="customer_voice", resource_id=obj.id)
    await db.commit()
    await db.refresh(obj)
    return obj


# ---------------------------------------------------------------------------
# 8. CompetitorScan
# ---------------------------------------------------------------------------

async def create_competitor_scan(
    db: AsyncSession, *, tenant_id: str, payload: dict[str, Any]
) -> CompetitorScan:
    obj = CompetitorScan(
        id=uuid4(),
        tenant_id=UUID(tenant_id),
        sv_user_id=payload.get("sv_user_id"),
        competitor_name=payload["competitor_name"],
        competitor_address=payload.get("competitor_address"),
        latitude=Decimal(str(payload["latitude"])) if payload.get("latitude") is not None else None,
        longitude=Decimal(str(payload["longitude"])) if payload.get("longitude") is not None else None,
        observations_text=payload.get("observations_text"),
        menu_observations_json=payload.get("menu_observations_json") or [],
        photos_json=payload.get("photos_json") or [],
        visited_at=payload.get("visited_at") or datetime.now(timezone.utc),
        area_id=payload.get("area_id"),
    )
    db.add(obj)
    _audit(db, tenant_id=tenant_id, action="create", resource_type="competitor_scan", resource_id=obj.id)
    await db.commit()
    await db.refresh(obj)
    return obj


__all__ = [
    "create_daily_report",
    "create_waste_log",
    "create_complaint",
    "create_equipment_issue",
    "create_allergy_response",
    "create_loss_report",
    "create_customer_voice",
    "create_competitor_scan",
    "_list_objects",
    "_get_object",
    "_patch_object",
    "_delete_object",
    "_waste_to_variance_hint",
]
