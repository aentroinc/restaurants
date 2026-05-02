from typing import Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_tenant_id
from app.models.document import Document
from app.schemas.common import APIResponse

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])


class SearchRequest(BaseModel):
    query: str
    doc_types: Optional[list[str]] = None
    limit: int = 5


@router.get("/")
async def list_documents(
    doc_type: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    query = (
        select(Document.id, Document.doc_type, Document.title, Document.created_at)
        .where(Document.tenant_id == tenant_id)
    )
    if doc_type:
        query = query.where(Document.doc_type == doc_type)
    query = query.order_by(Document.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    docs = [
        {
            "id": str(r[0]),
            "doc_type": r[1],
            "title": r[2],
            "created_at": r[3].isoformat() if r[3] else None,
        }
        for r in result.all()
    ]
    return APIResponse(data=docs)


@router.get("/stats")
async def document_stats(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    result = await db.execute(
        select(Document.doc_type, func.count(Document.id))
        .where(Document.tenant_id == tenant_id)
        .group_by(Document.doc_type)
    )
    stats = {r[0]: r[1] for r in result.all()}
    total = sum(stats.values())
    return APIResponse(data={"by_type": stats, "total": total})


@router.post("/reindex")
async def reindex_documents(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    from app.services.ai.document_indexer import index_all_documents
    result = index_all_documents(str(tenant_id))
    return APIResponse(data=result)


@router.post("/search")
async def search_documents(
    body: SearchRequest,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    from app.services.ai.embedder import embed_text
    from sqlalchemy import text as sql_text

    doc_types = body.doc_types or ["meeting_note", "review", "sv_report", "playbook"]
    limit = min(body.limit, 10)
    query_vec = embed_text(body.query)

    results = await db.execute(sql_text("""
        SELECT id, doc_type, title, content,
               1 - (embedding <=> :qvec::vector) AS similarity
        FROM documents
        WHERE tenant_id = :tid AND doc_type = ANY(:types)
        ORDER BY embedding <=> :qvec::vector
        LIMIT :lim
    """), {
        "qvec": str(query_vec),
        "tid": str(tenant_id),
        "types": doc_types,
        "lim": limit,
    })

    docs = []
    for r in results:
        docs.append({
            "id": str(r.id),
            "doc_type": r.doc_type,
            "title": r.title,
            "snippet": r.content[:400],
            "similarity": round(float(r.similarity), 3),
        })

    return APIResponse(data={"query": body.query, "results": docs, "total_found": len(docs)})
