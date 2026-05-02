"""Tests for the manual-input ontology objects (8 objects).

Coverage:
- Pydantic schemas accept valid payloads / reject bad enums
- _waste_to_variance_hint mapping (over_made → over_portion, expired → waste)
- Engine integration on in-memory SQLite:
    * WasteLog.create with ingredient_id emits a CostVariance hint row
    * Complaint.create with severity=high emits a Task
    * AllergyResponse.create with incident_occurred=True emits a Task
- Router registration: 8 plural endpoints + photo upload exist
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

import pytest


# ---------------------------------------------------------------------------
# pure unit: variance-hint mapping
# ---------------------------------------------------------------------------

def test_waste_to_variance_hint_over_made_maps_to_over_portion():
    from app.services.manual_input_engine import _waste_to_variance_hint
    hint, sev = _waste_to_variance_hint("over_made", 6000)
    assert hint == "over_portion"
    assert sev == "high"


def test_waste_to_variance_hint_expired_maps_to_waste():
    from app.services.manual_input_engine import _waste_to_variance_hint
    hint, sev = _waste_to_variance_hint("expired", 200)
    assert hint == "waste"
    assert sev == "low"


def test_waste_to_variance_hint_dropped_medium_severity():
    from app.services.manual_input_engine import _waste_to_variance_hint
    hint, sev = _waste_to_variance_hint("dropped", 1500)
    assert hint == "waste"
    assert sev == "medium"


# ---------------------------------------------------------------------------
# schema validation
# ---------------------------------------------------------------------------

def test_complaint_schema_rejects_invalid_severity():
    from app.schemas.manual_input import ComplaintCreate
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        ComplaintCreate(
            store_id=uuid.uuid4(),
            complaint_date=date(2026, 5, 1),
            severity="extreme",  # not in low/medium/high
            content="x",
        )


def test_waste_log_schema_accepts_valid_reason():
    from app.schemas.manual_input import WasteLogCreate
    obj = WasteLogCreate(
        store_id=uuid.uuid4(),
        waste_date=date(2026, 5, 1),
        qty=2.5,
        reason="over_made",
        cost_estimate=1200,
    )
    assert obj.reason == "over_made"


def test_equipment_issue_schema_rejects_invalid_category():
    from app.schemas.manual_input import EquipmentIssueCreate
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        EquipmentIssueCreate(
            store_id=uuid.uuid4(),
            equipment_name="x",
            equipment_category="nonsense",
            severity="minor",
        )


def test_allergy_response_schema_round_trip():
    from app.schemas.manual_input import AllergyResponseCreate
    obj = AllergyResponseCreate(
        store_id=uuid.uuid4(),
        response_date=date(2026, 5, 1),
        allergen="wheat",
        items_provided_json=[{"item_name": "うどん", "swap": "別茹で"}],
    )
    assert obj.allergen == "wheat"
    assert obj.items_provided_json[0]["item_name"] == "うどん"


# ---------------------------------------------------------------------------
# router registration
# ---------------------------------------------------------------------------

def test_manual_input_router_registered_in_main():
    from app.main import app
    paths = {r.path for r in app.routes if hasattr(r, "path")}
    expected = [
        "/api/v1/daily-reports",
        "/api/v1/waste-logs",
        "/api/v1/complaints",
        "/api/v1/equipment-issues",
        "/api/v1/allergy-responses",
        "/api/v1/loss-reports",
        "/api/v1/customer-voices",
        "/api/v1/competitor-scans",
        "/api/v1/manual-input/photos",
    ]
    for p in expected:
        assert p in paths, f"missing route {p}"


def test_manual_input_router_has_full_crud():
    from app.api.v1.manual_input import router
    # router.routes paths already include the prefix (/api/v1/...)
    paths = {(r.path, tuple(sorted(r.methods or []))) for r in router.routes if hasattr(r, "path")}
    plurals = [
        "daily-reports", "waste-logs", "complaints", "equipment-issues",
        "allergy-responses", "loss-reports", "customer-voices", "competitor-scans",
    ]
    for p in plurals:
        base = f"/api/v1/{p}"
        sub = f"{base}/{{obj_id}}"
        methods_seen = {m for path, ms in paths if path == base for m in ms}
        assert "POST" in methods_seen, f"missing POST {base}"
        assert "GET" in methods_seen, f"missing GET {base}"
        sub_methods = {m for path, ms in paths if path == sub for m in ms}
        assert "GET" in sub_methods, f"missing GET {sub}"
        assert "PATCH" in sub_methods, f"missing PATCH {sub}"
        assert "DELETE" in sub_methods, f"missing DELETE {sub}"


# ---------------------------------------------------------------------------
# engine integration on in-memory SQLite (best-effort)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_waste_log_create_emits_variance_hint_when_ingredient_present():
    pytest.importorskip("aiosqlite")
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.database import Base
    import app.models  # noqa: F401  - register all mappings
    from app.services.manual_input_engine import create_waste_log

    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception:
        pytest.skip("SQLite cannot create the full schema")

    Session = async_sessionmaker(engine, expire_on_commit=False)
    tenant_id = "00000000-0000-0000-0000-000000000001"
    store_id = uuid.uuid4()
    ingredient_id = uuid.uuid4()

    async with Session() as db:
        from app.models.tenant import Tenant
        try:
            db.add(Tenant(id=uuid.UUID(tenant_id), name="t"))
            await db.flush()
        except Exception:
            pass
        obj, cv = await create_waste_log(
            db, tenant_id=tenant_id,
            payload={
                "store_id": store_id,
                "waste_date": date(2026, 5, 1),
                "ingredient_id": ingredient_id,
                "qty": 1.5,
                "reason": "over_made",
                "cost_estimate": 6000,
                "unit": "kg",
            },
        )
        assert obj.reason == "over_made"
        assert cv is not None, "CostVariance hint row should be emitted when ingredient_id is set"
        assert cv.root_cause_hint == "over_portion"
        assert cv.severity == "high"


@pytest.mark.asyncio
async def test_waste_log_no_ingredient_means_no_variance_hint():
    pytest.importorskip("aiosqlite")
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.database import Base
    import app.models  # noqa: F401
    from app.services.manual_input_engine import create_waste_log

    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception:
        pytest.skip("SQLite cannot create the full schema")
    Session = async_sessionmaker(engine, expire_on_commit=False)
    tenant_id = "00000000-0000-0000-0000-000000000001"

    async with Session() as db:
        from app.models.tenant import Tenant
        try:
            db.add(Tenant(id=uuid.UUID(tenant_id), name="t"))
            await db.flush()
        except Exception:
            pass
        obj, cv = await create_waste_log(
            db, tenant_id=tenant_id,
            payload={
                "store_id": uuid.uuid4(),
                "waste_date": date(2026, 5, 1),
                "qty": 1.0,
                "reason": "expired",
                "cost_estimate": 200,
            },
        )
        assert obj.reason == "expired"
        assert cv is None


@pytest.mark.asyncio
async def test_complaint_high_severity_creates_task():
    pytest.importorskip("aiosqlite")
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.database import Base
    import app.models  # noqa: F401
    from app.services.manual_input_engine import create_complaint

    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception:
        pytest.skip("SQLite cannot create the full schema")
    Session = async_sessionmaker(engine, expire_on_commit=False)
    tenant_id = "00000000-0000-0000-0000-000000000001"

    async with Session() as db:
        from app.models.tenant import Tenant
        try:
            db.add(Tenant(id=uuid.UUID(tenant_id), name="t"))
            await db.flush()
        except Exception:
            pass
        obj, task = await create_complaint(
            db, tenant_id=tenant_id,
            payload={
                "store_id": uuid.uuid4(),
                "complaint_date": date(2026, 5, 1),
                "channel": "in_store",
                "severity": "high",
                "content": "髪の毛混入の重大クレーム",
            },
        )
        assert obj.severity == "high"
        assert task is not None, "high-severity complaint must auto-create a Task"
        assert task.priority == "high"
        assert task.source == "complaint"


@pytest.mark.asyncio
async def test_complaint_low_severity_does_not_create_task():
    pytest.importorskip("aiosqlite")
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.database import Base
    import app.models  # noqa: F401
    from app.services.manual_input_engine import create_complaint

    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception:
        pytest.skip("SQLite cannot create the full schema")
    Session = async_sessionmaker(engine, expire_on_commit=False)
    tenant_id = "00000000-0000-0000-0000-000000000001"

    async with Session() as db:
        from app.models.tenant import Tenant
        try:
            db.add(Tenant(id=uuid.UUID(tenant_id), name="t"))
            await db.flush()
        except Exception:
            pass
        obj, task = await create_complaint(
            db, tenant_id=tenant_id,
            payload={
                "store_id": uuid.uuid4(),
                "complaint_date": date(2026, 5, 1),
                "channel": "phone",
                "severity": "low",
                "content": "席のクッションが固い",
            },
        )
        assert obj.severity == "low"
        assert task is None


@pytest.mark.asyncio
async def test_allergy_incident_creates_task():
    pytest.importorskip("aiosqlite")
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.database import Base
    import app.models  # noqa: F401
    from app.services.manual_input_engine import create_allergy_response

    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception:
        pytest.skip("SQLite cannot create the full schema")
    Session = async_sessionmaker(engine, expire_on_commit=False)
    tenant_id = "00000000-0000-0000-0000-000000000001"

    async with Session() as db:
        from app.models.tenant import Tenant
        try:
            db.add(Tenant(id=uuid.UUID(tenant_id), name="t"))
            await db.flush()
        except Exception:
            pass
        obj, task = await create_allergy_response(
            db, tenant_id=tenant_id,
            payload={
                "store_id": uuid.uuid4(),
                "response_date": date(2026, 5, 1),
                "allergen": "egg",
                "items_provided_json": [{"item_name": "親子丼", "swap": "卵抜き"}],
                "incident_occurred": True,
            },
        )
        assert obj.incident_occurred is True
        assert task is not None
        assert task.issue_type == "allergy_incident"


@pytest.mark.asyncio
async def test_daily_report_create_basic_round_trip():
    pytest.importorskip("aiosqlite")
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.database import Base
    import app.models  # noqa: F401
    from app.services.manual_input_engine import create_daily_report

    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception:
        pytest.skip("SQLite cannot create the full schema")
    Session = async_sessionmaker(engine, expire_on_commit=False)
    tenant_id = "00000000-0000-0000-0000-000000000001"

    async with Session() as db:
        from app.models.tenant import Tenant
        try:
            db.add(Tenant(id=uuid.UUID(tenant_id), name="t"))
            await db.flush()
        except Exception:
            pass
        obj = await create_daily_report(
            db, tenant_id=tenant_id,
            payload={
                "store_id": uuid.uuid4(),
                "report_date": date(2026, 5, 1),
                "sales_summary_text": "好調",
                "weather": "晴れ",
                "predicted_customers_tomorrow": 350,
                "predicted_sales_tomorrow": 480000,
            },
        )
        assert obj.weather == "晴れ"
        assert obj.predicted_customers_tomorrow == 350


@pytest.mark.asyncio
async def test_competitor_scan_create_round_trip():
    pytest.importorskip("aiosqlite")
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.database import Base
    import app.models  # noqa: F401
    from app.services.manual_input_engine import create_competitor_scan

    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception:
        pytest.skip("SQLite cannot create the full schema")
    Session = async_sessionmaker(engine, expire_on_commit=False)
    tenant_id = "00000000-0000-0000-0000-000000000001"

    async with Session() as db:
        from app.models.tenant import Tenant
        try:
            db.add(Tenant(id=uuid.UUID(tenant_id), name="t"))
            await db.flush()
        except Exception:
            pass
        obj = await create_competitor_scan(
            db, tenant_id=tenant_id,
            payload={
                "competitor_name": "吉野家 渋谷店",
                "latitude": 35.66,
                "longitude": 139.70,
                "menu_observations_json": [
                    {"item_name": "牛丼並", "price": 468, "popularity": "high"},
                ],
                "photos_json": ["/uploads/manual_input/abc.jpg"],
                "observations_text": "ピーク時の埋まり 7 割。",
            },
        )
        assert obj.competitor_name == "吉野家 渋谷店"
        assert obj.menu_observations_json[0]["price"] == 468


# ---------------------------------------------------------------------------
# Seed module sanity (data shape only — DB write is exercised by the demo seeder)
# ---------------------------------------------------------------------------

def test_seed_module_exposes_main_entry():
    from app.services import manual_input_seeds as ms
    assert callable(ms.seed_manual_input_data)
    assert callable(ms.seed_daily_reports)
    assert callable(ms.seed_competitor_scans)


def test_seed_uses_demo_tenant_id_constant():
    from app.services.manual_input_seeds import DEMO_TENANT_ID
    assert str(DEMO_TENANT_ID) == "00000000-0000-0000-0000-000000000001"
