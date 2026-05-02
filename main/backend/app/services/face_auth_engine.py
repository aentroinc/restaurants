"""顔認証 / QR / PIN 3パターンの軽量打刻認証エンジン。

- enroll: embedding を FaceTemplate に保存
- verify: candidate 集合に対して cosine TOP1、閾値 0.7 以下は reject
- QR: 30秒TTLの短命トークン。プロセス内 in-memory ストア（本番はRedisに置換）
- PIN: 4桁、bcrypt hash、3回失敗で 5分ロックアウト

embedding は通常 128次元 (face-api.js faceRecognitionNet)。numpy が無い環境でも
pure-python で動くよう dot/norm を自前実装。pgvector があれば SQL 側で近傍探索
できるが、現状の従業員数（数百〜数千）なら python 比較で十分。
"""
from __future__ import annotations

import math
import secrets
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Iterable
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import hash_password, verify_password
from app.models.face_auth import ClockEvent, FaceTemplate, StaffPin
from app.services.consent_engine import check_required_consents


class DoublePunchError(Exception):
    """同 employee の同一 event_type が 60秒以内に再発生した場合に raise。"""

    def __init__(self, message: str, last_event_id: UUID | None = None):
        super().__init__(message)
        self.last_event_id = last_event_id


SIMILARITY_THRESHOLD = 0.7
QR_TOKEN_TTL_SEC = 30
PIN_MAX_ATTEMPTS = 3
PIN_LOCKOUT_MIN = 5

# 二重打刻防止: 同 employee の同一 event_type が 60 秒以内に再発生したら拒否。
DOUBLE_PUNCH_WINDOW_SEC = 60


# ---- pure-python vector math ----

def _dot(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


def _norm(v: list[float]) -> float:
    return math.sqrt(sum(x * x for x in v))


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    na, nb = _norm(a), _norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return _dot(a, b) / (na * nb)


# ---- enroll / verify ----

@dataclass
class VerifyResult:
    employee_id: UUID | None
    confidence: float
    allowed: bool


async def enroll(
    db: AsyncSession,
    tenant_id: UUID,
    employee_id: UUID,
    embedding: list[float],
    device_info: dict | None = None,
    skip_consent_check: bool = False,
) -> FaceTemplate:
    if not embedding or not isinstance(embedding, list):
        raise ValueError("embedding must be non-empty list")
    if len(embedding) < 32:
        raise ValueError("embedding too short (expected >=32 dims)")
    # 個人情報保護法 / GDPR: 顔特徴量取得前に同意必須
    if not skip_consent_check:
        await check_required_consents(db, tenant_id, employee_id, ["face"])
    tmpl = FaceTemplate(
        tenant_id=tenant_id,
        employee_id=employee_id,
        embedding_jsonb=embedding,
        device_info=device_info or {},
        status="active",
    )
    db.add(tmpl)
    await db.commit()
    await db.refresh(tmpl)
    return tmpl


async def verify(
    db: AsyncSession,
    tenant_id: UUID,
    embedding: list[float],
    candidate_employee_ids: Iterable[UUID] | None = None,
    threshold: float = SIMILARITY_THRESHOLD,
) -> VerifyResult:
    """与えられた embedding と最も近い active テンプレを返す。"""
    if not embedding:
        return VerifyResult(None, 0.0, False)
    stmt = select(FaceTemplate).where(
        FaceTemplate.tenant_id == tenant_id,
        FaceTemplate.status == "active",
    )
    if candidate_employee_ids is not None:
        ids = list(candidate_employee_ids)
        if not ids:
            return VerifyResult(None, 0.0, False)
        stmt = stmt.where(FaceTemplate.employee_id.in_(ids))
    res = await db.execute(stmt)
    templates = res.scalars().all()

    best_emp: UUID | None = None
    best_sim = 0.0
    for t in templates:
        sim = cosine_similarity(embedding, list(t.embedding_jsonb))
        if sim > best_sim:
            best_sim = sim
            best_emp = t.employee_id
    allowed = best_sim >= threshold and best_emp is not None
    return VerifyResult(employee_id=best_emp if allowed else None, confidence=round(best_sim, 4), allowed=allowed)


# ---- QR token (in-memory; swap with Redis in prod) ----

_QR_STORE: dict[str, dict] = {}


def issue_qr_token(store_id: UUID, employee_id: UUID | None = None) -> tuple[str, datetime]:
    token = secrets.token_urlsafe(16)
    expires = datetime.now(timezone.utc) + timedelta(seconds=QR_TOKEN_TTL_SEC)
    _QR_STORE[token] = {
        "store_id": str(store_id),
        "employee_id": str(employee_id) if employee_id else None,
        "expires_at": expires.timestamp(),
    }
    return token, expires


def consume_qr_token(token: str) -> dict | None:
    entry = _QR_STORE.get(token)
    if not entry:
        return None
    if entry["expires_at"] < time.time():
        _QR_STORE.pop(token, None)
        return None
    _QR_STORE.pop(token, None)  # one-shot
    return entry


def _purge_expired() -> None:
    now = time.time()
    for k in [k for k, v in _QR_STORE.items() if v["expires_at"] < now]:
        _QR_STORE.pop(k, None)


# ---- PIN ----

def _is_locked(row: StaffPin) -> bool:
    if row.locked_until is None:
        return False
    return row.locked_until > datetime.now(timezone.utc)


async def set_pin(db: AsyncSession, tenant_id: UUID, employee_id: UUID, pin: str) -> None:
    if not (pin.isdigit() and len(pin) == 4):
        raise ValueError("pin must be 4 digits")
    res = await db.execute(
        select(StaffPin).where(StaffPin.tenant_id == tenant_id, StaffPin.employee_id == employee_id)
    )
    row = res.scalar_one_or_none()
    h = hash_password(pin)
    if row is None:
        row = StaffPin(tenant_id=tenant_id, employee_id=employee_id, pin_hash=h)
        db.add(row)
    else:
        row.pin_hash = h
        row.failed_attempts = 0
        row.locked_until = None
    await db.commit()


# ---- Clock event creation with double-punch + idempotency ----

GPS_LOW_ACCURACY_THRESHOLD_M = 200.0


async def clock_in(
    db: AsyncSession,
    tenant_id: UUID,
    employee_id: UUID,
    store_id: UUID,
    event_type: str,
    auth_method: str,
    lat: float | None = None,
    lon: float | None = None,
    geofence_ok: bool = False,
    confidence: float | None = None,
    idempotency_key: str | None = None,
    accuracy_m: float | None = None,
) -> ClockEvent:
    """打刻イベントを作成する。
    - 同じ idempotency_key で既存 ClockEvent があれば、それをそのまま返す（true idempotent）。
    - 同 employee_id の同一 event_type が 60秒以内にあれば DoublePunchError を raise。
    - accuracy_m が GPS_LOW_ACCURACY_THRESHOLD_M (200m) を超える場合は
      geofence_ok を強制的に False にしつつ、ブロックはしない（警告ログのみ）。
      clock_in_method=gps_low_accuracy 相当として logger.warning に出す。
    - それ以外は新規 ClockEvent を作成して返す。
    """
    if accuracy_m is not None and accuracy_m > GPS_LOW_ACCURACY_THRESHOLD_M:
        geofence_ok = False
        import logging
        logging.getLogger(__name__).warning(
            "clock_in_method=gps_low_accuracy emp=%s store=%s acc=%.0fm",
            employee_id, store_id, accuracy_m,
        )
    # 1. idempotency key 重複 → 同じレコードを返す
    if idempotency_key:
        res = await db.execute(
            select(ClockEvent).where(ClockEvent.idempotency_key == idempotency_key)
        )
        existing = res.scalar_one_or_none()
        if existing is not None:
            return existing

    # 2. 60秒以内の同種打刻 → 拒否
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=DOUBLE_PUNCH_WINDOW_SEC)
    res = await db.execute(
        select(ClockEvent)
        .where(
            ClockEvent.tenant_id == tenant_id,
            ClockEvent.employee_id == employee_id,
            ClockEvent.event_type == event_type,
            ClockEvent.occurred_at >= cutoff,
        )
        .order_by(ClockEvent.occurred_at.desc())
        .limit(1)
    )
    last = res.scalar_one_or_none()
    if last is not None:
        raise DoublePunchError(
            f"Duplicate {event_type} within {DOUBLE_PUNCH_WINDOW_SEC}s for employee {employee_id}",
            last_event_id=last.id,
        )

    # 3. 新規作成
    ev = ClockEvent(
        tenant_id=tenant_id,
        employee_id=employee_id,
        store_id=store_id,
        event_type=event_type,
        lat=lat,
        lon=lon,
        geofence_ok=geofence_ok,
        auth_method=auth_method,
        confidence=confidence,
        idempotency_key=idempotency_key,
    )
    db.add(ev)
    await db.commit()
    await db.refresh(ev)
    return ev


async def verify_pin(db: AsyncSession, tenant_id: UUID, employee_id: UUID, pin: str) -> bool:
    res = await db.execute(
        select(StaffPin).where(StaffPin.tenant_id == tenant_id, StaffPin.employee_id == employee_id)
    )
    row = res.scalar_one_or_none()
    if row is None:
        return False
    if _is_locked(row):
        return False
    ok = verify_password(pin, row.pin_hash)
    if ok:
        row.failed_attempts = 0
        row.locked_until = None
    else:
        row.failed_attempts = (row.failed_attempts or 0) + 1
        if row.failed_attempts >= PIN_MAX_ATTEMPTS:
            row.locked_until = datetime.now(timezone.utc) + timedelta(minutes=PIN_LOCKOUT_MIN)
    await db.commit()
    return ok
