"""軽減税率 (8%/10%) 計算ロジック単体テスト。

丸め誤差 10 円以内、税率判定、内税/外税切替を網羅。
"""
from __future__ import annotations

from decimal import Decimal


def test_calculate_tax_exclusive_10pct():
    from app.services.tax_calculator import calculate_tax
    r = calculate_tax(1000, Decimal("0.10"), mode="exclusive")
    assert r["net"] == Decimal("1000")
    assert r["tax"] == Decimal("100")
    assert r["gross"] == Decimal("1100")


def test_calculate_tax_exclusive_8pct():
    from app.services.tax_calculator import calculate_tax
    r = calculate_tax(1000, Decimal("0.08"), mode="exclusive")
    assert r["net"] == Decimal("1000")
    assert r["tax"] == Decimal("80")
    assert r["gross"] == Decimal("1080")


def test_calculate_tax_inclusive_10pct():
    from app.services.tax_calculator import calculate_tax
    # 税込 1100 円 -> 税抜 1000、税 100
    r = calculate_tax(1100, Decimal("0.10"), mode="inclusive")
    assert r["net"] == Decimal("1000")
    assert r["tax"] == Decimal("100")
    assert r["gross"] == Decimal("1100")


def test_calculate_tax_inclusive_8pct_rounding():
    from app.services.tax_calculator import calculate_tax
    # 税込 540 円 (税抜 500 / 税 40) — 軽減税率
    r = calculate_tax(540, Decimal("0.08"), mode="inclusive")
    assert r["net"] == Decimal("500")
    assert r["tax"] == Decimal("40")


def test_resolve_tax_rate_food_takeout_is_8pct():
    from app.services.tax_calculator import resolve_tax_rate, REDUCED
    assert resolve_tax_rate("reduced", "takeout") == REDUCED
    assert resolve_tax_rate("reduced", "delivery") == REDUCED


def test_resolve_tax_rate_food_eatin_is_10pct():
    from app.services.tax_calculator import resolve_tax_rate, STANDARD
    # 食品でも店内飲食なら 10%
    assert resolve_tax_rate("reduced", "eat_in") == STANDARD


def test_resolve_tax_rate_alcohol_always_10pct():
    from app.services.tax_calculator import resolve_tax_rate, STANDARD
    # 酒類は dining_type に関係なく標準 10%
    assert resolve_tax_rate("standard", "takeout") == STANDARD
    assert resolve_tax_rate("standard", "eat_in") == STANDARD


def test_resolve_tax_rate_exempt():
    from app.services.tax_calculator import resolve_tax_rate, EXEMPT
    assert resolve_tax_rate("exempt", None) == EXEMPT


def test_rounding_tolerance_under_10yen():
    """混在 100 件の合計税額が、個別計算合計と 10 円以内であること。"""
    from app.services.tax_calculator import calculate_tax
    items = [(1234, Decimal("0.08"))] * 50 + [(987, Decimal("0.10"))] * 50
    per_item_tax = sum(calculate_tax(a, r, mode="exclusive")["tax"] for a, r in items)
    # 集計後の税額: 8% bucket と 10% bucket それぞれで丸め
    sum_8 = sum(a for a, r in items if r == Decimal("0.08"))
    sum_10 = sum(a for a, r in items if r == Decimal("0.10"))
    bucket_tax = (
        calculate_tax(sum_8, Decimal("0.08"), mode="exclusive")["tax"]
        + calculate_tax(sum_10, Decimal("0.10"), mode="exclusive")["tax"]
    )
    diff = abs(per_item_tax - bucket_tax)
    assert diff <= Decimal("10")
