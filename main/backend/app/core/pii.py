"""PII redaction utilities used by middleware and AI safety paths.

Two-level redaction:
  - low : email / phone / credit-card-like patterns -> placeholders
  - high: low + obvious Japanese personal name patterns

Designed to be cheap (regex) and side-effect free.
"""
from __future__ import annotations

import re
from typing import Any, Iterable

EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_RE = re.compile(r"(?<!\d)(?:\+?81[-\s]?)?(?:0\d{1,4}[-\s]?)?\d{1,4}[-\s]?\d{3,4}[-\s]?\d{3,4}(?!\d)")
CREDIT_CARD_RE = re.compile(r"\b(?:\d[ -]*?){13,19}\b")
JP_NAME_RE = re.compile(r"[一-龯]{1,4}\s?[一-龯]{1,4}様?さん?氏?")

PII_FIELDS_LOW = {"email", "phone", "phone_number", "tel", "mobile", "fax"}
PII_FIELDS_HIGH = PII_FIELDS_LOW | {
    "name", "full_name", "first_name", "last_name", "kana", "address",
    "birthday", "birth_date", "ssn", "my_number", "passport",
    "credit_card", "card_number", "salary", "bank_account",
}


def redact_text(text: str, level: str = "low") -> str:
    if not text:
        return text
    out = EMAIL_RE.sub("<email>", text)
    out = PHONE_RE.sub("<phone>", out)
    out = CREDIT_CARD_RE.sub("<credit_card>", out)
    if level == "high":
        out = JP_NAME_RE.sub("<name>", out)
    return out


def _is_redacted_field(key: str, level: str) -> bool:
    k = key.lower()
    field_set = PII_FIELDS_HIGH if level == "high" else PII_FIELDS_LOW
    return k in field_set


def redact_value(value: Any, level: str = "low") -> Any:
    if isinstance(value, str):
        return redact_text(value, level)
    return value


def redact_payload(payload: Any, level: str = "low", _depth: int = 0) -> Any:
    """Recursively redact a JSON-like payload.

    Strings get pattern-based redaction; dict keys matching PII_FIELDS get value
    masked entirely. Limited to depth 8 for safety.
    """
    if _depth > 8:
        return payload
    if isinstance(payload, dict):
        out = {}
        for k, v in payload.items():
            if _is_redacted_field(k, level):
                out[k] = "***"
            else:
                out[k] = redact_payload(v, level, _depth + 1)
        return out
    if isinstance(payload, list):
        return [redact_payload(v, level, _depth + 1) for v in payload]
    if isinstance(payload, str):
        return redact_text(payload, level)
    return payload


def redact_payload_for_role(payload: Any, role: str | None) -> Any:
    """Apply role-based redaction policy.

    admin / executive: no redaction
    brand_manager / area_manager: low (contact info masked)
    sv / store_staff / viewer / analyst / unknown: high
    """
    if role in ("admin", "executive"):
        return payload
    if role in ("brand_manager", "area_manager"):
        return redact_payload(payload, "low")
    return redact_payload(payload, "high")


def role_redaction_level(role: str | None) -> str:
    if role in ("admin", "executive"):
        return "none"
    if role in ("brand_manager", "area_manager"):
        return "low"
    return "high"
