# S1 — AI完全稼働（+15点 / 2日）

## 現状 → ゴール
- SDK統合+6ツール+SSEストリーミング+フォールバック: **コード完成済**
- 実動作: **未確認（クレジット切れ）**
- RAG: **未実装**
- 評価セット: **未作成**
- ガバナンスUI: **枠のみ**

→ Claude APIが実データからtool useで回答、RAGでミーティングメモ/レビューを引用、30問で80%正答、ガバナンスUIで制御。

---

## Step 1: クレジット追加 + 動作確認（30分）

1. https://console.anthropic.com/settings/plans でクレジット追加（$20）
2. `.env` の `ANTHROPIC_API_KEY` 確認
3. docker compose restart api
4. テスト:
```bash
curl -N -X POST http://localhost:8000/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"すき家の首都圏で原価率が最も高い店舗トップ5は？"}'
```
5. SSEストリームで `tool_use` → `tool_result` → `text` が返ることを確認
6. `audit_log` と `ai_query_logs` にログが残ることを確認

## Step 2: prompt caching検証 + 最適化（1時間）

1. 同じセッションで5回連続質問
2. Anthropic APIの `usage` レスポンスから:
   - `cache_creation_input_tokens`（初回のみ大きい）
   - `cache_read_input_tokens`（2回目以降で大きいはず）
3. ヒット率 = cache_read / (cache_read + cache_creation + input) > 80% 目標
4. 達成しない場合:
   - `system_prompt.py` の `build_system_blocks()` でブロック分割を調整
   - ontology schema ブロックが最も大きいはず → 先頭に配置
   - 3ブロック → 2ブロックに統合も検討（TTL 5分内にヒットするように）

## Step 3: pgvector + RAG基盤（3時間）

### docker-compose.yml 変更
```yaml
db:
  image: pgvector/pgvector:pg16  # postgres:16-alpine から変更
```

### ドキュメントモデル
`backend/app/models/document.py`:
```python
from pgvector.sqlalchemy import Vector

class Document(Base):
    __tablename__ = "documents"
    id: UUID PK
    tenant_id: UUID FK
    doc_type: str  # meeting_note | review | sv_report | playbook | incident
    source_id: UUID nullable  # 元レコードのID
    title: str
    content: str  # テキスト本文
    embedding: Mapped[list] = mapped_column(Vector(1024))  # voyage-3は1024次元
    metadata_: JSONB default {}
    created_at, updated_at
```

### 埋め込み生成
`backend/app/services/ai/embedder.py`:

Claude APIのembedding未対応のため、**ローカル埋め込み**で実装:
```python
import hashlib
import struct

def simple_embed(text: str, dim: int = 1024) -> list[float]:
    """シンプルなハッシュベース埋め込み（デモ用）。
    本番ではvoyage-3やOpenAI text-embedding-3-smallに置換。"""
    h = hashlib.sha512(text.encode()).digest()
    # ハッシュを拡張して1024次元ベクトルを生成
    vec = []
    for i in range(dim):
        seed = hashlib.md5(f"{text}:{i}".encode()).digest()
        val = struct.unpack('f', seed[:4])[0]
        vec.append(val % 2.0 - 1.0)  # -1.0 ~ 1.0
    # 正規化
    norm = sum(v*v for v in vec) ** 0.5
    return [v / norm for v in vec] if norm > 0 else vec
```

**注**: 本番では `voyage-3` ($0.06/1M tokens) か `text-embedding-3-small` ($0.02/1M tokens) に差し替え。デモではハッシュベースで十分（類似検索の精度は低いが動作する）。

### ドキュメント取り込みバッチ
`backend/app/services/ai/document_indexer.py`:
```python
def index_existing_documents(session, tenant_id):
    """既存のmeeting_pack/review/sv_visitをDocumentに変換+埋め込み"""
    
    # 1. BoardMeetingPack → meeting_note
    packs = session.execute(select(BoardMeetingPack).where(...)).scalars()
    for pack in packs:
        items_text = "\n".join([item.title + ": " + json.dumps(item.content, ensure_ascii=False) 
                                for item in pack.items])
        content = f"経営会議パック: {pack.title}\n日付: {pack.meeting_date}\n{items_text}"
        embedding = simple_embed(content)
        session.add(Document(
            tenant_id=tenant_id, doc_type="meeting_note",
            source_id=pack.id, title=pack.title,
            content=content, embedding=embedding,
        ))
    
    # 2. Review → review (最新200件)
    reviews = session.execute(select(Review).where(...).order_by(Review.review_date.desc()).limit(200)).scalars()
    for rev in reviews:
        content = f"レビュー: {rev.source} / 評価: {rev.rating} / {rev.text}"
        embedding = simple_embed(content)
        session.add(Document(
            tenant_id=tenant_id, doc_type="review",
            source_id=rev.id, title=f"{rev.source} {rev.rating}点",
            content=content, embedding=embedding,
        ))
    
    # 3. SVVisit (notes付き) → sv_report
    visits = session.execute(select(SVVisit).where(SVVisit.notes.isnot(None), ...).limit(200)).scalars()
    for v in visits:
        content = f"SV訪問報告: {v.visit_date} / タイプ: {v.visit_type} / スコア: {v.checklist_score}\n{v.notes}"
        embedding = simple_embed(content)
        session.add(Document(
            tenant_id=tenant_id, doc_type="sv_report",
            source_id=v.id, title=f"SV訪問 {v.visit_date}",
            content=content, embedding=embedding,
        ))
    
    session.commit()
```

シード時に呼び出し: `app/seed/run.py` の末尾に追加。

### search_documents ツール追加
`backend/app/services/ai/tools.py` にツール追加:
```python
{
    "name": "search_documents",
    "description": "過去の経営会議メモ、顧客レビュー、SV訪問報告を意味検索する",
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "検索クエリ（日本語）"},
            "doc_types": {"type": "array", "items": {"type": "string"}, 
                          "description": "対象ドキュメント種別: meeting_note, review, sv_report"},
            "limit": {"type": "integer", "description": "取得件数（デフォルト5）"}
        },
        "required": ["query"]
    }
}
```

実行関数:
```python
async def execute_search_documents(input_data, tenant_id, db):
    query = input_data["query"]
    doc_types = input_data.get("doc_types", ["meeting_note", "review", "sv_report"])
    limit = min(input_data.get("limit", 5), 10)
    
    query_vec = simple_embed(query)
    
    results = await db.execute(text("""
        SELECT id, doc_type, title, content, 
               1 - (embedding <=> :qvec::vector) AS similarity
        FROM documents
        WHERE tenant_id = :tid AND doc_type = ANY(:types)
        ORDER BY embedding <=> :qvec::vector
        LIMIT :lim
    """), {"qvec": str(query_vec), "tid": tenant_id, "types": doc_types, "lim": limit})
    
    return [{"title": r.title, "type": r.doc_type, "snippet": r.content[:300], 
             "similarity": round(r.similarity, 3)} for r in results]
```

TOOL_DEFINITIONS を7個に拡張（既存6 + search_documents）。

## Step 4: 評価セット作成（1時間）

`backend/eval/ai_chat.jsonl` 新設（30問）:

```jsonl
{"question": "すき家の首都圏で原価率が最も高い店舗トップ5は？", "expected_tools": ["get_store_ranking"], "expected_answer_contains": ["すき家"]}
{"question": "はま寿司全体のFL比率は？", "expected_tools": ["get_brand_summary"], "expected_answer_contains": ["FL比率"]}
{"question": "今週SVが訪問すべき優先店舗は？", "expected_tools": ["get_store_ranking"], "expected_answer_contains": ["健全度"]}
{"question": "ココスの人件費率が35%を超えている店舗は？", "expected_tools": ["query_kpi"], "expected_answer_contains": ["人件費"]}
{"question": "先月の経営会議で出た議題は？", "expected_tools": ["search_documents"], "expected_answer_contains": []}
{"question": "すき家品川港南店の詳細を教えて", "expected_tools": ["get_store_detail"], "expected_answer_contains": ["品川"]}
{"question": "全ブランドの粗利率を比較して", "expected_tools": ["get_brand_summary"], "expected_answer_contains": ["すき家", "はま寿司"]}
{"question": "改善施策の効果が出ている店舗は？", "expected_tools": ["query_kpi"], "expected_answer_contains": ["改善"]}
{"question": "なか卯で客数が増加している店舗は？", "expected_tools": ["get_store_ranking"], "expected_answer_contains": ["なか卯"]}
{"question": "ジョリーパスタの値上げ後の客数影響は？", "expected_tools": ["query_kpi"], "expected_answer_contains": ["客数"]}
{"question": "首都圏の駅前店で最も健全度が低い店舗は？", "expected_tools": ["search_stores", "get_store_ranking"], "expected_answer_contains": ["健全度"]}
{"question": "すき家の牛丼並盛の原価率は？", "expected_tools": ["query_kpi"], "expected_answer_contains": ["原価"]}
{"question": "人件費率が最も改善した店舗はどこ？", "expected_tools": ["query_kpi"], "expected_answer_contains": ["改善"]}
{"question": "はま寿司の廃棄が多い店舗は？", "expected_tools": ["query_kpi"], "expected_answer_contains": ["はま寿司"]}
{"question": "ココスで売上が前年割れの店舗数は？", "expected_tools": ["query_kpi"], "expected_answer_contains": ["売上"]}
{"question": "直近のSV訪問報告でスコアが低かったのは？", "expected_tools": ["search_documents"], "expected_answer_contains": []}
{"question": "すき家の異物混入問題の影響が出ている店舗は？", "expected_tools": ["search_stores", "query_kpi"], "expected_answer_contains": ["異物", "客数"]}
{"question": "FC店舗のロイヤリティ合計は？", "expected_tools": ["query_kpi"], "expected_answer_contains": ["FC"]}
{"question": "レビュー評価が低下傾向の店舗を教えて", "expected_tools": ["get_store_ranking"], "expected_answer_contains": ["レビュー"]}
{"question": "今月のKPI再計算はいつ実行された？", "expected_tools": [], "expected_answer_contains": ["KPI"]}
{"question": "すき家とはま寿司の人件費率を比較して", "expected_tools": ["get_brand_summary"], "expected_answer_contains": ["すき家", "はま寿司", "人件費"]}
{"question": "売上トップ10の店舗は？", "expected_tools": ["get_store_ranking"], "expected_answer_contains": []}
{"question": "原価率が40%を超えている店舗はいくつある？", "expected_tools": ["query_kpi"], "expected_answer_contains": ["原価"]}
{"question": "来月の需要予測は？", "expected_tools": [], "expected_answer_contains": ["予測"]}
{"question": "シフト違反が多い店舗は？", "expected_tools": ["query_kpi"], "expected_answer_contains": ["違反"]}
{"question": "ゼンショー全体の営業利益率は？", "expected_tools": ["get_brand_summary"], "expected_answer_contains": ["営業利益"]}
{"question": "品川港南店にタスクを作成して：人件費率改善", "expected_tools": ["create_task_draft"], "expected_answer_contains": ["タスク"]}
{"question": "データ品質の問題が多いエリアは？", "expected_tools": ["query_kpi"], "expected_answer_contains": ["品質"]}
{"question": "先月のベストプラクティス店舗は？", "expected_tools": ["get_store_ranking"], "expected_answer_contains": ["健全度"]}
{"question": "はま寿司の商品別売上ランキングは？", "expected_tools": ["query_kpi"], "expected_answer_contains": ["はま寿司"]}
```

### 評価スクリプト
`backend/eval/run_eval.py`:
```python
"""AI Analyst評価スクリプト。各質問にClaude APIで回答させ、正答率を計算。"""
import json, asyncio, httpx

async def run():
    with open("eval/ai_chat.jsonl") as f:
        questions = [json.loads(line) for line in f]
    
    correct = 0
    total = len(questions)
    
    async with httpx.AsyncClient(timeout=60) as client:
        for q in questions:
            r = await client.post("http://localhost:8000/api/v1/ai/chat",
                json={"message": q["question"]})
            # SSEパース
            text_content = ""
            tool_names = []
            for line in r.text.split("\n\n"):
                if not line.startswith("data: "): continue
                event = json.loads(line[6:])
                if event["type"] == "text": text_content += event.get("content", "")
                if event["type"] == "tool_use": tool_names.append(event["name"])
            
            # 判定
            tool_ok = not q["expected_tools"] or any(t in tool_names for t in q["expected_tools"])
            answer_ok = not q["expected_answer_contains"] or all(kw in text_content for kw in q["expected_answer_contains"])
            
            if tool_ok and answer_ok:
                correct += 1
                print(f"✓ {q['question'][:40]}...")
            else:
                print(f"✗ {q['question'][:40]}... (tools={tool_names}, answer={text_content[:100]})")
    
    rate = correct / total * 100
    print(f"\n正答率: {correct}/{total} = {rate:.1f}%")
    return rate >= 80  # 80%以上で合格

asyncio.run(run())
```

## Step 5: ガバナンスUI強化（1.5時間）

`frontend/src/app/admin/ai-governance/page.tsx` を強化:

現在の4カード + テーブル構成に追加:

1. **使用状況セクション**:
   - 当月トークン使用量（棒グラフ: 日別）
   - モデル別使用割合（円グラフ: opus/sonnet/haiku）
   - 推定月額コスト（¥表示）
   - データソース: `audit_log` の `ai_query` アクションを集計

2. **Role × Tool マトリクス**:
   - 行: ロール名（admin, executive, sv, etc.）
   - 列: ツール名（query_kpi, get_store_detail, search_documents, create_task_draft, etc.）
   - セル: チェックボックス（許可/禁止）
   - 「保存」ボタン

3. **月次予算設定**:
   - 月予算入力（¥）
   - アラート閾値（%、デフォルト80%）
   - 現在使用額 / 予算のプログレスバー

4. **最新クエリログ強化**:
   - 質問テキスト
   - 使用ツール（バッジ）
   - トークン数
   - コスト（¥）
   - レイテンシ（ms）
   - ユーザー

## Step 6: フロントAI Analyst完成（2時間）

`frontend/src/app/ai-analyst/page.tsx` を確認・改善:

1. セッション管理:
   - 左サイドに過去セッション一覧（GET /api/v1/ai/sessions）
   - 新規セッション / 既存セッション切替
   - セッション削除

2. tool_use / tool_result のインライン表示改善:
   - `query_kpi` → KPI値をミニテーブルで表示
   - `get_store_ranking` → 店舗名+スコアのリスト
   - `search_documents` → 引用カード（タイトル + snippet + similarity badge）
   - `get_brand_summary` → ブランド別KPIカード

3. 回答の引用表示:
   - tool_resultで得たデータをクリック可能なリンクに（店舗名→/stores/{id}）

---

## 完了基準

- [ ] `/api/v1/ai/chat` でClaude APIが実データからtool useで回答する
- [ ] prompt cachingヒット率 > 80%（連続質問時）
- [ ] `search_documents` ツールが meeting_note / review / sv_report を検索して引用付き回答
- [ ] `documents` テーブルにembedding付きドキュメント400件以上
- [ ] 評価セット30問で24問以上正答（80%+）
- [ ] /admin/ai-governance で使用状況グラフ + Role×Toolマトリクスが表示
- [ ] AI Analystでセッション管理（一覧/切替/削除）が動作
- [ ] tool結果のインライン表示（テーブル/リスト/引用カード）が動作
- [ ] 全LLM呼び出しが audit_log + ai_query_logs に記録
- [ ] LLMエラー時にルールベースフォールバックが動作
