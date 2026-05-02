"""Marking-based ACL のロジック単体テスト.

DB 接続が必要な統合テストではなく、marking_engine の判定ロジックを fake repo で検証する。
別途 column_policy 経由のフローも軽くシミュレートする。
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone, timedelta


# ---- helpers --------------------------------------------------------------

def _make_purpose(token: str, granted: list[str], expired: bool = False):
    p = MagicMock()
    p.purpose_token = token
    p.granted_markings = granted
    p.valid_to = (datetime.now(timezone.utc) - timedelta(minutes=1)) if expired else (datetime.now(timezone.utc) + timedelta(hours=1))
    p.valid_from = datetime.now(timezone.utc) - timedelta(hours=1)
    return p


def _make_db_mock(purpose_rows: list, marking_rows: list):
    """`get_active_purpose` と `_load_marking_codes_for` の execute をシムする."""
    db = MagicMock()
    calls = {"i": 0}

    async def execute(stmt):
        calls["i"] += 1
        result = MagicMock()
        # 最初の呼び出し = UserPurpose, 2回目 = MarkingAssignment join Marking
        if calls["i"] == 1:
            scalars = MagicMock()
            scalars.all = MagicMock(return_value=purpose_rows)
            result.scalars = MagicMock(return_value=scalars)
        else:
            result.all = MagicMock(return_value=marking_rows)
        return result

    db.execute = execute
    return db


# ---- tests ----------------------------------------------------------------

@pytest.mark.asyncio
async def test_operation_purpose_cannot_see_fc_financial():
    """purpose=operation のユーザは fc.financial を見られない (mask)."""
    from app.services.marking_engine import evaluate_access

    purpose = _make_purpose("operation", ["pii.basic", "regulatory.haccp"])
    # 列 net_sales には fc.financial が貼られている
    marking_rows = [
        ("net_sales", "fc.financial", "high"),
        ("avg_ticket", None, None),  # 空想 dummy。avg_ticket には marking なし
    ]
    # avg_ticket の row は実際には返らないので除外
    marking_rows = [("net_sales", "fc.financial", "high")]
    db = _make_db_mock([purpose], marking_rows)

    decisions = await evaluate_access(
        db, tenant_id="t1", user_id="u1",
        resource_type="kpi", resource_id=None,
        columns=["net_sales", "avg_ticket"],
    )
    # high level が欠落 → deny になる
    assert decisions["net_sales"] == "deny"
    # marking 無しは allow
    assert decisions["avg_ticket"] == "allow"


@pytest.mark.asyncio
async def test_executive_purpose_can_see_fc_financial():
    """purpose=executive は fc.financial を保有 → allow."""
    from app.services.marking_engine import evaluate_access

    purpose = _make_purpose("executive", ["pii.basic", "labor.confidential", "fc.financial"])
    marking_rows = [("net_sales", "fc.financial", "high")]
    db = _make_db_mock([purpose], marking_rows)

    decisions = await evaluate_access(
        db, tenant_id="t1", user_id="u1",
        resource_type="kpi", resource_id=None,
        columns=["net_sales"],
    )
    assert decisions["net_sales"] == "allow"


@pytest.mark.asyncio
async def test_no_purpose_means_no_access_to_marked_columns():
    """purpose 未付与（granted=[]）はすべての marking 列が制限される."""
    from app.services.marking_engine import evaluate_access

    db = _make_db_mock([], [("hourly_rate", "labor.confidential", "high")])
    decisions = await evaluate_access(
        db, tenant_id="t1", user_id="u1",
        resource_type="employee", resource_id=None,
        columns=["hourly_rate", "name_x"],
    )
    assert decisions["hourly_rate"] == "deny"
    assert decisions["name_x"] == "allow"


@pytest.mark.asyncio
async def test_medium_level_marking_yields_mask_not_deny():
    """medium level の marking 欠落は mask 扱い."""
    from app.services.marking_engine import evaluate_access

    purpose = _make_purpose("research", [])
    marking_rows = [("email", "pii.basic", "medium")]
    db = _make_db_mock([purpose], marking_rows)

    decisions = await evaluate_access(
        db, tenant_id="t1", user_id="u1",
        resource_type="employee", resource_id=None,
        columns=["email"],
    )
    assert decisions["email"] == "mask"


@pytest.mark.asyncio
async def test_filter_for_llm_strips_denied_columns():
    """AI Chat 文脈フィルタ: deny 列は dict から削除される."""
    from app.services.marking_engine import filter_for_llm

    purpose = _make_purpose("operation", ["pii.basic"])
    # 1度目: get_active_purpose / 2度目: marking 取得
    marking_rows = [("operating_profit", "fc.financial", "high")]
    db = _make_db_mock([purpose], marking_rows)

    data = {"store_id": "s1", "operating_profit": 12345, "review_score": 4.2}
    out = await filter_for_llm(db, "t1", "u1", "kpi", data)

    # fc.financial の列は LLM 文脈から除外される
    assert "operating_profit" not in out
    # marking が無い列はそのまま
    assert out["review_score"] == 4.2
    assert out["store_id"] == "s1"


@pytest.mark.asyncio
async def test_expired_purpose_is_ignored():
    """valid_to を過ぎた purpose は active 扱いされない."""
    from app.services.marking_engine import get_active_purpose

    # SQL の where 句で expired は弾かれることが期待値だが、ここでは
    # 「rows が空であれば granted_markings は []」を確認する。
    db = _make_db_mock([], [])
    purpose = await get_active_purpose(db, "u1")
    assert purpose["granted_markings"] == []
    assert purpose["purpose_token"] is None


@pytest.mark.asyncio
async def test_column_policy_and_marking_compose():
    """既存 column_policy のマスクの上に marking が重なる事を確認."""
    from app.middleware.column_mask import mask_pii
    from app.services.marking_engine import filter_for_llm

    # column_policy 相当: name は admin/executive 以外はマスク
    raw = {"store_id": "s1", "name": "Tanaka", "operating_profit": 999999}
    after_pii = mask_pii(raw, user_roles=["sv"])  # name -> ***
    assert after_pii["name"] == "***"

    # その後 marking で fc.financial を deny
    purpose = _make_purpose("operation", ["pii.basic"])
    marking_rows = [("operating_profit", "fc.financial", "high")]
    db = _make_db_mock([purpose], marking_rows)

    final = await filter_for_llm(db, "t1", "u1", "kpi", after_pii)
    assert "operating_profit" not in final  # marking ACL でも除外
    assert final["name"] == "***"           # column_policy のマスクは温存
