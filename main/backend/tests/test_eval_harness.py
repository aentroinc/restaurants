"""Eval harness tests — uses an injected mock runner to avoid real LLM calls."""
import json
import os
import uuid
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.ai.eval_harness import (
    EvalCase,
    _heuristic_judge,
    _substring_hit_rate,
    _tool_match_rate,
    list_sets,
    load_set,
)


def test_tool_match_rate_full():
    assert _tool_match_rate(["a", "b"], ["a", "b", "c"]) == 1.0


def test_tool_match_rate_partial():
    assert _tool_match_rate(["a", "b"], ["a"]) == 0.5


def test_tool_match_rate_empty_expected():
    assert _tool_match_rate([], ["x"]) == 1.0


def test_substring_hit_rate_full():
    assert _substring_hit_rate(["hello", "world"], "hello world") == 1.0


def test_substring_hit_rate_partial():
    assert _substring_hit_rate(["hello", "moon"], "hello world") == 0.5


def test_heuristic_judge_combines_signals():
    case = EvalCase(id="x", input_message="m")
    s = _heuristic_judge(case, "this is a sufficiently long answer text", 1.0, 1.0)
    assert s == 1.0
    s2 = _heuristic_judge(case, "", 0.0, 0.0)
    assert s2 == 0.0


def test_load_basic_set_has_ten_cases():
    eset = load_set("restaurant_ai_basic")
    assert eset.name == "restaurant_ai_basic"
    assert len(eset.cases) == 10
    assert all(c.input_message for c in eset.cases)


def test_list_sets_includes_basic():
    sets = list_sets()
    assert "restaurant_ai_basic" in sets


@pytest.mark.asyncio
async def test_run_eval_with_mock_runner_persists_results():
    """End-to-end: mock runner returns a fixed answer with a tool call;
    harness should compute metrics and write to EvalRun."""
    from app.services.ai.eval_harness import run_eval
    from app.models.eval import EvalRun

    # build a tiny throwaway eval set on disk
    sets_dir = Path(__file__).resolve().parents[1] / "eval" / "sets"
    sets_dir.mkdir(parents=True, exist_ok=True)
    tmp_path = sets_dir / "test_mock_set.json"
    tmp_path.write_text(json.dumps({
        "cases": [
            {
                "id": "c1",
                "input_message": "売上トップは？",
                "expected_tool_calls": ["get_store_ranking"],
                "expected_substrings": ["トップ"],
            },
            {
                "id": "c2",
                "input_message": "FL比率は？",
                "expected_tool_calls": ["get_brand_summary"],
                "expected_substrings": ["FL"],
            },
        ]
    }, ensure_ascii=False), encoding="utf-8")

    try:
        async def mock_runner(message, tenant_id, db):
            if "売上" in message:
                return ("トップ10店舗を以下の通り返します。", ["get_store_ranking"], None)
            return ("ブランド別FL比率: 55%", ["get_brand_summary"], None)

        # In-memory fake DB session that captures EvalRun add/commit/refresh
        captured = {"row": None, "committed": 0}

        class FakeSession:
            def __init__(self):
                self.added = []
            def add(self, obj):
                self.added.append(obj)
                if isinstance(obj, EvalRun):
                    if obj.id is None:
                        obj.id = uuid.uuid4()
                    captured["row"] = obj
            async def commit(self):
                captured["committed"] += 1
            async def refresh(self, obj):
                return None
            async def get(self, model, pk):
                return None
            async def execute(self, *a, **kw):
                # not used by harness in this path
                raise NotImplementedError

        fake_db = FakeSession()
        tenant_id = "00000000-0000-0000-0000-000000000001"
        result = await run_eval(
            "test_mock_set",
            tenant_id,
            fake_db,
            runner=mock_runner,
            pass_threshold=0.5,
        )

        assert result is not None
        assert result.set_name == "test_mock_set"
        assert result.total_cases == 2
        assert result.status == "done"
        assert result.passed_cases == 2
        assert result.avg_tool_match_rate == 1.0
        assert result.avg_substring_hit_rate == 1.0
        assert result.avg_judge_score >= 0.9
        assert isinstance(result.results, list) and len(result.results) == 2
        assert captured["committed"] >= 2  # initial create + final update
    finally:
        if tmp_path.exists():
            tmp_path.unlink()
