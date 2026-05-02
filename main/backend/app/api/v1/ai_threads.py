"""AI conversation threads API.

POST /messages reuses the existing /api/v1/ai/chat streaming pipeline by
forwarding to ai_chat.ai_chat — this lets the front-end stream the same SSE
format and keeps a single LLM loop implementation.
"""
import json
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_tenant_id
from app.database import get_db
from app.services.ai import threads as thread_svc


router = APIRouter(prefix="/api/v1/ai/threads", tags=["ai-threads"])


class CreateThreadRequest(BaseModel):
    title: Optional[str] = None
    owner_user_id: Optional[str] = None


class PostMessageRequest(BaseModel):
    message: str
    role: str = "user"  # only "user" creates an assistant turn; others are recorded only
    model_tier: str = "default"
    context: Optional[str] = None


@router.get("")
async def list_threads(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
    limit: int = 50,
):
    rows = await thread_svc.list_threads(db, tenant_id, limit=limit)
    return {"data": [_serialize_thread(t) for t in rows]}


@router.post("")
async def create_thread(
    body: CreateThreadRequest,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    th = await thread_svc.create_thread(
        db, tenant_id, owner_user_id=body.owner_user_id, title=body.title
    )
    return {"data": _serialize_thread(th)}


@router.get("/{thread_id}")
async def get_thread(
    thread_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    th = await thread_svc.get_thread(db, tenant_id, thread_id)
    if th is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    return {"data": _serialize_thread(th)}


@router.get("/{thread_id}/messages")
async def get_thread_messages(
    thread_id: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    th = await thread_svc.get_thread(db, tenant_id, thread_id)
    if th is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    msgs = await thread_svc.get_thread_history(db, thread_id)
    return {
        "data": {
            "thread": _serialize_thread(th),
            "messages": [_serialize_message(m) for m in msgs],
        }
    }


@router.post("/{thread_id}/messages")
async def post_thread_message(
    thread_id: str,
    body: PostMessageRequest,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """Persist user message, run AI through existing ai_chat pipeline, persist assistant reply.

    Returns a streaming SSE response identical to /api/v1/ai/chat. The
    assistant's final text is persisted on stream completion via a wrapping
    generator.
    """
    th = await thread_svc.get_thread(db, tenant_id, thread_id)
    if th is None:
        raise HTTPException(status_code=404, detail="Thread not found")

    # persist user turn first
    await thread_svc.add_message(
        db, thread_id, role="user", content_text=body.message
    )

    # auto-summarize if conversation got long
    if (th.message_count or 0) >= 30:
        try:
            await thread_svc.summarize_thread(db, thread_id)
        except Exception:
            pass

    # delegate to existing ai_chat (kept untouched per project rules)
    from app.api.v1.ai_chat import ai_chat, AIChatRequest
    chat_req = AIChatRequest(
        message=body.message,
        session_id=None,
        context=body.context,
        model_tier=body.model_tier,
    )
    streaming = await ai_chat(chat_req, db=db, tenant_id=tenant_id)

    # wrap the streaming body so we can capture the final text for persistence
    original_iter = streaming.body_iterator

    async def wrapped():
        final_parts: list[str] = []
        total_tokens = 0
        async for chunk in original_iter:
            yield chunk
            try:
                # SSE chunks are "data: {...}\n\n" — best-effort parse to capture text
                text = chunk.decode("utf-8") if isinstance(chunk, (bytes, bytearray)) else chunk
                for line in text.splitlines():
                    if line.startswith("data: "):
                        payload = json.loads(line[len("data: "):])
                        if payload.get("type") == "text" and payload.get("content"):
                            final_parts.append(payload["content"])
                        elif payload.get("type") == "done":
                            usage = payload.get("usage") or {}
                            total_tokens = (usage.get("input_tokens") or 0) + (usage.get("output_tokens") or 0)
            except Exception:
                pass

        # persist assistant turn after stream completes (best-effort)
        try:
            from app.database import async_session
            async with async_session() as db2:
                await thread_svc.add_message(
                    db2, thread_id,
                    role="assistant",
                    content_text="".join(final_parts) or None,
                    tokens=total_tokens,
                )
        except Exception:
            pass

    streaming.body_iterator = wrapped()
    return streaming


def _serialize_thread(t) -> dict:
    return {
        "id": str(t.id),
        "tenant_id": str(t.tenant_id),
        "owner_user_id": str(t.owner_user_id) if t.owner_user_id else None,
        "title": t.title,
        "summary": t.summary,
        "message_count": t.message_count,
        "total_tokens": t.total_tokens,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


def _serialize_message(m) -> dict:
    return {
        "id": str(m.id),
        "thread_id": str(m.thread_id),
        "role": m.role,
        "content_text": m.content_text,
        "tool_use_json": m.tool_use_json,
        "tokens": m.tokens,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }
