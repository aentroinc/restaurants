"""Cosine top-k document search over the `documents` table.

Falls back to in-Python cosine when pgvector is unavailable (the
embedding column is JSONB) so the same code works for tests + prod.
"""
from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document, PGVECTOR_AVAILABLE
from app.services.ai.embedder import cosine, embed_text


async def search_documents(
    db: AsyncSession,
    *,
    tenant_id: str,
    query: str,
    limit: int = 5,
    types: list[str] | None = None,
) -> list[dict[str, Any]]:
    q_vec = await embed_text(query)

    base = select(Document).where(Document.tenant_id == tenant_id)
    if types:
        base = base.where(Document.type.in_(types))

    if PGVECTOR_AVAILABLE:
        # Native cosine_distance: 0 = identical, 2 = opposite
        stmt = base.order_by(Document.embedding.cosine_distance(q_vec)).limit(limit)
        res = await db.execute(stmt)
        return [
            {
                "id": str(d.id),
                "type": d.type,
                "title": d.title,
                "snippet": (d.content or "")[:300],
                "metadata": d.metadata_ or {},
            }
            for d in res.scalars().all()
        ]

    # Fallback: load up to 200 candidates and rank in Python
    res = await db.execute(base.limit(200))
    docs = list(res.scalars().all())
    scored: list[tuple[float, Document]] = []
    for d in docs:
        emb = d.embedding
        if not emb:
            continue
        if isinstance(emb, list):
            score = cosine(q_vec, emb)
        else:
            try:
                score = cosine(q_vec, list(emb))
            except Exception:
                continue
        scored.append((score, d))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [
        {
            "id": str(d.id),
            "type": d.type,
            "title": d.title,
            "snippet": (d.content or "")[:300],
            "score": round(score, 4),
        }
        for score, d in scored[:limit]
    ]
