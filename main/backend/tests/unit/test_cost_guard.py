"""Unit tests for cost computation."""
from decimal import Decimal

from app.services.ai.cost_guard import compute_cost_jpy


def test_opus_4_7_pricing():
    cost = compute_cost_jpy(
        model="claude-opus-4-7",
        input_tokens=10_000,
        output_tokens=5_000,
    )
    # 10000 * 2.25/1000 + 5000 * 11.25/1000 = 22.5 + 56.25 = 78.75
    assert cost == Decimal("78.7500")


def test_haiku_pricing_cheaper():
    opus = compute_cost_jpy("claude-opus-4-7", 1000, 1000)
    haiku = compute_cost_jpy("claude-haiku-4-5-20251001", 1000, 1000)
    assert haiku < opus


def test_cache_read_discount_applies():
    no_cache = compute_cost_jpy("claude-opus-4-7", 10_000, 0)
    with_cache = compute_cost_jpy(
        "claude-opus-4-7", 1_000, 0, cache_read_tokens=9_000,
    )
    # cache reads are discounted -> with_cache should be much cheaper
    assert with_cache < no_cache / 4
