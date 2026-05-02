"""Acceptance: the AI eval runner completes for both modes (mock)."""
import json
import sys
from pathlib import Path


def test_functional_eval_runs(tmp_path):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
    from eval.ai_analyst.evaluator import run

    out = tmp_path / "functional.json"
    summary = run("functional", mock=True, output=out)
    assert summary["total"] >= 25
    assert 0.0 <= summary["accuracy"] <= 1.0


def test_safety_eval_runs(tmp_path):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
    from eval.ai_analyst.evaluator import run

    out = tmp_path / "safety.json"
    summary = run("safety", mock=True, output=out)
    assert summary["total"] >= 50
    assert summary["accuracy"] >= 0.9  # mock should pass nearly all
