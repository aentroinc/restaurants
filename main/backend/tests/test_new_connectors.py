"""新4 connector (kot/freee/ubereats/td) の単体テスト。

DB を使わない pure unit テスト + sync ロジックは fake AsyncSession を渡して挙動を確認。
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

import pytest

FIXTURE_DIR = Path(__file__).resolve().parents[1] / "app" / "connectors" / "sandbox"


def _fx(name: str):
    with (FIXTURE_DIR / f"{name}.json").open() as f:
        return json.load(f)


# ── sandbox fixture loading ─────────────────────────────────────

def test_kot_fixtures_load():
    workings = _fx("kot_daily_workings")["dailyWorkings"]
    employees = _fx("kot_employees")["employees"]
    assert len(workings) == 6
    assert len(employees) == 6
    assert all("clockIn" in w for w in workings)
    assert all("employeeKey" in e for e in employees)


def test_freee_fixtures_load():
    deals = _fx("freee_deals")["deals"]
    assert len(deals) == 4
    purchases = [d for d in deals if any(det.get("account_item_id") == 605 for det in d["details"])]
    assert len(purchases) == 3  # 仕入が 3 件、その他 1 件 (水道光熱費)
    companies = _fx("freee_companies")["companies"]
    assert companies[0]["id"] == 9999999


def test_ubereats_fixtures_load():
    orders = _fx("ubereats_orders")["orders"]
    assert len(orders) == 5
    completed = [o for o in orders if o["state"] == "COMPLETED"]
    assert len(completed) == 4
    menu = _fx("ubereats_menu")
    assert "menus" in menu


def test_td_fixtures_load():
    data = _fx("td_temperature_data")
    assert data["device_id"] == "RTR-500-001"
    assert data["threshold_max_c"] == 10.0
    breaches = [r for r in data["data"] if r["temperature_c"] > 10.0]
    assert len(breaches) >= 3  # 故障シナリオで 10℃超え数点
    devices = _fx("td_devices")["devices"]
    assert len(devices) == 3


# ── connector pure logic (no DB) ────────────────────────────────

def test_kot_connector_class_attrs():
    from app.connectors.kot_attendance import KOTAttendance
    impl = KOTAttendance()
    assert impl.source_type == "kot"
    assert impl.system_category == "labor"
    assert impl.api_base.startswith("https://api.kingtime.jp")
    assert impl.test_connection({"sandbox_mode": True}) is True


def test_freee_connector_class_attrs():
    from app.connectors.freee_accounting import FreeeAccounting
    impl = FreeeAccounting()
    assert impl.source_type == "freee"
    assert impl.system_category == "accounting"
    assert impl.client_id_env == "FREEE_CLIENT_ID"
    assert impl.api_base.startswith("https://api.freee.co.jp")


def test_ubereats_connector_class_attrs():
    from app.connectors.ubereats import UberEatsMerchant
    impl = UberEatsMerchant()
    assert impl.source_type == "ubereats"
    assert impl.system_category == "delivery"
    assert impl.token_endpoint.startswith("https://login.uber.com")


def test_td_connector_class_attrs():
    from app.connectors.td_temperature import TDTemperature
    impl = TDTemperature()
    assert impl.source_type == "td"
    assert impl.system_category == "iot_sensor"
    assert impl.api_base.startswith("https://api.tandd.com")


# ── transform logic ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_kot_fetch_returns_workings():
    from app.connectors.kot_attendance import KOTAttendance
    impl = KOTAttendance()
    res = await impl.fetch({"sandbox_mode": True})
    assert res.total_fetched == 6
    transformed = impl.transform(res.records)
    assert all("labor_hours" in r for r in transformed)
    # ST から始まる店舗コード
    assert all(r["store_code"].startswith("ST") for r in transformed)


@pytest.mark.asyncio
async def test_freee_filters_purchases():
    from app.connectors.freee_accounting import FreeeAccounting
    impl = FreeeAccounting()
    res = await impl.fetch({"sandbox_mode": True})
    transformed = impl.transform(res.records)
    # 仕入科目 (605) のみ抽出 → 3 件
    assert len(transformed) == 3
    total = sum(r["amount"] for r in transformed)
    assert total == 685000  # 480000 + 120000 + 85000


@pytest.mark.asyncio
async def test_ubereats_aggregates_by_store_date():
    from app.connectors.ubereats import UberEatsMerchant
    impl = UberEatsMerchant()
    res = await impl.fetch({"sandbox_mode": True})
    agg = impl.transform(res.records)
    # 2 店舗 × 1 日付 = 2 行
    assert len(agg) == 2
    st0001 = next(r for r in agg if r["store_code"] == "ST0001")
    assert st0001["order_count"] == 3
    # cancelled は delivery_sales に含まれない
    assert st0001["delivery_sales"] == 2480 + 1680 + 3240
    st0002 = next(r for r in agg if r["store_code"] == "ST0002")
    assert st0002["cancelled_count"] == 1
    assert st0002["delivery_sales"] == 1950


@pytest.mark.asyncio
async def test_td_breach_records_present_in_fixture():
    from app.connectors.td_temperature import TDTemperature
    impl = TDTemperature()
    res = await impl.fetch({"sandbox_mode": True})
    transformed = impl.transform(res.records)
    breaches = [r for r in transformed if r["temperature_c"] > r["threshold_max_c"]]
    assert len(breaches) >= 3
    # 朝3時台にスパイク
    breach_hours = {int(r["timestamp"][11:13]) for r in breaches}
    assert 3 in breach_hours


# ── sync end-to-end with fake DB ────────────────────────────────

class _FakeResult:
    def __init__(self, value=None):
        self._value = value

    def scalar_one_or_none(self):
        return self._value

    def scalar(self):
        return self._value

    def scalars(self):
        class _S:
            def all(_self):
                return []
        return _S()


class _FakeAsyncSession:
    """In-memory fake — captures added rows and resolves stores/companies."""

    def __init__(self, store_id=None, company_id=None):
        self.added = []
        self._store_id = store_id
        self._company_id = company_id

    async def execute(self, stmt):
        text = str(stmt).lower()
        if "from stores" in text or "stores.id" in text:
            return _FakeResult(self._store_id)
        if "from companies" in text or "companies.id" in text:
            return _FakeResult(self._company_id)
        if "from ccp_definitions" in text:
            return _FakeResult(None)
        # upsert (returns nothing relevant)
        return _FakeResult(None)

    def add(self, obj):
        self.added.append(obj)

    async def flush(self):
        pass

    async def commit(self):
        pass

    async def rollback(self):
        pass


@pytest.mark.asyncio
async def test_kot_sync_creates_ingestion_batch():
    from app.connectors.kot_attendance import KOTAttendance
    from app.models.ingestion import IngestionBatch

    company_id = uuid.uuid4()
    db = _FakeAsyncSession(company_id=company_id)
    tenant_id = str(uuid.uuid4())
    impl = KOTAttendance()
    result = await impl.sync(db, tenant_id, sandbox_mode=True)

    assert result["status"] == "completed"
    assert result["workings_fetched"] == 6
    batches = [o for o in db.added if isinstance(o, IngestionBatch)]
    assert len(batches) == 1
    assert batches[0].source_system == "kot"
    assert batches[0].entity_type == "kot_attendance"


@pytest.mark.asyncio
async def test_freee_sync_creates_ingestion_batch():
    from app.connectors.freee_accounting import FreeeAccounting
    from app.models.ingestion import IngestionBatch

    db = _FakeAsyncSession()
    tenant_id = str(uuid.uuid4())
    impl = FreeeAccounting()
    result = await impl.sync(db, tenant_id, sandbox_mode=True)

    assert result["status"] == "completed"
    assert result["deals_fetched"] == 4
    assert result["purchases_extracted"] == 3
    assert result["total_purchase_amount"] == 685000
    batches = [o for o in db.added if isinstance(o, IngestionBatch)]
    assert len(batches) == 1
    assert batches[0].source_system == "freee"


@pytest.mark.asyncio
async def test_ubereats_sync_creates_batch_and_skips_when_no_store():
    """店舗マスタに該当 store がないので persisted=0 だが batch は作られる。"""
    from app.connectors.ubereats import UberEatsMerchant
    from app.models.ingestion import IngestionBatch

    db = _FakeAsyncSession(store_id=None)  # store未登録
    tenant_id = str(uuid.uuid4())
    impl = UberEatsMerchant()
    result = await impl.sync(db, tenant_id, sandbox_mode=True)

    assert result["status"] == "completed"
    assert result["orders_fetched"] == 5
    assert result["rows_persisted"] == 0  # store マスタ未登録なので 0
    assert result["total_delivery_sales"] == 2480 + 1680 + 3240 + 1950
    batches = [o for o in db.added if isinstance(o, IngestionBatch)]
    assert len(batches) == 1


@pytest.mark.asyncio
async def test_td_sync_creates_task_on_breach():
    """閾値超過で Task が発行される。"""
    from app.connectors.td_temperature import TDTemperature
    from app.models.ingestion import IngestionBatch
    from app.models.task import Task
    from app.models.haccp import HACCPMonitoring

    store_id = uuid.uuid4()
    db = _FakeAsyncSession(store_id=store_id)
    tenant_id = str(uuid.uuid4())
    impl = TDTemperature()
    result = await impl.sync(db, tenant_id, sandbox_mode=True)

    assert result["status"] == "completed"
    assert result["breaches_detected"] >= 3  # 故障シナリオ
    assert result["tasks_created"] == 1  # 1 店舗にまとまる

    batches = [o for o in db.added if isinstance(o, IngestionBatch)]
    tasks = [o for o in db.added if isinstance(o, Task)]
    monitorings = [o for o in db.added if isinstance(o, HACCPMonitoring)]
    assert len(batches) == 1
    assert len(tasks) == 1
    assert tasks[0].issue_type == "haccp_deviation"
    assert tasks[0].priority == "high"
    assert tasks[0].source == "td_temperature"
    assert len(monitorings) >= 1


@pytest.mark.asyncio
async def test_td_webhook_creates_task_on_breach():
    from app.connectors.td_temperature import TDTemperature
    from app.models.task import Task

    store_id = uuid.uuid4()
    db = _FakeAsyncSession(store_id=store_id)
    tenant_id = str(uuid.uuid4())
    impl = TDTemperature()
    payload = {
        "data": [
            {
                "device_id": "RTR-500-001",
                "store_code": "ST0001",
                "timestamp": "2026-05-02T03:30:00+09:00",
                "temperature_c": 12.0,
                "threshold_min_c": 0.0,
                "threshold_max_c": 10.0,
            }
        ]
    }
    result = await impl.receive_webhook(db, tenant_id, payload)
    assert result["source"] == "webhook"
    assert result["breaches_detected"] == 1
    assert result["tasks_created"] == 1
    tasks = [o for o in db.added if isinstance(o, Task)]
    assert tasks[0].title.startswith("[HACCP逸脱]")


# ── connector_health probes ─────────────────────────────────────

@pytest.mark.asyncio
async def test_connector_health_probe_all():
    from app.services.connector_health import probe_all
    out = await probe_all(sandbox=True)
    types = {r["connector"] for r in out}
    assert {"kot", "freee", "ubereats", "td"} <= types
    for r in out:
        assert "ok" in r


# ── oauth router dispatch ───────────────────────────────────────

def test_oauth_router_recognizes_new_connectors():
    from app.api.v1.oauth import (
        OAUTH_PROVIDERS,
        API_KEY_PROVIDERS,
        CLIENT_CREDENTIAL_PROVIDERS,
        DIRECT_SYNC_PROVIDERS,
    )
    assert "freee" in OAUTH_PROVIDERS
    assert "kot" in API_KEY_PROVIDERS
    assert "td" in API_KEY_PROVIDERS
    assert "ubereats" in CLIENT_CREDENTIAL_PROVIDERS
    assert {"kot", "freee", "ubereats", "td"} <= set(DIRECT_SYNC_PROVIDERS)


def test_connector_secrets_supports_new_types():
    from app.services.connector_secrets import SUPPORTED_CONNECTOR_TYPES
    for t in ("kot", "freee", "ubereats", "td"):
        assert t in SUPPORTED_CONNECTOR_TYPES


def test_connectors_init_exports():
    from app import connectors as conn_mod
    for name in ("KOTAttendance", "FreeeAccounting", "UberEatsMerchant", "TDTemperature"):
        assert hasattr(conn_mod, name)
