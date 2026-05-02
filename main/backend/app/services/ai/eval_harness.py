"""Evaluation harness for AI tool-use behaviour.

JSON eval sets live in backend/eval/sets/<name>.json — each set is a list
of cases:

    {
      "id": "kpi_basic_1",
      "input_message": "...",
      "expected_tool_calls": ["query_kpi"],
      "expected_substrings": ["FL"],
      "scoring_rubric": "正解は 2026-04 のFL比率を返すこと"
    }

run_eval(...) executes each case end-to-end through the live LLM (Anthropic
client + tool dispatch), collects metrics, and persists an EvalRun row.

A pluggable `runner` argument lets tests inject a mock LLM without spinning
up the full Anthropic loop.
"""
from __future__ import annotations

import json
import os
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Awaitable, Callable, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.eval import EvalRun


EVAL_SETS_DIR = Path(__file__).resolve().parents[3] / "eval" / "sets"


@dataclass
class EvalCase:
    id: str
    input_message: str
    expected_tool_calls: list[str] = field(default_factory=list)
    expected_substrings: list[str] = field(default_factory=list)
    scoring_rubric: Optional[str] = None


@dataclass
class EvalSet:
    name: str
    cases: list[EvalCase]


@dataclass
class CaseResult:
    case_id: str
    input_message: str
    final_text: str
    tool_calls: list[str]
    tool_match_rate: float
    substring_hit_rate: float
    judge_score: float
    passed: bool
    error: Optional[str] = None


def list_sets() -> list[str]:
    if not EVAL_SETS_DIR.exists():
        return []
    return sorted(p.stem for p in EVAL_SETS_DIR.glob("*.json"))


def load_set(name: str) -> EvalSet:
    path = EVAL_SETS_DIR / f"{name}.json"
    if not path.exists():
        raise FileNotFoundError(f"Eval set not found: {name}")
    raw = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(raw, dict) and "cases" in raw:
        case_blob = raw["cases"]
    else:
        case_blob = raw
    cases = [
        EvalCase(
            id=c.get("id") or f"case_{i}",
            input_message=c["input_message"],
            expected_tool_calls=c.get("expected_tool_calls", []),
            expected_substrings=c.get("expected_substrings", []),
            scoring_rubric=c.get("scoring_rubric"),
        )
        for i, c in enumerate(case_blob)
    ]
    return EvalSet(name=name, cases=cases)


def _tool_match_rate(expected: list[str], actual: list[str]) -> float:
    if not expected:
        return 1.0
    actual_set = set(actual)
    hits = sum(1 for t in expected if t in actual_set)
    return hits / len(expected)


def _substring_hit_rate(expected: list[str], text: str) -> float:
    if not expected:
        return 1.0
    hits = sum(1 for s in expected if s and s in text)
    return hits / len(expected)


def _heuristic_judge(case: EvalCase, text: str, tool_match: float, substr_hit: float) -> float:
    """Cheap LLM-as-judge stand-in.
    Real judge can be wired later; for now combine tool / substring fit + text length.
    """
    base = (tool_match * 0.5) + (substr_hit * 0.4)
    if text and len(text.strip()) > 30:
        base += 0.1
    return round(min(base, 1.0), 3)


# Type for a runner: takes input_message + tenant_id + db, returns (final_text, tool_call_names, error)
RunnerType = Callable[[str, str, AsyncSession], Awaitable[tuple[str, list[str], Optional[str]]]]


async def _live_runner(
    message: str, tenant_id: str, db: AsyncSession, model_tier: str = "default"
) -> tuple[str, list[str], Optional[str]]:
    """Default runner — drives the real Anthropic client + tool loop without streaming."""
    from app.services.ai.client import get_client, get_model, is_llm_available
    from app.services.ai.tools import TOOL_DEFINITIONS, execute_tool
    from app.services.ai.system_prompt import build_system_blocks

    if not is_llm_available():
        return ("(LLM not configured — eval skipped)", [], "LLM not available")

    client = get_client()
    model = get_model(model_tier)
    system_blocks = await build_system_blocks(tenant_id, db)

    messages: list[dict] = [{"role": "user", "content": message}]
    final_text_parts: list[str] = []
    tool_calls: list[str] = []

    try:
        for _ in range(8):
            resp = client.messages.create(
                model=model,
                max_tokens=2048,
                system=system_blocks,
                tools=TOOL_DEFINITIONS,
                messages=messages,
            )
            tool_results = []
            has_tool = False
            assistant_blocks: list[dict] = []
            for block in resp.content:
                if block.type == "text":
                    final_text_parts.append(block.text)
                    assistant_blocks.append({"type": "text", "text": block.text})
                elif block.type == "tool_use":
                    has_tool = True
                    tool_calls.append(block.name)
                    assistant_blocks.append({
                        "type": "tool_use", "id": block.id,
                        "name": block.name, "input": block.input,
                    })
                    out = await execute_tool(block.name, block.input, tenant_id, db)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(out, ensure_ascii=False, default=str),
                    })
            if has_tool:
                messages.append({"role": "assistant", "content": assistant_blocks})
                messages.append({"role": "user", "content": tool_results})
            if resp.stop_reason == "end_turn":
                break
        return ("".join(final_text_parts), tool_calls, None)
    except Exception as e:
        return ("", tool_calls, str(e))


async def run_eval(
    eval_set_name: str,
    tenant_id: str,
    db: AsyncSession,
    model_tier: str = "default",
    runner: Optional[RunnerType] = None,
    pass_threshold: float = 0.6,
    existing_run_id: Optional[str] = None,
) -> EvalRun:
    """Run an eval set end-to-end and persist the EvalRun row.

    If `existing_run_id` is given, update that row in-place (used by the API
    so the caller can get the id back synchronously); otherwise create a new
    row.
    """
    eval_set = load_set(eval_set_name)

    if existing_run_id:
        run_row = await db.get(EvalRun, uuid.UUID(existing_run_id))
        if run_row is None:
            raise FileNotFoundError(f"Eval run not found: {existing_run_id}")
        run_row.status = "running"
        run_row.total_cases = len(eval_set.cases)
    else:
        run_row = EvalRun(
            tenant_id=uuid.UUID(tenant_id),
            set_name=eval_set_name,
            model_tier=model_tier,
            status="running",
            total_cases=len(eval_set.cases),
        )
        db.add(run_row)
    await db.commit()
    await db.refresh(run_row)

    case_results: list[CaseResult] = []

    for case in eval_set.cases:
        if runner:
            final_text, tools_called, err = await runner(case.input_message, tenant_id, db)
        else:
            final_text, tools_called, err = await _live_runner(
                case.input_message, tenant_id, db, model_tier
            )

        tool_rate = _tool_match_rate(case.expected_tool_calls, tools_called)
        substr_rate = _substring_hit_rate(case.expected_substrings, final_text)
        judge = _heuristic_judge(case, final_text, tool_rate, substr_rate)
        passed = (err is None) and (judge >= pass_threshold)

        case_results.append(CaseResult(
            case_id=case.id,
            input_message=case.input_message,
            final_text=final_text[:2000],
            tool_calls=tools_called,
            tool_match_rate=tool_rate,
            substring_hit_rate=substr_rate,
            judge_score=judge,
            passed=passed,
            error=err,
        ))

    n = max(len(case_results), 1)
    avg_tool = sum(r.tool_match_rate for r in case_results) / n
    avg_substr = sum(r.substring_hit_rate for r in case_results) / n
    avg_judge = sum(r.judge_score for r in case_results) / n
    passed = sum(1 for r in case_results if r.passed)

    run_row.passed_cases = passed
    run_row.avg_tool_match_rate = round(avg_tool, 4)
    run_row.avg_substring_hit_rate = round(avg_substr, 4)
    run_row.avg_judge_score = round(avg_judge, 4)
    run_row.results = [r.__dict__ for r in case_results]
    run_row.status = "done"
    run_row.completed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(run_row)
    return run_row
