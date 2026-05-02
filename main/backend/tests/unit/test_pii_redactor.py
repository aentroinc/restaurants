"""Unit tests for the PII redactor."""
from app.core.pii import (
    redact_text, redact_payload, redact_payload_for_role, role_redaction_level,
)


def test_redact_email_low():
    assert "<email>" in redact_text("contact: ceo@example.co.jp", "low")


def test_redact_phone_low():
    assert "<phone>" in redact_text("call 090-1234-5678 today", "low")


def test_redact_payload_masks_pii_field():
    payload = {"name": "山田 太郎", "email": "yamada@example.com", "amount": 1500}
    out = redact_payload(payload, "low")
    assert out["name"] == "山田 太郎"  # name not redacted at low
    assert out["email"] == "***"
    assert out["amount"] == 1500


def test_redact_payload_masks_name_at_high():
    payload = {"name": "山田 太郎", "amount": 1500}
    out = redact_payload(payload, "high")
    assert out["name"] == "***"
    assert out["amount"] == 1500


def test_role_levels():
    assert role_redaction_level("admin") == "none"
    assert role_redaction_level("executive") == "none"
    assert role_redaction_level("brand_manager") == "low"
    assert role_redaction_level("store_staff") == "high"
    assert role_redaction_level(None) == "high"


def test_redact_payload_for_role_admin_passthrough():
    payload = {"email": "x@y.com"}
    assert redact_payload_for_role(payload, "admin")["email"] == "x@y.com"


def test_redact_nested_lists():
    payload = {"users": [{"email": "a@b.co"}, {"email": "c@d.co"}]}
    out = redact_payload(payload, "low")
    assert out["users"][0]["email"] == "***"
    assert out["users"][1]["email"] == "***"
