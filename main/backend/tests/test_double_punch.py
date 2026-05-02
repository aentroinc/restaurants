"""二重打刻防止 + idempotency 動作テスト（pure-logic 部分）。

実 DB ある場合は alembic でテーブルが作られている前提だが、ここでは
DB に依存しない、`face_auth_engine.clock_in` のロジック直接検証は
async fixture が必要なため、定数 / Exception クラス周りの sanity と
DOUBLE_PUNCH_WINDOW_SEC が想定通りであることを確認する。
"""
from __future__ import annotations

import pytest


def test_double_punch_window_is_60_sec():
    from app.services.face_auth_engine import DOUBLE_PUNCH_WINDOW_SEC
    assert DOUBLE_PUNCH_WINDOW_SEC == 60


def test_double_punch_error_carries_last_event_id():
    from uuid import uuid4
    from app.services.face_auth_engine import DoublePunchError
    eid = uuid4()
    err = DoublePunchError("dup", last_event_id=eid)
    assert err.last_event_id == eid
    assert "dup" in str(err)


def test_double_punch_error_default_last_event_id_is_none():
    from app.services.face_auth_engine import DoublePunchError
    err = DoublePunchError("dup")
    assert err.last_event_id is None


@pytest.mark.asyncio
async def test_clock_in_idempotent_with_same_key():
    """同 idempotency_key で 2回呼んだら同じ ClockEvent が返ることを
    in-memory モック AsyncSession で確認。"""
    from datetime import datetime, timezone
    from uuid import uuid4
    from app.services.face_auth_engine import clock_in
    from app.models.face_auth import ClockEvent

    tenant = uuid4()
    emp = uuid4()
    store = uuid4()
    key = "test-idempotent-key-aaaa"

    # 既存レコードを返すモックセッション
    existing = ClockEvent(
        id=uuid4(), tenant_id=tenant, employee_id=emp, store_id=store,
        event_type="in", auth_method="face", idempotency_key=key,
        occurred_at=datetime.now(timezone.utc),
    )

    class MockResult:
        def __init__(self, val): self._v = val
        def scalar_one_or_none(self): return self._v

    class MockDB:
        def __init__(self): self.calls = 0
        async def execute(self, _stmt):
            self.calls += 1
            # 1 回目: idempotency 検索 → 既存ヒット
            return MockResult(existing if self.calls == 1 else None)
        def add(self, _): raise AssertionError("should not insert when idempotent hit")
        async def commit(self): pass
        async def refresh(self, _): pass

    db = MockDB()
    ev = await clock_in(
        db, tenant_id=tenant, employee_id=emp, store_id=store,
        event_type="in", auth_method="face", idempotency_key=key,
    )
    assert ev is existing
    assert db.calls == 1  # 2 回目以降の検索は走らない


@pytest.mark.asyncio
async def test_clock_in_blocks_double_punch_within_60s():
    """同 employee の同 event_type が 60 秒以内にあれば DoublePunchError。"""
    from datetime import datetime, timedelta, timezone
    from uuid import uuid4
    from app.services.face_auth_engine import clock_in, DoublePunchError
    from app.models.face_auth import ClockEvent

    tenant = uuid4()
    emp = uuid4()
    store = uuid4()

    # 30 秒前に同種打刻あり
    last = ClockEvent(
        id=uuid4(), tenant_id=tenant, employee_id=emp, store_id=store,
        event_type="in", auth_method="face",
        occurred_at=datetime.now(timezone.utc) - timedelta(seconds=30),
    )

    class MockResult:
        def __init__(self, val): self._v = val
        def scalar_one_or_none(self): return self._v

    class MockDB:
        def __init__(self): self.calls = 0
        async def execute(self, _stmt):
            self.calls += 1
            # 1: idempotency 検索 (なし) / 2: window 検索 (ヒット)
            if self.calls == 1:
                return MockResult(None)
            return MockResult(last)
        def add(self, _): raise AssertionError("should not insert on double-punch block")
        async def commit(self): pass
        async def refresh(self, _): pass

    db = MockDB()
    with pytest.raises(DoublePunchError) as ei:
        await clock_in(
            db, tenant_id=tenant, employee_id=emp, store_id=store,
            event_type="in", auth_method="face",
            idempotency_key="brand-new-key-zzzzzzzz",
        )
    assert ei.value.last_event_id == last.id


@pytest.mark.asyncio
async def test_clock_in_allows_after_window():
    """60秒より前の同種打刻のみがあれば許可される。"""
    from datetime import datetime, timezone
    from uuid import uuid4
    from app.services.face_auth_engine import clock_in
    from app.models.face_auth import ClockEvent

    tenant = uuid4()
    emp = uuid4()
    store = uuid4()

    class MockResult:
        def __init__(self, val): self._v = val
        def scalar_one_or_none(self): return self._v

    class MockDB:
        def __init__(self):
            self.calls = 0
            self.added: list = []
        async def execute(self, _stmt):
            self.calls += 1
            return MockResult(None)  # 何も見つからない
        def add(self, ev):
            self.added.append(ev)
        async def commit(self): pass
        async def refresh(self, ev):
            ev.occurred_at = datetime.now(timezone.utc)

    db = MockDB()
    ev = await clock_in(
        db, tenant_id=tenant, employee_id=emp, store_id=store,
        event_type="in", auth_method="face",
        idempotency_key="another-key-yyyyyyyy",
    )
    assert isinstance(ev, ClockEvent)
    assert len(db.added) == 1
    assert ev.idempotency_key == "another-key-yyyyyyyy"
