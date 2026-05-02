# S8 — RAG + ドキュメント検索（+5点 / 2日）

## 現状 → ゴール
AIが使えるツールは6個（KPI/店舗/ランキング/検索/ブランド/タスク作成）。**過去の経営会議メモ・顧客レビュー・SV訪問報告を引用した根拠付き回答ができない。**

→ pgvectorでドキュメント埋め込み + `search_documents` ツールで、「先月の経営会議で出た論点は？」「すき家のレビュー傾向は？」に引用付き回答。

---

## Step 1: pgvector対応PostgreSQL（30分）

`docker-compose.yml` と `docker-compose.prod.yml` のdb imageを変更:
```yaml
db:
  image: pgvector/pgvector:pg16  # postgres:16-alpine から変更
```

起動後に拡張機能を有効化:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

seed/run.py の冒頭で実行:
```python
session.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
session.commit()
```

## Step 2: Documentモデル（30分）

`backend/app/models/document.py`:
```python
import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from pgvector.sqlalchemy import Vector
from app.database import Base

class Document(Base):
    __tablename__ = "documents"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    doc_type: Mapped[str] = mapped_column(String, nullable=False)  # meeting_note | review | sv_report | playbook
    source_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list] = mapped_column(Vector(1024), nullable=True)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

`__init__.py` に追加。

**依存**: `pip install pgvector` → requirements.txt に追加。

## Step 3: 埋め込み生成器（1時間）

`backend/app/services/ai/embedder.py`:

LLM API不要のハッシュベース埋め込み（デモ用）:
```python
import hashlib
import struct
import math

def embed_text(text: str, dim: int = 1024) -> list[float]:
    """テキストから決定的な埋め込みベクトルを生成。
    
    本番では voyage-3 や text-embedding-3-small に差替え。
    デモでは以下のハッシュベース方式で「似た文章が似たベクトルを返す」を近似。
    
    方式: テキストをbi-gramに分解、各bi-gramのハッシュを次元に分配、正規化。
    """
    # bi-gram生成
    tokens = set()
    for i in range(len(text) - 1):
        tokens.add(text[i:i+2])
    # 単語レベルも追加
    for word in text.split():
        tokens.add(word[:4])  # 先頭4文字
    
    vec = [0.0] * dim
    for token in tokens:
        h = hashlib.md5(token.encode()).hexdigest()
        for j in range(0, min(len(h), 8), 2):
            idx = int(h[j:j+2], 16) % dim
            val = int(h[j+2:j+4] if j+4 <= len(h) else h[:2], 16) / 255.0 - 0.5
            vec[idx] += val
    
    # L2正規化
    norm = math.sqrt(sum(v*v for v in vec))
    if norm > 0:
        vec = [v / norm for v in vec]
    
    return vec
```

**利点**: 外部API不要、決定的（同じテキスト→同じベクトル）、日本語対応（bi-gram）。
**欠点**: 意味的類似性は低い。だがデモでは「同じ単語を含む文書が近い」程度で十分。

## Step 4: ドキュメント取り込みバッチ（2時間）

`backend/app/services/ai/document_indexer.py`:
```python
from app.database import SyncSession
from app.models.document import Document
from app.models.meeting_pack import BoardMeetingPack, BoardMeetingItem
from app.models.review import Review
from app.models.sv_visit import SVVisit
from app.services.ai.embedder import embed_text
from sqlalchemy import select, and_
import json

def index_all_documents(tenant_id: str):
    """既存のmeeting_pack / review / sv_visit をDocument化 + 埋め込み。"""
    session = SyncSession()
    try:
        # 既存ドキュメントを削除（再インデックス）
        session.execute(
            Document.__table__.delete().where(Document.tenant_id == tenant_id)
        )
        session.commit()
        
        count = 0
        
        # 1. Meeting Packs → meeting_note
        packs = session.execute(
            select(BoardMeetingPack).where(BoardMeetingPack.tenant_id == tenant_id)
        ).scalars().all()
        
        for pack in packs:
            items = session.execute(
                select(BoardMeetingItem).where(BoardMeetingItem.pack_id == pack.id)
            ).scalars().all()
            
            items_text = "\n".join([
                f"- {item.title}: {json.dumps(item.content, ensure_ascii=False)[:200]}"
                for item in items
            ])
            content = f"経営会議パック「{pack.title}」\n日付: {pack.meeting_date}\nステータス: {pack.status}\n\n議題:\n{items_text}"
            
            doc = Document(
                tenant_id=tenant_id,
                doc_type="meeting_note",
                source_id=pack.id,
                title=f"経営会議 {pack.meeting_date}: {pack.title}",
                content=content,
                embedding=embed_text(content),
                metadata_={"meeting_date": str(pack.meeting_date), "item_count": len(items)},
            )
            session.add(doc)
            count += 1
        
        # 2. Reviews → review（最新500件）
        reviews = session.execute(
            select(Review).where(Review.tenant_id == tenant_id)
            .order_by(Review.review_date.desc()).limit(500)
        ).scalars().all()
        
        for rev in reviews:
            content = f"レビュー ({rev.source})\n評価: {rev.rating}/5.0\n日付: {rev.review_date}\n\n{rev.text or '（テキストなし）'}"
            
            doc = Document(
                tenant_id=tenant_id,
                doc_type="review",
                source_id=rev.id,
                title=f"{rev.source} {rev.rating}点 ({rev.review_date})",
                content=content,
                embedding=embed_text(content),
                metadata_={"source": rev.source, "rating": float(rev.rating or 0), "store_id": str(rev.store_id)},
            )
            session.add(doc)
            count += 1
        
        # 3. SV Visits → sv_report（notes付きのもの）
        visits = session.execute(
            select(SVVisit).where(
                and_(SVVisit.tenant_id == tenant_id, SVVisit.notes.isnot(None))
            ).order_by(SVVisit.visit_date.desc()).limit(300)
        ).scalars().all()
        
        for v in visits:
            content = f"SV訪問報告\n日付: {v.visit_date}\nタイプ: {v.visit_type}\nチェックリストスコア: {v.checklist_score}\n\n{v.notes}"
            
            doc = Document(
                tenant_id=tenant_id,
                doc_type="sv_report",
                source_id=v.id,
                title=f"SV訪問 {v.visit_date} ({v.visit_type})",
                content=content,
                embedding=embed_text(content),
                metadata_={"visit_type": v.visit_type, "score": float(v.checklist_score or 0), "store_id": str(v.store_id)},
            )
            session.add(doc)
            count += 1
        
        # 4. Industry Playbooks → playbook
        from app.models.industry_playbook import IndustryPlaybook
        playbooks = session.execute(
            select(IndustryPlaybook).where(IndustryPlaybook.tenant_id == tenant_id)
        ).scalars().all()
        
        for pb in playbooks:
            content = f"業態プレイブック: {pb.name}\n業態: {pb.service_model}\n\nKPI定義: {json.dumps(pb.kpi_definitions, ensure_ascii=False)}\n課題ルール: {json.dumps(pb.issue_rules, ensure_ascii=False)}\n推奨アクション: {json.dumps(pb.recommended_actions, ensure_ascii=False)}"
            
            doc = Document(
                tenant_id=tenant_id,
                doc_type="playbook",
                source_id=pb.id,
                title=f"プレイブック: {pb.name}",
                content=content,
                embedding=embed_text(content),
                metadata_={"service_model": pb.service_model},
            )
            session.add(doc)
            count += 1
        
        session.commit()
        return {"indexed": count}
    
    finally:
        session.close()
```

### シードに組込み
`app/seed/run.py` の末尾に:
```python
print("Indexing documents for RAG...")
from app.services.ai.document_indexer import index_all_documents
result = index_all_documents(str(TENANT_ID))
print(f"  {result['indexed']} documents indexed.")
```

## Step 5: search_documents ツール実装（1時間）

`backend/app/services/ai/tools.py` に追加:

```python
SEARCH_DOCUMENTS_TOOL = {
    "name": "search_documents",
    "description": "過去の経営会議メモ、顧客レビュー、SV訪問報告、業態プレイブックを意味検索する。質問に関連する文書を引用として取得する。",
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "検索クエリ（日本語）。例: 「異物混入 対応」「人件費 改善 事例」"},
            "doc_types": {
                "type": "array", 
                "items": {"type": "string", "enum": ["meeting_note", "review", "sv_report", "playbook"]},
                "description": "検索対象の文書種別。省略時は全種別"
            },
            "limit": {"type": "integer", "description": "取得件数（デフォルト5、最大10）"}
        },
        "required": ["query"]
    }
}

async def execute_search_documents(input_data, tenant_id, db):
    query_text = input_data["query"]
    doc_types = input_data.get("doc_types", ["meeting_note", "review", "sv_report", "playbook"])
    limit = min(input_data.get("limit", 5), 10)
    
    from app.services.ai.embedder import embed_text
    query_vec = embed_text(query_text)
    
    # pgvector cosine distance search
    from sqlalchemy import text as sql_text
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
        "lim": limit
    })
    
    docs = []
    for r in results:
        docs.append({
            "title": r.title,
            "type": r.doc_type,
            "type_label": {"meeting_note": "経営会議", "review": "レビュー", "sv_report": "SV報告", "playbook": "プレイブック"}.get(r.doc_type, r.doc_type),
            "snippet": r.content[:400],
            "similarity": round(float(r.similarity), 3),
        })
    
    return {
        "query": query_text,
        "results": docs,
        "total_found": len(docs),
    }
```

TOOL_DEFINITIONSに追加（7個目）。
execute_tool ディスパッチャにも追加。

## Step 6: フロントのtool_result表示改善（1時間）

`frontend/src/app/ai-analyst/page.tsx` で `search_documents` の結果を表示:

```tsx
// tool_result が search_documents の場合
if (event.name === "search_documents") {
  return (
    <div className="space-y-2 my-2">
      <div className="text-xs text-white/40">📚 {event.output.total_found}件の関連ドキュメント</div>
      {event.output.results.map((doc, i) => (
        <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px]">{doc.type_label}</Badge>
            <span className="text-sm text-white/70 font-medium">{doc.title}</span>
            <span className="text-[10px] text-white/30 ml-auto">類似度: {(doc.similarity * 100).toFixed(0)}%</span>
          </div>
          <p className="text-xs text-white/50 line-clamp-3">{doc.snippet}</p>
        </div>
      ))}
    </div>
  );
}
```

## Step 7: ドキュメント管理API（1時間）

`backend/app/api/v1/documents.py` 新設:
```python
router = APIRouter(prefix="/api/v1/documents", tags=["documents"])

@router.get("/")
async def list_documents(doc_type: str = None, limit: int = 50, db, tenant_id):
    """ドキュメント一覧"""

@router.get("/stats")
async def document_stats(db, tenant_id):
    """ドキュメント統計: 種別ごとの件数"""

@router.post("/reindex")
async def reindex_documents(db, tenant_id):
    """全ドキュメントを再インデックス"""
    from app.services.ai.document_indexer import index_all_documents
    result = index_all_documents(str(tenant_id))
    return APIResponse(data=result)

@router.post("/search")
async def search_documents(query: str, doc_types: list[str] = None, limit: int = 5, db, tenant_id):
    """ドキュメント検索（テスト用）"""
```

main.pyに登録。

---

## 完了基準

- [ ] `documents` テーブルに embedding付きドキュメント 500件以上
- [ ] `/api/v1/documents/stats` で種別ごとの件数が表示
- [ ] `/api/v1/documents/search` で「異物混入」検索 → 関連レビュー/会議メモが返る
- [ ] AI Analystで「先月のSV訪問で出た議題は？」→ `search_documents` が呼ばれ、引用付き回答
- [ ] AI Analystで「すき家のレビュー傾向は？」→ レビューが引用される
- [ ] tool_resultの search_documents が引用カード形式でUI表示
- [ ] pgvector拡張がPostgreSQLで有効
- [ ] `/api/v1/documents/reindex` で再インデックスが動作
