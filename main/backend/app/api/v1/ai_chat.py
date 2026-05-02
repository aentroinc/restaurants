import json
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_tenant_id, get_current_user_optional
from app.core.tenant_context import get_user
from app.middleware.audit import log_audit
from app.services.ai.client import get_client, is_llm_available
from app.services.ai.tools import TOOL_DEFINITIONS, execute_tool
from app.services.ai.system_prompt import build_system_prompt
from app.services.ai.governance import (
    can_use_tool, filter_tools_for_role, requires_approval,
)
from app.services.ai.cost_guard import check_budget, log_usage
from app.models.ai_session import AISession
from app.models.ai_query import AIQueryLog
from app.models.ai_budget import AIRefusalLog

router = APIRouter(prefix="/api/v1/ai", tags=["ai-chat"])


class AIChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    context: Optional[str] = None


class AIChatResponse(BaseModel):
    session_id: str
    message: str


def _json_event(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False, default=str)}\n\n"


async def _rule_based_fallback(request: AIChatRequest, db: AsyncSession, tenant_id: str):
    """Fallback to the existing rule-based AI when no API key is set."""
    from app.api.v1.ai import parse_intent, AIQueryRequest
    from app.schemas.ai import AIQueryResponse

    # reuse existing rule-based logic via internal import
    from app.api.v1.ai import ai_query as _rule_query
    from app.schemas.common import APIResponse

    # create a mock request
    mock_req = AIQueryRequest(question=request.message)

    async def generate():
        yield _json_event({"type": "text", "content": "（LLM未設定のためルールベース分析を使用）\n\n"})

        # execute rule-based query
        result = await _rule_query(mock_req, db, tenant_id)
        data = result.data

        parts = []
        parts.append(f"**結論:** {data.conclusion}\n")
        if data.facts:
            parts.append("\n**事実:**")
            for f in data.facts:
                parts.append(f"- {f}")
        if data.hypotheses:
            parts.append("\n**仮説:**")
            for h in data.hypotheses:
                parts.append(f"- {h}")
        if data.recommended_actions:
            parts.append("\n**推奨アクション:**")
            for a in data.recommended_actions:
                parts.append(f"- {a}")
        if data.estimated_impact_amount:
            parts.append(f"\n**推定改善インパクト:** {data.estimated_impact_amount:,.0f}円/月")

        yield _json_event({"type": "text", "content": "\n".join(parts)})
        yield _json_event({"type": "done", "usage": {"input_tokens": 0, "output_tokens": 0}})

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/chat")
async def ai_chat(
    request: AIChatRequest,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    # Cost guard: deny when monthly budget exhausted
    status = await check_budget(db, tenant_id)
    if not status.allowed:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "monthly_budget_exhausted",
                "used_jpy": float(status.used_jpy),
                "budget_jpy": float(status.budget_jpy),
                "ratio": status.ratio,
            },
        )

    user_payload = get_user()
    user_role = user_payload.get("role") if user_payload else None
    allowed_tools = filter_tools_for_role(user_role, TOOL_DEFINITIONS)

    if not is_llm_available():
        return await _rule_based_fallback(request, db, tenant_id)

    client = get_client()
    system_prompt = await build_system_prompt(tenant_id, db)

    # load or create session
    session_id = request.session_id
    session_record = None
    conversation_history = []

    if session_id:
        session_q = await db.execute(
            select(AISession).where(AISession.id == session_id, AISession.tenant_id == tenant_id)
        )
        session_record = session_q.scalar_one_or_none()
        if session_record and session_record.messages:
            conversation_history = session_record.messages

    if not session_record:
        session_record = AISession(
            tenant_id=uuid.UUID(tenant_id),
            title=request.message[:100],
            messages=[],
            total_tokens=0,
        )
        db.add(session_record)
        await db.flush()
        session_id = str(session_record.id)

    # build messages
    user_content = request.message
    if request.context:
        user_content = f"[コンテキスト: {request.context}]\n\n{request.message}"

    messages = conversation_history + [{"role": "user", "content": user_content}]

    async def generate():
        nonlocal messages
        total_input = 0
        total_output = 0
        final_text_parts = []

        for iteration in range(10):
            try:
                response = client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=4096,
                    system=system_prompt,
                    tools=allowed_tools,
                    messages=messages,
                )
            except Exception as e:
                yield _json_event({"type": "error", "content": f"LLM API error: {str(e)}"})
                return

            total_input += response.usage.input_tokens
            total_output += response.usage.output_tokens

            # collect tool uses in this response for batching
            tool_results = []
            has_tool_use = False

            for block in response.content:
                if block.type == "text":
                    yield _json_event({"type": "text", "content": block.text})
                    final_text_parts.append(block.text)
                elif block.type == "tool_use":
                    has_tool_use = True

                    # Authorization check before tool execution
                    if not can_use_tool(user_role, block.name):
                        result = {"error": f"unauthorized_tool: {block.name} not allowed for role={user_role}"}
                        try:
                            db.add(AIRefusalLog(
                                tenant_id=uuid.UUID(tenant_id),
                                user_id=uuid.UUID(user_payload["sub"]) if user_payload and user_payload.get("sub") else None,
                                session_id=uuid.UUID(session_id) if session_id else None,
                                user_message=request.message[:2000],
                                refusal_reason=f"role_blocked:{block.name}",
                            ))
                            await db.flush()
                        except Exception:
                            pass
                    elif requires_approval(user_role, block.name):
                        result = {"error": "requires_approval", "tool": block.name, "input": block.input}
                    else:
                        result = await execute_tool(block.name, block.input, tenant_id, db)

                    yield _json_event({"type": "tool_use", "name": block.name, "input": block.input})
                    yield _json_event({"type": "tool_result", "name": block.name, "output": result})

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result, ensure_ascii=False, default=str),
                    })

            if has_tool_use:
                # serialize content blocks for message history
                assistant_content = []
                for block in response.content:
                    if block.type == "text":
                        assistant_content.append({"type": "text", "text": block.text})
                    elif block.type == "tool_use":
                        assistant_content.append({
                            "type": "tool_use",
                            "id": block.id,
                            "name": block.name,
                            "input": block.input,
                        })

                messages.append({"role": "assistant", "content": assistant_content})
                messages.append({"role": "user", "content": tool_results})

            if response.stop_reason == "end_turn":
                break

        # save session
        final_text = "".join(final_text_parts)
        save_messages = conversation_history + [
            {"role": "user", "content": user_content},
            {"role": "assistant", "content": final_text},
        ]
        session_record.messages = save_messages
        session_record.total_tokens = (session_record.total_tokens or 0) + total_input + total_output
        await db.commit()

        # log to ai_query_logs
        try:
            log_entry = AIQueryLog(
                tenant_id=uuid.UUID(tenant_id),
                question=request.message,
                answer={"response": final_text, "model": "claude-sonnet-4-20250514", "tokens": total_input + total_output},
                confidence="high",
            )
            db.add(log_entry)
            await db.commit()
        except Exception:
            pass

        # Per-call usage record for cost guard
        try:
            await log_usage(
                db,
                tenant_id=tenant_id,
                user_id=user_payload.get("sub") if user_payload else None,
                session_id=session_id,
                model="claude-sonnet-4-20250514",
                input_tokens=total_input,
                output_tokens=total_output,
                purpose="chat",
                request_id=session_id,
            )
            await db.commit()
        except Exception:
            pass

        log_audit(tenant_id, None, "ai_chat", "ai", session_id, {
            "message_length": len(request.message),
            "input_tokens": total_input,
            "output_tokens": total_output,
            "soft_warning": status.reason == "soft_warning",
        })

        yield _json_event({
            "type": "done",
            "session_id": session_id,
            "usage": {"input_tokens": total_input, "output_tokens": total_output},
        })

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/sessions")
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    result = await db.execute(
        select(AISession.id, AISession.title, AISession.total_tokens, AISession.created_at, AISession.updated_at)
        .where(AISession.tenant_id == tenant_id)
        .order_by(AISession.updated_at.desc())
        .limit(50)
    )
    sessions = [
        {
            "id": str(r[0]),
            "title": r[1],
            "total_tokens": r[2],
            "created_at": r[3].isoformat() if r[3] else None,
            "updated_at": r[4].isoformat() if r[4] else None,
        }
        for r in result.all()
    ]
    return {"data": sessions}


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    result = await db.execute(
        select(AISession).where(AISession.id == session_id, AISession.tenant_id == tenant_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "data": {
            "id": str(session.id),
            "title": session.title,
            "messages": session.messages,
            "total_tokens": session.total_tokens,
            "created_at": session.created_at.isoformat() if session.created_at else None,
            "updated_at": session.updated_at.isoformat() if session.updated_at else None,
        }
    }


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    result = await db.execute(
        select(AISession).where(AISession.id == session_id, AISession.tenant_id == tenant_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    await db.delete(session)
    await db.commit()
    return {"data": {"deleted": True}}
