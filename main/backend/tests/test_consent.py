"""Consent engine + router smoke tests.

DB-bound fixtures are exercised via integration suite. Here we cover:
- pure-logic (no DB): ConsentRequiredError detection on missing consent
- router/main: consent endpoints registered, ConsentRequiredError raised when
  enroll is called without consent (mocked DB)
- engine: process_deletion log shape
"""
from __future__ import annotations

import pytest


# ---- router registration ----

def test_consent_router_registered_in_main():
    """main.py が consent_router を import + include していることを静的に確認."""
    import pathlib
    main_src = pathlib.Path(__file__).parent.parent / "app" / "main.py"
    text = main_src.read_text(encoding="utf-8")
    assert "from app.api.v1 import consent" in text
    assert "consent_router.router" in text


def test_consent_router_has_expected_endpoints():
    from app.api.v1.consent import router
    paths = {r.path for r in router.routes if hasattr(r, "path")}
    assert "/api/v1/consent/required" in paths
    assert "/api/v1/consent/grant" in paths
    assert "/api/v1/consent/withdraw" in paths
    assert "/api/v1/consent/deletion-request" in paths
    assert "/api/v1/consent/deletion-requests" in paths
    assert "/api/v1/consent/templates" in paths


# ---- consent_engine.check_required_consents ----

class _StubResult:
    def __init__(self, items):
        self._items = items

    def scalars(self):
        return self

    def all(self):
        return self._items


class _StubDB:
    def __init__(self, records):
        self._records = records

    async def execute(self, _stmt):
        return _StubResult(self._records)


class _StubRecord:
    def __init__(self, code: str, scope: dict | None = None, withdrawn: bool = False):
        self.template_code = code
        self.scope_jsonb = scope or {}
        self.withdrawn_at = "2026-01-01" if withdrawn else None


@pytest.mark.asyncio
async def test_check_required_raises_when_missing():
    from app.services.consent_engine import (
        ConsentRequiredError, check_required_consents,
    )
    from uuid import uuid4
    db = _StubDB(records=[])  # no consents
    with pytest.raises(ConsentRequiredError) as exc:
        await check_required_consents(db, uuid4(), uuid4(), ["face"])
    assert "face" in exc.value.missing


@pytest.mark.asyncio
async def test_check_required_passes_when_granted():
    from app.services.consent_engine import check_required_consents
    from uuid import uuid4
    db = _StubDB(records=[_StubRecord("face")])
    # Should not raise
    await check_required_consents(db, uuid4(), uuid4(), ["face"])


@pytest.mark.asyncio
async def test_check_required_passes_via_scope_field():
    from app.services.consent_engine import check_required_consents
    from uuid import uuid4
    # scope の中の true で granted 扱い
    db = _StubDB(records=[_StubRecord("ignored", {"face": True, "gps": True})])
    await check_required_consents(db, uuid4(), uuid4(), ["face", "gps"])


@pytest.mark.asyncio
async def test_check_required_partial_missing():
    from app.services.consent_engine import (
        ConsentRequiredError, check_required_consents,
    )
    from uuid import uuid4
    db = _StubDB(records=[_StubRecord("face")])
    with pytest.raises(ConsentRequiredError) as exc:
        await check_required_consents(db, uuid4(), uuid4(), ["face", "gps"])
    assert "gps" in exc.value.missing
    assert "face" not in exc.value.missing


@pytest.mark.asyncio
async def test_enroll_blocks_when_no_consent():
    """enroll は consent なしで ConsentRequiredError を raise する。"""
    from app.services.face_auth_engine import enroll
    from app.services.consent_engine import ConsentRequiredError
    from uuid import uuid4

    class _DummyDB(_StubDB):
        def add(self, _obj):  # never reached
            raise AssertionError("enroll should fail before DB write")

        async def commit(self):
            raise AssertionError("commit should not be called")

        async def refresh(self, _obj):
            raise AssertionError("refresh should not be called")

    db = _DummyDB(records=[])
    with pytest.raises(ConsentRequiredError):
        await enroll(db, uuid4(), uuid4(), [0.1] * 128)


@pytest.mark.asyncio
async def test_enroll_skip_consent_check_works():
    """skip_consent_check=True なら同意なしでも通る (admin 強制 enroll)."""
    from app.services.face_auth_engine import enroll
    from uuid import uuid4

    class _CapturingDB:
        def __init__(self):
            self.added = []
            self.committed = False

        def add(self, obj):
            self.added.append(obj)

        async def commit(self):
            self.committed = True

        async def refresh(self, _obj):
            pass

    db = _CapturingDB()
    out = await enroll(db, uuid4(), uuid4(), [0.1] * 128, skip_consent_check=True)
    assert db.committed
    assert out is not None


# ---- consent template seeds ----

def test_consent_seed_templates_have_4_codes():
    from app.services.consent_seeds import STANDARD_CONSENT_TEMPLATES
    codes = {t["code"] for t in STANDARD_CONSENT_TEMPLATES}
    assert codes == {"face", "gps", "clock_retention", "interview"}
    for t in STANDARD_CONSENT_TEMPLATES:
        assert t["title"]
        assert t["body_md"]
        assert isinstance(t["required_fields"], list)


def test_consent_seed_assigns_biometric_marking_to_face_template():
    from app.services.consent_seeds import BIOMETRIC_ASSIGNMENTS
    found = [(rt, col, mc) for rt, _, col, mc in BIOMETRIC_ASSIGNMENTS]
    assert ("face_template", "embedding_jsonb", "pii.biometric") in found


def test_marking_seeds_include_pii_biometric():
    from app.services.marking_seeds import STANDARD_MARKINGS, STANDARD_ASSIGNMENTS
    codes = {m["code"] for m in STANDARD_MARKINGS}
    assert "pii.biometric" in codes
    assert "pii.location" in codes
    found_face = [a for a in STANDARD_ASSIGNMENTS if a[0] == "face_template" and a[3] == "pii.biometric"]
    assert len(found_face) >= 1


# ---- Models import ----

def test_consent_models_importable():
    from app.models import ConsentTemplate, ConsentRecord, DataDeletionRequest
    assert ConsentTemplate.__tablename__ == "consent_templates"
    assert ConsentRecord.__tablename__ == "consent_records"
    assert DataDeletionRequest.__tablename__ == "data_deletion_requests"


def test_clock_in_imports_consent_check():
    """clock.py が consent_engine.check_required_consents を import している (静的検査)."""
    import pathlib
    clock_src = pathlib.Path(__file__).parent.parent / "app" / "api" / "v1" / "clock.py"
    text = clock_src.read_text(encoding="utf-8")
    assert "check_required_consents" in text
    assert "ConsentRequiredError" in text


def test_face_auth_engine_enroll_calls_consent_check():
    """face_auth_engine.enroll は consent check を呼んでいる (静的検査)."""
    import pathlib
    src = pathlib.Path(__file__).parent.parent / "app" / "services" / "face_auth_engine.py"
    text = src.read_text(encoding="utf-8")
    assert "check_required_consents" in text
    assert "skip_consent_check" in text


# ---- deletion processing (with stub DB & in-memory state) ----

class _MiniDB:
    """Very small async-DB stub. Records add/delete/commit calls."""

    def __init__(self, store: dict):
        self.store = store
        self.commits = 0

    def add(self, obj):
        self.store.setdefault("added", []).append(obj)

    async def execute(self, stmt):
        # The deletion engine issues both select() and delete(). We need to
        # look at the statement. For simplicity, we keep this DB-less test
        # focused on shape only.
        from sqlalchemy.sql import Select
        if isinstance(stmt, Select):
            return _StubResult(self.store.get("rows", []))
        return _StubResult([])

    async def commit(self):
        self.commits += 1

    async def refresh(self, _obj):
        pass


# (Full process_deletion test is integration-only; we only check the engine
# is importable + has the right scope handling constants here.)

def test_process_deletion_module_constants():
    from app.services import consent_engine
    assert consent_engine.CLOCK_RETENTION_YEARS == 3
    assert hasattr(consent_engine, "process_deletion")
    assert hasattr(consent_engine, "record_consent")
    assert hasattr(consent_engine, "withdraw")
