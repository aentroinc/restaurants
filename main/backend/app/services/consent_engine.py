"""個人情報保護法 / GDPR 風 同意管理エンジン.

責務:
- check_required_consents: 必要同意が未取得 (or withdrawn) なら ConsentRequiredError raise
- record_consent: 同意取得を ConsentRecord に永続化
- withdraw: 同意撤回（既存 record の withdrawn_at を立てる）
- process_deletion: 削除リクエストの実処理
    - face_templates: 物理削除
    - employee の個人項目: 匿名化（name='削除済', email=None, ...）
    - ClockEvent: 法定保存3年経過分のみ削除（労基法109条相当）
    - AuditLog / ConsentRecord: 法令保管のため残す
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Iterable
from uuid import UUID

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.consent import ConsentRecord, ConsentTemplate, DataDeletionRequest
from app.models.face_auth import ClockEvent, FaceTemplate, StaffPin
from app.models.employee import Employee


# 労基法 109 条相当: 賃金台帳・出勤簿は3年保存
CLOCK_RETENTION_YEARS = 3


class ConsentRequiredError(Exception):
    """同意未取得時に raise. API 側で 403 に翻訳."""

    def __init__(self, missing: list[str], message: str | None = None):
        self.missing = missing
        super().__init__(message or f"consent required: {','.join(missing)}")


# ---- 必要同意チェック ----

async def check_required_consents(
    db: AsyncSession,
    tenant_id: UUID,
    user_id: UUID,
    required: Iterable[str],
) -> None:
    """user が `required` 全てについて active な ConsentRecord を持つか.

    持っていなければ ConsentRequiredError を raise.
    """
    required_set = set(required)
    if not required_set:
        return

    res = await db.execute(
        select(ConsentRecord).where(
            ConsentRecord.tenant_id == tenant_id,
            ConsentRecord.user_id == user_id,
            ConsentRecord.withdrawn_at.is_(None),
        )
    )
    records = res.scalars().all()

    granted_codes: set[str] = set()
    for r in records:
        granted_codes.add(r.template_code)
        scope = r.scope_jsonb or {}
        for k, v in scope.items():
            if v:
                granted_codes.add(k)

    missing = [c for c in required_set if c not in granted_codes]
    if missing:
        raise ConsentRequiredError(missing=missing)


# ---- 取得 / 撤回 ----

async def record_consent(
    db: AsyncSession,
    tenant_id: UUID,
    user_id: UUID,
    template_id: UUID,
    scope: dict | None = None,
    ip_address: str | None = None,
) -> ConsentRecord:
    tmpl = (await db.execute(
        select(ConsentTemplate).where(ConsentTemplate.id == template_id)
    )).scalar_one_or_none()
    if not tmpl:
        raise ValueError(f"template not found: {template_id}")

    rec = ConsentRecord(
        tenant_id=tenant_id,
        user_id=user_id,
        template_id=tmpl.id,
        template_code=tmpl.code,
        template_version=tmpl.version,
        scope_jsonb=scope or {tmpl.code: True},
        ip_address=ip_address,
    )
    db.add(rec)
    await db.commit()
    await db.refresh(rec)
    return rec


async def withdraw(db: AsyncSession, record_id: UUID) -> ConsentRecord | None:
    res = await db.execute(select(ConsentRecord).where(ConsentRecord.id == record_id))
    rec = res.scalar_one_or_none()
    if not rec:
        return None
    if rec.withdrawn_at is None:
        rec.withdrawn_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(rec)
    return rec


# ---- 削除フロー ----

async def process_deletion(
    db: AsyncSession,
    request_id: UUID,
    processor_id: UUID,
) -> DataDeletionRequest:
    res = await db.execute(
        select(DataDeletionRequest).where(DataDeletionRequest.id == request_id)
    )
    req = res.scalar_one_or_none()
    if not req:
        raise ValueError(f"deletion request not found: {request_id}")
    if req.status == "done":
        return req

    req.status = "processing"
    await db.commit()

    log: dict = {}
    user_id = req.user_id
    tenant_id = req.tenant_id
    scope = req.scope or "all"

    # 1) face templates 物理削除
    if scope in ("all", "face"):
        face_count = (await db.execute(
            select(FaceTemplate).where(
                FaceTemplate.tenant_id == tenant_id,
                FaceTemplate.employee_id == user_id,
            )
        )).scalars().all()
        n_face = len(face_count)
        await db.execute(
            delete(FaceTemplate).where(
                FaceTemplate.tenant_id == tenant_id,
                FaceTemplate.employee_id == user_id,
            )
        )
        log["face_templates_deleted"] = n_face

        # PIN も同時に消す
        await db.execute(
            delete(StaffPin).where(
                StaffPin.tenant_id == tenant_id,
                StaffPin.employee_id == user_id,
            )
        )
        log["staff_pins_deleted"] = True

    # 2) Employee 個人項目を匿名化
    if scope in ("all", "personal"):
        emp = (await db.execute(
            select(Employee).where(
                Employee.tenant_id == tenant_id,
                Employee.id == user_id,
            )
        )).scalar_one_or_none()
        if emp is not None:
            emp.name = "削除済"
            emp.email = None
            emp.active = False
            log["employee_anonymized"] = True
        else:
            log["employee_anonymized"] = False

    # 3) ClockEvent: 法定保存3年経過分のみ削除
    if scope in ("all", "personal"):
        cutoff = datetime.now(timezone.utc) - timedelta(days=365 * CLOCK_RETENTION_YEARS)
        old_events = (await db.execute(
            select(ClockEvent).where(
                ClockEvent.tenant_id == tenant_id,
                ClockEvent.employee_id == user_id,
                ClockEvent.occurred_at < cutoff,
            )
        )).scalars().all()
        n_clock = len(old_events)
        await db.execute(
            delete(ClockEvent).where(
                ClockEvent.tenant_id == tenant_id,
                ClockEvent.employee_id == user_id,
                ClockEvent.occurred_at < cutoff,
            )
        )
        log["clock_events_purged"] = n_clock
        log["clock_retention_years"] = CLOCK_RETENTION_YEARS

    # 4) ConsentRecord は法令保管のため残す（withdrawn_at だけ立てる）
    recs = (await db.execute(
        select(ConsentRecord).where(
            ConsentRecord.tenant_id == tenant_id,
            ConsentRecord.user_id == user_id,
            ConsentRecord.withdrawn_at.is_(None),
        )
    )).scalars().all()
    now = datetime.now(timezone.utc)
    for r in recs:
        r.withdrawn_at = now
    log["consent_withdrawn"] = len(recs)

    req.status = "done"
    req.processed_at = now
    req.processor_id = processor_id
    req.deletion_log_jsonb = log
    await db.commit()
    await db.refresh(req)
    return req
