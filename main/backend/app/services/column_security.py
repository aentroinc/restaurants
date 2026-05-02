"""Column-level security + PII detection / redaction"""
from __future__ import annotations
import hashlib
import re
import uuid
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.column_policy import ColumnPolicy, PIIRedactionLog


# 標準 PII 検出パターン
PII_PATTERNS = {
    "phone_jp": re.compile(r"(?:\+?81|0)\d{1,4}[-(\s]?\d{1,4}[)\s-]?\d{3,4}"),
    "email": re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"),
    "credit_card": re.compile(r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b"),
    "employee_id": re.compile(r"\b(EMP|EMPLOYEE|社員)[-_]?\d{4,8}\b"),
    "postal_jp": re.compile(r"〒?\d{3}-\d{4}"),
    # 日本語氏名は誤検出が多いので名前付き「様/さん/氏」サフィックスで検出
    "name_jp": re.compile(r"[一-龥々ぁ-んァ-ヴー]{2,4}(?:様|さん|氏)"),
}

# 標準 PII 列（resource × column）
DEFAULT_PII_COLUMNS = {
    "store": {"manager_name": "high"},
    "employee": {"name": "high", "phone": "high", "email": "high", "hourly_rate": "high", "address": "high", "employee_id": "high"},
    "review": {"author_name": "low", "author_email": "high"},
    "shift": {"employee_name": "high", "actual_start_at": "low"},
    "incident": {"reporter_name": "low"},
}


def detect_pii(text: str) -> dict[str, int]:
    """文字列から PII 出現回数をパターン別に返す"""
    if not text:
        return {}
    counts = {}
    for name, pat in PII_PATTERNS.items():
        n = len(pat.findall(text))
        if n > 0:
            counts[name] = n
    return counts


def redact_pii(text: str, mask: str = "[REDACTED]") -> tuple[str, dict[str, int]]:
    if not text:
        return text, {}
    redacted = text
    counts = {}
    for name, pat in PII_PATTERNS.items():
        n = len(pat.findall(redacted))
        if n > 0:
            redacted = pat.sub(mask, redacted)
            counts[name] = n
    return redacted, counts


def mask_value(value, mask_type: str = "full") -> str:
    if value is None:
        return None
    s = str(value)
    if mask_type == "full":
        return "***"
    if mask_type == "partial":
        if len(s) <= 4:
            return "*" * len(s)
        return s[:1] + "*" * (len(s) - 2) + s[-1:]
    if mask_type == "hash":
        return hashlib.sha256(s.encode()).hexdigest()[:8]
    if mask_type == "drop":
        return None
    return "***"


async def get_applicable_policies(
    db: AsyncSession, tenant_id: str, role_ids: list[str], resource: str,
) -> list[ColumnPolicy]:
    q = select(ColumnPolicy).where(
        ColumnPolicy.tenant_id == tenant_id,
        ColumnPolicy.resource_name == resource,
        ColumnPolicy.enabled == True,
    )
    rows = (await db.execute(q)).scalars().all()
    # role_id が None（全 role 適用）または user の role に含まれるもの
    return [p for p in rows if p.role_id is None or str(p.role_id) in role_ids]


async def apply_column_policies(
    data: dict | list, policies: list[ColumnPolicy], resource: str,
) -> dict | list:
    """response data に policy 適用"""
    if not policies:
        return data

    by_column = {p.column_name: p for p in policies if p.action == "read"}
    if not by_column:
        return data

    if isinstance(data, list):
        return [_apply_to_row(row, by_column) for row in data]
    if isinstance(data, dict):
        if "data" in data and isinstance(data["data"], list):
            data["data"] = [_apply_to_row(row, by_column) for row in data["data"]]
            return data
        if "data" in data and isinstance(data["data"], dict):
            data["data"] = _apply_to_row(data["data"], by_column)
            return data
        return _apply_to_row(data, by_column)
    return data


def _apply_to_row(row, by_column):
    if not isinstance(row, dict):
        return row
    out = dict(row)
    for col, policy in by_column.items():
        if col in out:
            if policy.mask_type == "drop":
                out.pop(col)
            else:
                out[col] = mask_value(out[col], policy.mask_type)
    return out


async def log_pii_redaction(
    db: AsyncSession, tenant_id: str, user_id: str | None,
    resource_type: str, resource_id: str | None,
    pii_counts: dict[str, int], ai_session_id: str | None = None,
):
    for pii_type, n in pii_counts.items():
        db.add(PIIRedactionLog(
            id=uuid.uuid4(),
            tenant_id=uuid.UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
            user_id=uuid.UUID(user_id) if user_id else None,
            resource_type=resource_type,
            resource_id=resource_id,
            pii_type=pii_type,
            redaction_method="mask",
            occurrences=n,
            ai_session_id=uuid.UUID(ai_session_id) if ai_session_id else None,
        ))
    # commit は呼び元に任せる
