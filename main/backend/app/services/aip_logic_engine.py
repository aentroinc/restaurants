"""AIP Logic Engine — predicate 評価 & action chain 実行.

`predicate_json` は AST 形式の JSON。`eval()` 等は使わず、許可された
比較演算子と and/or/not のみ評価する。

Predicate AST 形式:
  - {"op": "and" | "or", "children": [<node>, ...]}
  - {"op": "not", "child": <node>}
  - {"op": "<" | "<=" | "==" | "!=" | ">=" | ">", "left": <ref>, "right": <value>}
  - <ref>: {"kpi": "net_sales", "scope": "tenant_avg" | "store"} or {"const": <value>}

Action chain 各 step:
  - {"type": "call_ai_chat", "params": {"prompt": "..."}}
  - {"type": "create_task", "params": {"title": "...", "store_id": "...", "priority": "high"}}
  - {"type": "send_notification", "params": {"channel": "sv", "message": "..."}}
  - {"type": "query_kpi", "params": {"name": "net_sales", "store_id": "..."}}
  - {"type": "run_pipeline", "params": {"pipeline_id": "..."}}

各 step の戻り値は `context["last_result"]` と
`context["step_results"][i]` に保存される。
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.aip_logic import LogicFunction, LogicRun

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Predicate evaluation (safe, AST-based)
# ---------------------------------------------------------------------------

_ALLOWED_CMP = {"<", "<=", "==", "!=", ">=", ">"}
_ALLOWED_BOOL = {"and", "or", "not"}


def _resolve_ref(ref: Any, context: dict[str, Any]) -> Any:
    """Resolve a value reference in the predicate against context."""
    if not isinstance(ref, dict):
        # bare literal allowed for convenience
        return ref
    if "const" in ref:
        return ref["const"]
    if "kpi" in ref:
        kpi_name = ref["kpi"]
        scope = ref.get("scope", "tenant_avg")
        kpi_ctx = context.get("kpi", {}) if isinstance(context.get("kpi"), dict) else {}
        if scope == "store":
            store_kpis = kpi_ctx.get("store", {}) if isinstance(kpi_ctx.get("store"), dict) else {}
            return store_kpis.get(kpi_name)
        return kpi_ctx.get(kpi_name)
    if "var" in ref:
        return context.get(ref["var"])
    return None


def _compare(op: str, lhs: Any, rhs: Any) -> bool:
    if lhs is None or rhs is None:
        # any comparison with None is False except equality
        if op == "==":
            return lhs is None and rhs is None
        if op == "!=":
            return not (lhs is None and rhs is None)
        return False
    try:
        if op == "<":
            return lhs < rhs
        if op == "<=":
            return lhs <= rhs
        if op == "==":
            return lhs == rhs
        if op == "!=":
            return lhs != rhs
        if op == ">=":
            return lhs >= rhs
        if op == ">":
            return lhs > rhs
    except TypeError:
        return False
    return False


def evaluate_predicate(predicate_json: dict | None, context: dict[str, Any]) -> bool:
    """Evaluate predicate AST safely. Empty / missing predicate is True."""
    if not predicate_json:
        return True
    if not isinstance(predicate_json, dict):
        return False
    op = predicate_json.get("op")
    if op in _ALLOWED_BOOL:
        if op == "and":
            children = predicate_json.get("children", []) or []
            return all(evaluate_predicate(c, context) for c in children)
        if op == "or":
            children = predicate_json.get("children", []) or []
            return any(evaluate_predicate(c, context) for c in children)
        if op == "not":
            return not evaluate_predicate(predicate_json.get("child", {}), context)
    if op in _ALLOWED_CMP:
        lhs = _resolve_ref(predicate_json.get("left"), context)
        rhs = _resolve_ref(predicate_json.get("right"), context)
        return _compare(op, lhs, rhs)
    return False


# ---------------------------------------------------------------------------
# Action chain execution
# ---------------------------------------------------------------------------

async def _action_call_ai_chat(params: dict[str, Any], context: dict[str, Any], db: AsyncSession) -> dict:
    """Run a quick AI-chat call. Falls back to template when LLM unavailable."""
    prompt = (params or {}).get("prompt", "")
    try:
        from app.services.ai.client import get_client, is_llm_available, get_model
        if is_llm_available():
            client = get_client()
            resp = client.messages.create(
                model=get_model("default"),
                max_tokens=512,
                messages=[{"role": "user", "content": prompt or "ヒント: 簡潔に仮説を3点。"}],
            )
            text = ""
            for block in resp.content:
                if getattr(block, "type", None) == "text":
                    text += block.text
            return {"type": "call_ai_chat", "ok": True, "text": text, "source": "claude"}
    except Exception as e:  # noqa: BLE001
        logger.warning("call_ai_chat failed, fallback: %s", e)
    return {
        "type": "call_ai_chat",
        "ok": True,
        "text": f"[fallback] 仮説: {prompt[:80] or '原因分析を実施してください'}",
        "source": "fallback",
    }


async def _action_create_task(params: dict[str, Any], context: dict[str, Any], db: AsyncSession) -> dict:
    from app.models.task import Task
    from app.models.store import Store

    tenant_id = context.get("tenant_id")
    store_id = (params or {}).get("store_id") or context.get("store_id")

    # Resolve a default store if none was provided
    if not store_id and tenant_id:
        row = (await db.execute(
            select(Store.id).where(Store.tenant_id == tenant_id).limit(1)
        )).scalar_one_or_none()
        if row:
            store_id = str(row)

    if not store_id:
        return {"type": "create_task", "ok": False, "error": "no store_id"}

    title = (params or {}).get("title") or "AIロジック発行タスク"
    description = (params or {}).get("description") or ""
    # Append last AI hypothesis if available
    last = context.get("last_result") or {}
    if isinstance(last, dict) and last.get("type") == "call_ai_chat" and last.get("text"):
        description = f"{description}\n\n[AI仮説]\n{last['text']}".strip()

    task = Task(
        tenant_id=UUID(str(tenant_id)) if tenant_id else None,
        store_id=UUID(str(store_id)),
        title=title,
        description=description,
        issue_type=(params or {}).get("issue_type"),
        status="open",
        priority=(params or {}).get("priority", "medium"),
        source="aip_logic",
    )
    db.add(task)
    await db.flush()
    return {"type": "create_task", "ok": True, "task_id": str(task.id)}


async def _action_send_notification(params: dict[str, Any], context: dict[str, Any], db: AsyncSession) -> dict:
    """Logs a notification. Real channel hookup is delegated to ops."""
    channel = (params or {}).get("channel", "sv")
    message = (params or {}).get("message", "")
    logger.info("[aip_logic] notify channel=%s message=%s", channel, message)
    return {"type": "send_notification", "ok": True, "channel": channel, "message": message}


async def _action_query_kpi(params: dict[str, Any], context: dict[str, Any], db: AsyncSession) -> dict:
    """Stash a KPI value into context.kpi for downstream predicates / actions."""
    from app.models.kpi import StoreDailyKPI

    name = (params or {}).get("name", "net_sales")
    tenant_id = context.get("tenant_id")
    store_id = (params or {}).get("store_id") or context.get("store_id")

    q = select(StoreDailyKPI).order_by(StoreDailyKPI.business_date.desc()).limit(1)
    if tenant_id:
        q = q.where(StoreDailyKPI.tenant_id == tenant_id)
    if store_id:
        q = q.where(StoreDailyKPI.store_id == UUID(str(store_id)))

    row = (await db.execute(q)).scalar_one_or_none()
    value = None
    if row is not None:
        value = getattr(row, name, None)
        if value is not None:
            try:
                value = float(value)
            except Exception:
                value = None

    kpi_ctx = context.setdefault("kpi", {})
    if isinstance(kpi_ctx, dict):
        kpi_ctx[name] = value

    return {"type": "query_kpi", "ok": True, "name": name, "value": value}


async def _action_run_pipeline(params: dict[str, Any], context: dict[str, Any], db: AsyncSession) -> dict:
    """Best-effort pipeline kickoff. No-op if pipeline not present."""
    pipeline_id = (params or {}).get("pipeline_id")
    if not pipeline_id:
        return {"type": "run_pipeline", "ok": False, "error": "no pipeline_id"}
    try:
        from app.services.pipeline_dag import execute_pipeline
        await execute_pipeline(
            db=db,
            pipeline_id=UUID(str(pipeline_id)),
            branch=(params or {}).get("branch", "main"),
            triggered_by="aip_logic",
        )
        return {"type": "run_pipeline", "ok": True, "pipeline_id": pipeline_id}
    except Exception as e:  # noqa: BLE001
        return {"type": "run_pipeline", "ok": False, "error": str(e)}


_ACTION_HANDLERS = {
    "call_ai_chat": _action_call_ai_chat,
    "create_task": _action_create_task,
    "send_notification": _action_send_notification,
    "query_kpi": _action_query_kpi,
    "run_pipeline": _action_run_pipeline,
}


async def execute_action_chain(
    actions: list[dict],
    context: dict[str, Any],
    db: AsyncSession,
) -> list[dict]:
    """Execute the action chain step-by-step. Stops at first hard error
    when `stop_on_error=true` is set on a step."""
    results: list[dict] = []
    step_results = context.setdefault("step_results", [])
    for i, step in enumerate(actions or []):
        if not isinstance(step, dict):
            continue
        atype = step.get("type")
        params = step.get("params", {}) or {}
        handler = _ACTION_HANDLERS.get(atype)
        if handler is None:
            res = {"type": atype, "ok": False, "error": f"unknown action type: {atype}"}
        else:
            try:
                res = await handler(params, context, db)
            except Exception as e:  # noqa: BLE001
                logger.exception("action %s failed", atype)
                res = {"type": atype, "ok": False, "error": str(e)}
        results.append(res)
        step_results.append(res)
        context["last_result"] = res
        if not res.get("ok") and step.get("stop_on_error"):
            break
    return results


# ---------------------------------------------------------------------------
# run_function — predicate → actions + LogicRun audit
# ---------------------------------------------------------------------------

async def run_function(
    db: AsyncSession,
    function_id: UUID,
    trigger_payload: dict | None = None,
    *,
    dry_run: bool = False,
) -> dict[str, Any]:
    fn = (await db.execute(
        select(LogicFunction).where(LogicFunction.id == function_id)
    )).scalar_one_or_none()
    if fn is None:
        return {"ok": False, "error": "function not found"}
    if not fn.enabled and not dry_run:
        return {"ok": False, "error": "function disabled"}

    context: dict[str, Any] = {
        "tenant_id": str(fn.tenant_id),
        "function_id": str(fn.id),
        "trigger": trigger_payload or {},
        "kpi": (trigger_payload or {}).get("kpi", {}) if isinstance(trigger_payload, dict) else {},
        "store_id": (trigger_payload or {}).get("store_id") if isinstance(trigger_payload, dict) else None,
        "step_results": [],
    }

    predicate_ok = evaluate_predicate(fn.predicate_json, context)
    actions_executed: list[dict] = []
    error: str | None = None
    status = "skipped"

    if predicate_ok:
        try:
            actions_executed = await execute_action_chain(fn.actions_json or [], context, db)
            failed = any(not r.get("ok") for r in actions_executed)
            status = "failed" if failed else "success"
        except Exception as e:  # noqa: BLE001
            error = str(e)
            status = "failed"

    run = LogicRun(
        function_id=fn.id,
        triggered_at=datetime.now(timezone.utc),
        trigger_payload_json=trigger_payload or {},
        predicate_result=predicate_ok,
        actions_executed_json=actions_executed,
        status=status,
        error=error,
    )
    if not dry_run:
        db.add(run)
        await db.flush()

    return {
        "ok": status != "failed",
        "function_id": str(fn.id),
        "predicate_result": predicate_ok,
        "status": status,
        "actions_executed": actions_executed,
        "run_id": str(run.id) if not dry_run else None,
        "error": error,
    }


__all__ = [
    "evaluate_predicate",
    "execute_action_chain",
    "run_function",
]
