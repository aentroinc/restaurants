"""AI evaluation API — list eval sets, kick off runs, fetch scores."""
import uuid
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_tenant_id
from app.database import get_db, async_session
from app.models.eval import EvalRun
from app.services.ai.eval_harness import list_sets, load_set, run_eval


router = APIRouter(prefix="/api/v1/ai/eval", tags=["ai-eval"])


@router.get("/sets")
async def get_sets():
    sets = list_sets()
    out = []
    for name in sets:
        try:
            es = load_set(name)
            out.append({"name": name, "case_count": len(es.cases)})
        except Exception:
            out.append({"name": name, "case_count": 0, "error": "failed_to_load"})
    return {"data": out}


async def _run_eval_background(run_id: str, set_name: str, tenant_id: str, model_tier: str):
    """Background task — opens its own DB session because the request is gone by then."""
    async with async_session() as db:
        try:
            await run_eval(
                set_name, tenant_id, db,
                model_tier=model_tier,
                existing_run_id=run_id,
            )
        except Exception as e:
            row = await db.get(EvalRun, uuid.UUID(run_id))
            if row is not None:
                row.status = "error"
                row.error_message = str(e)[:2000]
                await db.commit()


@router.post("/runs")
async def create_run(
    background_tasks: BackgroundTasks,
    set: str = Query("restaurant_ai_basic"),
    model_tier: str = Query("default"),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    if set not in list_sets():
        raise HTTPException(status_code=404, detail=f"Eval set not found: {set}")

    # create the row up front so caller has an id immediately; background runner finishes it.
    run_row = EvalRun(
        tenant_id=uuid.UUID(tenant_id),
        set_name=set,
        model_tier=model_tier,
        status="pending",
        total_cases=0,
    )
    db.add(run_row)
    await db.commit()
    await db.refresh(run_row)

    run_id = str(run_row.id)
    background_tasks.add_task(_run_eval_background, run_id, set, tenant_id, model_tier)
    return {"data": {"run_id": run_id, "set": set, "status": "queued"}}


@router.get("/runs")
async def list_runs(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    limit: int = 20,
):
    res = await db.execute(
        select(EvalRun)
        .where(EvalRun.tenant_id == tenant_id)
        .order_by(desc(EvalRun.created_at))
        .limit(limit)
    )
    rows = res.scalars().all()
    return {"data": [_serialize_run(r, include_results=False) for r in rows]}


@router.get("/runs/{run_id}")
async def get_run(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    res = await db.execute(
        select(EvalRun).where(EvalRun.id == run_id, EvalRun.tenant_id == tenant_id)
    )
    row = res.scalar_one_or_none()
    if row is None:
        # also try a "still running" run by set_name latest if id not yet persisted
        raise HTTPException(status_code=404, detail="Eval run not found")
    return {"data": _serialize_run(row, include_results=True)}


def _serialize_run(r: EvalRun, include_results: bool) -> dict:
    out = {
        "id": str(r.id),
        "set_name": r.set_name,
        "model_tier": r.model_tier,
        "status": r.status,
        "total_cases": r.total_cases,
        "passed_cases": r.passed_cases,
        "avg_tool_match_rate": r.avg_tool_match_rate,
        "avg_substring_hit_rate": r.avg_substring_hit_rate,
        "avg_judge_score": r.avg_judge_score,
        "error_message": r.error_message,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "completed_at": r.completed_at.isoformat() if r.completed_at else None,
    }
    if include_results:
        out["results"] = r.results or []
    return out
