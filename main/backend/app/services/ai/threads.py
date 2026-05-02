"""Thread service — multi-turn AI conversation persistence and summarization."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.thread import Thread, ThreadMessage


SUMMARIZE_AFTER_MESSAGES = 30  # past this length, older messages get summarized
KEEP_RECENT_MESSAGES = 10      # how many to keep verbatim after summarization


async def create_thread(
    db: AsyncSession,
    tenant_id: str,
    owner_user_id: Optional[str] = None,
    title: Optional[str] = None,
) -> Thread:
    th = Thread(
        tenant_id=uuid.UUID(tenant_id),
        owner_user_id=uuid.UUID(owner_user_id) if owner_user_id else None,
        title=(title or "新しい会話")[:500],
    )
    db.add(th)
    await db.commit()
    await db.refresh(th)
    return th


async def list_threads(
    db: AsyncSession, tenant_id: str, limit: int = 50
) -> list[Thread]:
    res = await db.execute(
        select(Thread)
        .where(Thread.tenant_id == tenant_id)
        .order_by(desc(Thread.updated_at))
        .limit(limit)
    )
    return list(res.scalars().all())


async def get_thread(
    db: AsyncSession, tenant_id: str, thread_id: str
) -> Optional[Thread]:
    res = await db.execute(
        select(Thread).where(Thread.id == thread_id, Thread.tenant_id == tenant_id)
    )
    return res.scalar_one_or_none()


async def add_message(
    db: AsyncSession,
    thread_id: str,
    role: str,
    content_text: Optional[str] = None,
    tool_use_json: Optional[dict] = None,
    tokens: int = 0,
) -> ThreadMessage:
    msg = ThreadMessage(
        thread_id=uuid.UUID(thread_id),
        role=role,
        content_text=content_text,
        tool_use_json=tool_use_json,
        tokens=tokens,
    )
    db.add(msg)

    th = await db.get(Thread, uuid.UUID(thread_id))
    if th is not None:
        th.message_count = (th.message_count or 0) + 1
        th.total_tokens = (th.total_tokens or 0) + (tokens or 0)
        th.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(msg)
    return msg


async def get_thread_history(
    db: AsyncSession, thread_id: str, limit: int = 200
) -> list[ThreadMessage]:
    res = await db.execute(
        select(ThreadMessage)
        .where(ThreadMessage.thread_id == thread_id)
        .order_by(ThreadMessage.created_at.asc())
        .limit(limit)
    )
    return list(res.scalars().all())


def _format_history_for_summary(messages: list[ThreadMessage]) -> str:
    lines: list[str] = []
    for m in messages:
        prefix = {"user": "ユーザー", "assistant": "AI", "tool": "ツール", "system": "システム"}.get(m.role, m.role)
        text = m.content_text or ""
        if not text and m.tool_use_json:
            text = f"[tool_use: {m.tool_use_json.get('name', 'unknown')}]"
        if text:
            lines.append(f"{prefix}: {text[:400]}")
    return "\n".join(lines)


async def summarize_thread(db: AsyncSession, thread_id: str) -> Optional[str]:
    """Summarize older messages and store summary on the Thread row.

    Strategy:
    - If thread has > SUMMARIZE_AFTER_MESSAGES messages, take the older block
      (everything except the last KEEP_RECENT_MESSAGES) and ask Claude to
      write a 5-line summary.
    - If LLM is unavailable, fall back to a deterministic head/tail digest.
    - Store the summary text on Thread.summary; older messages stay in DB
      (we don't delete) so audit/history is preserved.
    """
    history = await get_thread_history(db, thread_id, limit=500)
    if len(history) <= SUMMARIZE_AFTER_MESSAGES:
        return None

    older = history[:-KEEP_RECENT_MESSAGES] if KEEP_RECENT_MESSAGES > 0 else history
    transcript = _format_history_for_summary(older)

    summary: Optional[str] = None
    try:
        from app.services.ai.client import get_client, get_model, is_llm_available
        if is_llm_available():
            client = get_client()
            model = get_model("fast")
            resp = client.messages.create(
                model=model,
                max_tokens=600,
                messages=[{
                    "role": "user",
                    "content": (
                        "次の会話履歴を5行以内・日本語で要約してください。"
                        "重要な意思決定・データ・残課題のみ含めること。\n\n"
                        + transcript
                    ),
                }],
            )
            for block in resp.content:
                if getattr(block, "type", None) == "text":
                    summary = (summary or "") + block.text
    except Exception:
        summary = None

    if not summary:
        head = transcript[:600]
        tail = transcript[-600:] if len(transcript) > 600 else ""
        summary = (
            "（自動ダイジェスト — LLM不在）\n冒頭: " + head + ("\n\n末尾: " + tail if tail else "")
        )

    th = await db.get(Thread, uuid.UUID(thread_id))
    if th is not None:
        th.summary = summary[:8000]
        await db.commit()
    return summary
