# Phase 2 / S2 — LLM 完遂（+3点 / 1週）

## 課題
S0 で `/api/v1/ai/chat` SSE が UI に配線された前提。残りは：
- **prompt caching 未実装**（毎回フルトークン課金、月額が膨らむ）
- **RAG 未実装**（meeting_notes / reviews / SV reports を引けない、根拠薄い回答）
- **AI ガバナンス UI 未実装**（role × tool 制御、月予算 cap）
- claude-opus-4-7（1M context）に switch（現在 sonnet-4-20250514 ハードコード）
- thinking mode 活用

## ゴール
- 月額コスト 70%削減（prompt caching ヒット率 90%+）
- 過去のミーティング・レビューを根拠に引いた回答を返す
- ガバナンス UI で role × tool / 月次予算 cap の制御
- 最新 model（claude-opus-4-7-1m）に switch + 軽量質問は haiku-4-5 で振り分け

---

## 仕様書

### Prompt Caching

`app/services/ai/system_prompt.py` 改修：
- システムプロンプトを 3 ブロックに分割し、`cache_control: {"type": "ephemeral"}` を付与
  1. **Ontology schema**（テナント不変）
  2. **Tools 定義**（テナント不変）
  3. **テナント context**（tenant 名・ブランド・店舗数）

```python
async def build_system_prompt(tenant_id, db) -> list[dict]:
    return [
        {
            "type": "text",
            "text": ONTOLOGY_SCHEMA_TEXT,  # 静的、最初の cache breakpoint
            "cache_control": {"type": "ephemeral"},
        },
        {
            "type": "text",
            "text": TOOL_INSTRUCTIONS_TEXT,
            "cache_control": {"type": "ephemeral"},
        },
        {
            "type": "text",
            "text": await _tenant_context_block(tenant_id, db),
            "cache_control": {"type": "ephemeral"},
        },
        {"type": "text", "text": "今日: " + today_jp()},  # 非キャッシュ
    ]
```

### Model 切替

`app/services/ai/client.py` を拡張：
```python
MODEL_MAP = {
    "deep": "claude-opus-4-7",          # 1M context、深い分析
    "default": "claude-sonnet-4-6",     # 標準
    "fast": "claude-haiku-4-5-20251001", # サマリ・proactive insight
}

def call(model_alias: str, **kwargs):
    model = MODEL_MAP[model_alias]
    return get_client().messages.create(model=model, **kwargs)
```

`/api/v1/ai/chat` リクエストに `model_tier: "deep"|"default"|"fast"` を受ける（default: "default"）。
- `requires_tools=True` の場合は `default` 以上
- `proactive_summary=True` のときは `fast`

### Thinking Mode

複雑なクエリ（forecast / 多段 tool 呼び出し）には `thinking: {"type": "enabled", "budget_tokens": 8000}`。
判定ヒューリスティック：tool call が 3回以上必要そうなクエリは `deep + thinking`。

### RAG（pgvector）

#### モデル
```python
class Document(Base):
    __tablename__ = "documents"
    id, tenant_id
    type: Mapped[str]                        # meeting_note | review | sv_report | playbook
    source_id: Mapped[UUID | None]            # 元レコード参照
    title: Mapped[str]
    content: Mapped[str]
    embedding: Mapped[list[float]] = mapped_column(Vector(1024))
    metadata: Mapped[dict] = mapped_column(JSONB)
    created_at, updated_at
    
    __table_args__ = (
        Index("ix_doc_embedding", "embedding", postgresql_using="ivfflat",
              postgresql_ops={"embedding": "vector_cosine_ops"},
              postgresql_with={"lists": 100}),
    )
```

PostgreSQL に `CREATE EXTENSION vector` 必要。docker-compose の image を `pgvector/pgvector:pg16` に変更。

#### Embedder
`app/services/ai/embedder.py`：
```python
import voyageai
client = voyageai.AsyncClient(api_key=settings.VOYAGE_API_KEY)

async def embed(texts: list[str]) -> list[list[float]]:
    res = await client.embed(texts, model="voyage-3", input_type="document")
    return res.embeddings
```

`voyage-3` は 1024 次元、多言語対応（日本語精度良）、$0.06/1M tokens。

#### Tool 追加
`tools/search_documents.py`：
```python
async def execute(input_, tenant_id, db):
    query = input_["query"]
    types_filter = input_.get("types", ["meeting_note", "review", "sv_report"])
    k = input_.get("k", 5)
    
    qvec = (await embed([query]))[0]
    
    sql = """
    SELECT id, type, title, content, metadata,
           1 - (embedding <=> :qvec::vector) AS similarity
    FROM documents
    WHERE tenant_id = :tenant_id AND type = ANY(:types)
    ORDER BY embedding <=> :qvec::vector
    LIMIT :k
    """
    rows = await db.execute(text(sql), {"qvec": qvec, "tenant_id": tenant_id, "types": types_filter, "k": k})
    return [{"id": r.id, "type": r.type, "title": r.title, "snippet": r.content[:300], "similarity": r.similarity} for r in rows]
```

`TOOL_DEFINITIONS` に追加：
```python
{
    "name": "search_documents",
    "description": "Semantic search over meeting notes, customer reviews, SV reports for context.",
    "input_schema": {...},
}
```

#### 取り込みパイプライン

`app/services/ai/document_indexer.py`：
- daily batch（APScheduler の 4:00 JST）で：
  - 新規 meeting_pack → meeting_note として embed
  - 新規 reviews → embed
  - 新規 sv_visit (notes 付き) → embed
- PII redaction を embed 前に適用（regex で電話・メール・氏名候補をマスク）

### AI ガバナンス

#### モデル
```python
class AIGovernancePolicy(Base):
    id, tenant_id
    role_id (fk)
    tool_name: Mapped[str]
    allowed: Mapped[bool]
    
class AIBudget(Base):
    id, tenant_id
    period_year, period_month
    monthly_limit_jpy: Mapped[int]
    used_jpy: Mapped[int]
    alert_at_pct: Mapped[int]                # 80
```

#### ガバナンス middleware
`/api/v1/ai/chat` の前段に：
1. user → roles → AIGovernancePolicy で許可されてない tool を tool_use から除外
2. AIBudget の月次使用額をチェック、超過なら 429
3. tool 呼出ごとに cost 計算・budget に加算（input/output token × model 単価）

#### UI
`frontend/src/app/admin/ai-governance/page.tsx` を強化：
- Role × Tool マトリクスのチェックボックス
- 月予算入力 + アラート閾値
- 当月 usage の進捗バー（tenant / role / model 別）
- 過去30日の query log（質問・tool calls・cost）

---

## 指示書（実装手順）

### Step 1: モデル切替 + caching（半日）
1. `MODEL_MAP` 実装、`/chat` リクエストに `model_tier`
2. system_prompt を 3 ブロック分割 + cache_control
3. Anthropic SDK の response.usage に `cache_creation_input_tokens` / `cache_read_input_tokens` を audit log へ
4. /admin/audit に「キャッシュヒット率」を表示

### Step 2: pgvector 準備（半日）
1. docker-compose の postgres image を `pgvector/pgvector:pg16` に
2. Alembic で `CREATE EXTENSION vector;` + documents テーブル + ivfflat index
3. `voyageai` 追加

### Step 3: Embedder + RAG tool（1日）
1. `embedder.py` 実装
2. `tools/search_documents.py` 実装
3. TOOL_DEFINITIONS に追加（系9個になる）
4. PII redaction（regex + simple LLM judge optional）

### Step 4: 取り込みパイプライン（1日）
1. `document_indexer.py` 実装
2. APScheduler に登録（02 のスケジューラに追加）
3. 既存の meeting_packs / reviews / sv_visits を初回バッチで全 embed
4. tenant 別の rate limit（voyage の API 制限考慮）

### Step 5: ガバナンス（1.5日）
1. AIGovernancePolicy / AIBudget モデル + Alembic
2. /chat の middleware 実装：tools フィルタリング + budget チェック
3. cost 計算ヘルパ：`compute_cost(model, usage)`
4. /admin/ai-governance UI 改修
5. seed: 全 role × 全 tool のデフォルト policy（admin: all true、その他: read系のみ）

### Step 6: 評価セット（半日）
1. `eval/ai_chat.jsonl` 30問作成（既存ドメインから抽出）
2. CI workflow に評価ジョブ追加（Anthropic key を secret に）
3. 80%以上正答が gate 条件

---

## 完了基準

- [ ] /api/v1/ai/chat のレスポンスで `cache_read_input_tokens / total_input_tokens > 0.85`（5回続けて）
- [ ] documents テーブルに meeting_pack / review / sv_visit が embedding 付きで投入されている
- [ ] AI Analyst で「先月の SV 訪問で出た議題は？」と聞くと、search_documents が呼ばれて引用付き回答
- [ ] /admin/ai-governance で role × tool 制御 → 該当 tool が tool_use から実際に除外される
- [ ] 月予算 80% 到達時に warning bar、超過で 429
- [ ] eval set で 24/30 以上正答
- [ ] thinking mode が複雑クエリで自動 enable される
- [ ] model_tier の振り分けが動作（deep/default/fast）

## 工数見積
- Step 1-2: 1日
- Step 3-4: 2日
- Step 5: 1.5日
- Step 6: 半日
- **合計: 5日（1週）**

## 増点内訳
- 03 LLM：caching + RAG + governance + model 切替 で **+3**
- = **+3点**

## 注意
- voyage-3 の月コスト見積：1テナントあたり ~10万ドキュメント × 平均500トークン = 5M tokens × $0.06 = $0.30/月。微々たるもの
- prompt caching の TTL は 5分。連続会話内では確実にヒット、新規セッションは miss
- pgvector の ivfflat index は SET LOCAL ivfflat.probes = 10 で recall 上げる
