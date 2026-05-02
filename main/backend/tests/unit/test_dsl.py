"""Unit tests for the safe DSL evaluator."""
import pytest

from app.services.dsl import FormulaError, evaluate_formula_safe, parse_formula


def test_basic_arithmetic():
    assert evaluate_formula_safe("{a} + {b}", {"a": 3, "b": 5}) == 8


def test_gross_margin():
    out = evaluate_formula_safe(
        "({net_sales} - {cogs}) / {net_sales}",
        {"net_sales": 100, "cogs": 30},
    )
    assert abs(out - 0.7) < 1e-9


def test_division_by_zero_returns_zero():
    assert evaluate_formula_safe("{a} / {b}", {"a": 5, "b": 0}) == 0


def test_missing_variable_defaults_to_zero():
    assert evaluate_formula_safe("{a} + {b}", {"a": 5}) == 5


def test_min_max_round_allowed():
    assert evaluate_formula_safe("min({a}, {b})", {"a": 3, "b": 7}) == 3
    assert evaluate_formula_safe("max({a}, {b})", {"a": 3, "b": 7}) == 7
    assert evaluate_formula_safe("round({a})", {"a": 3.7}) == 4


def test_arbitrary_function_rejected():
    with pytest.raises(FormulaError):
        evaluate_formula_safe("__import__('os').system('rm -rf /')", {})


def test_attribute_access_rejected():
    with pytest.raises(FormulaError):
        evaluate_formula_safe("(0).real", {})


def test_string_literal_rejected():
    with pytest.raises(FormulaError):
        evaluate_formula_safe("'hello'", {})


def test_comparison_rejected():
    with pytest.raises(FormulaError):
        evaluate_formula_safe("{a} > {b}", {"a": 1, "b": 2})


def test_invalid_identifier_rejected():
    with pytest.raises(FormulaError):
        parse_formula("{not-an-identifier}")
