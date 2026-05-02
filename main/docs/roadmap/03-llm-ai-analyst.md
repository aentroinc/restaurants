# 03 — LLM 統合 AI Analyst（+8点）

## 課題
`frontend/src/components/ai-panel.tsx` は静的な `aiInsights` 配列を表示しているだけ。`/ai-analyst` ページも mock。**LLM が実際にオントロジー / KPI / 店舗データを参照して動く** 形に変える。

## ゴール
- claude-opus-4-7（1M コンテキスト）統合
- Tool use で ontology query / KPI lookup / store details / forecast を Claude が呼べる
- pgvector で過去のミーティングメモ・review・SV 報告書 RAG
- 全 prompt に prompt caching（コスト削減）
- 全 LLM 呼び出しが `audit_log` + `ai_governance` に記録される

---

## 仕様書

### 構成図

```
User (frontend)
  ↓  POST /api/v1/ai/chat (SSE)
FastAPI
  ↓  Anthropic SDK (claude-opus-4-7-1m)
  ↓  with tools = [query_kpi, get_store_360, search_documents, run_forecast, ...]
  ↓  with system = ontology schema + tenant context (cached)
  ↓
[Tool execution loop]
  ├─ query_kpi → services/kpi_engine
  ├─ get_store_360 → api/v1/stores/{id}
  ├─ search_documents → pgvector (meeting notes, reviews, SV reports)
  ├─ run_forecast → services/forecasting (新設)
  └─ generate_chart → Vega-Lite spec
  ↓
Streaming response → frontend
```

### モデル / 設定
- 既定: `claude-opus-4-7` (1M context)
- 安価モード: `claude-haiku-4-5-20251001`（store360 のサマリ生成等）
- prompt caching: system prompt（ontology schema）+ tools 定義 を `cache_control: {"type": "ephemeral"}`
- thinking: 重い分析（forecast / 複雑なKPI）は `thinking.budget_tokens=8000`

### Tool 定義（Claude が呼ぶ関数）

```python
TOOLS = [
    {
        "name": "query_kpi",
        "description": "Query KPI values for stores/brands/regions over time periods",
        "input_schema": {
            "type": "object",
            "properties": {
                "kpi_name": {"type": "string", "description": "e.g. gross_margin, customer_count, avg_ticket"},
                "scope": {"type": "object", "properties": {
                    "store_ids": {"type": "array", "items": {"type": "string"}},
                    "brand_id": {"type": "string"},
                    "region": {"type": "string"},
                }},
                "period": {"type": "object", "properties": {
                    "from": {"type": "string", "format": "date"},
                    "to": {"type": "string", "format": "date"},
                    "granularity": {"enum": ["daily", "weekly", "monthly"]}
                }},
            },
            "required": ["kpi_name", "scope", "period"]
        }
    },
    {
        "name": "get_store_360",
        "description": "Get full store profile including KPIs, recent incidents, SV visits",
        ...
    },
    {
        "name": "search_documents",
        "description": "Semantic search over meeting notes, customer reviews, SV reports",
        ...
    },
    {
        "name": "run_forecast",
        "description": "Run demand or sales forecast for a store/product",
        ...
    },
    {
        "name": "list_ontology_objects",
        "description": "List object types and their properties to understand the data model",
        ...
    },
    {
        "name": "create_action",
        "description": "Create a workflow action (e.g. SV mission). Requires user approval.",
        ...
    },
]
```

### システムプロンプト構造

```
[CACHED BLOCK 1 — ontology schema]
あなたは外食チェーン経営支援AI。利用可能なオブジェクト型:
- Store: 店舗。プロパティ: store_id, brand, region, ...
- Product: 商品。プロパティ: ...
[全 ontology を JSON で展開]

[CACHED BLOCK 2 — tool 定義]
[TOOLS JSON]

[CACHED BLOCK 3 — テナント文脈]
テナント: {tenant.name}
ブランド: {brands}
店舗数: {store_count}
今日: {today}

[非キャッシュ部分]
ユーザーの質問: {user_message}
会話履歴: {recent_messages}
```

### RAG（pgvector）

```python
class Document(Base):
    __tablename__ = "documents"
    id, tenant_id
    type: Mapped[str]  # meeting_note | review | sv_report | playbook
    source_id: Mapped[UUID | None]  # link to original record
    title, content
    embedding: Mapped[list[float]] = mapped_column(Vector(1536))
    metadata: Mapped[dict] = mapped_column(JSONB)
    created_at

# Index: ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
```

埋め込みモデル: `voyage-3` or OpenAI `text-embedding-3-small`（多言語対応 + 日本語精度）

### API

```
POST /api/v1/ai/chat
Content-Type: application/json
Body: {
  "session_id": "uuid",
  "message": "首都圏の駅前店で粗利率が落ちてる店トップ5を教えて",
  "context": {"store_id": "...", "page": "/stores/123"}  # オプション
}
Response: text/event-stream
  data: {"type": "thinking", "content": "..."}
  data: {"type": "tool_use", "name": "query_kpi", "input": {...}}
  data: {"type": "tool_result", "name": "query_kpi", "output": {...}}
  data: {"type": "text", "content": "首都圏駅前で..."}
  data: {"type": "citation", "source_type": "kpi", "ref": "..."}
  data: {"type": "done", "total_tokens": 12345, "cost_usd": 0.034}

GET  /api/v1/ai/sessions
GET  /api/v1/ai/sessions/{id}
DELETE /api/v1/ai/sessions/{id}

POST /api/v1/ai/feedback             # thumbs up/down
GET  /api/v1/ai/audit                # admin: 全 LLM call の log
```

### AI ガバナンス
既存 `app/api/v1/admin.py` の AI Governance を拡張：

- Per-role の tool 使用許可（営業ロールは create_action 禁止 等）
- Per-tenant の月間予算 cap（超えたら拒否）
- PII redaction：Document に PII が含まれる場合は埋め込み生成前にマスキング
- Refusal logs：Claude が拒否した場合の記録 + retraining 候補

### UI
`frontend/src/app/ai-analyst/page.tsx` を全面改修：

- ChatGPT 風 UI、左にセッション履歴
- メッセージに tool call / citation を inline 表示
- Claude が KPI を返したら recharts のチャートをinline 描画
- 「アクションを作成」ボタン → workflow 連携
- ストリーミングは SSE で受信

`frontend/src/components/ai-panel.tsx`（サイドパネル）：
- 現在のページ context を Claude に送る（store_id, current filter）
- 短い洞察を proactive に出す（haiku で安く）

---

## 指示書（実装手順）

### Step 1: 依存追加
```bash
cd main/backend
echo "anthropic>=0.40.0" >> requirements.txt
echo "pgvector>=0.3.0" >> requirements.txt
echo "voyageai>=0.2.0" >> requirements.txt
pip install -r requirements.txt
```
- `ANTHROPIC_API_KEY`、`VOYAGE_API_KEY` を `.env` に追加

### Step 2: pgvector セットアップ
1. Docker compose の postgres image を `pgvector/pgvector:pg16` に変更
2. `alembic revision -m "documents and embeddings"`：
   - `CREATE EXTENSION vector`
   - documents テーブル作成
   - ivfflat index

### Step 3: Anthropic SDK ラッパー
1. `app/services/ai/client.py`：
   - `AnthropicClient` シングルトン
   - prompt caching の cache_control を都度組み立てる helper
   - cost tracking（response の usage を audit に記録）
2. `app/services/ai/system_prompt.py`：
   - `build_system_prompt(tenant_id) -> list[ContentBlock]`
   - ontology schema を dynamic に組み立て（01 と連携）

### Step 4: Tool 実装
1. `app/services/ai/tools/__init__.py` に dispatcher
2. 各 tool は別ファイル：`tools/query_kpi.py` 等
3. tool の execute は同期 / 非同期両対応
4. tool 実行時に `audit_log` 必須

### Step 5: チャットエンドポイント
1. `app/api/v1/ai_chat.py` 新設（既存 `ai.py` から分離）
2. SSE で stream
3. tool use loop は最大 10 iteration、超えたら abort
4. session は `ai_sessions` テーブルに保存

### Step 6: RAG 取り込み
1. `app/services/ai/embedder.py`：voyage-3 ラッパー
2. background job で documents を毎日埋め込み更新
3. `tools/search_documents.py` で `cosine_distance` 検索

### Step 7: ガバナンス
1. `app/services/ai/governance.py`：
   - role × tool の matrix を DB から
   - tenant 月次予算チェック（usage_log を集計）
   - PII redaction（regex + LLM judge）
2. middleware として chat endpoint の前段で評価

### Step 8: フロントエンド
1. `frontend/src/lib/api/ai.ts`：SSE client
2. `frontend/src/app/ai-analyst/page.tsx` 全面改修
3. `frontend/src/components/ai-panel.tsx` を context-aware に
4. tool result の inline rendering（chart / table / citation）

### Step 9: 評価・改善
1. `eval/ai_analyst.jsonl`：30問の評価データセット作成
   - 「先月の粗利率トップ5店舗は？」等
   - expected: tool_calls / final_answer の構造
2. CI で eval が通るか自動チェック
3. ヒット率 / 幻覚率を週次でレポート

---

## 完了基準
- [x] `/api/v1/ai/chat` が SSE で応答し、LLM未設定時もルールベースfallbackで回答する
- [x] frontend の AI Analyst でストリーミングチャットが動作
- [x] tool use / tool result を frontend の回答内に表示できる
- [x] 商品粗利、労務法令、QSC、HACCP の外食ドメイン tool が定義されている
- [ ] `/api/v1/ai/chat` に「首都圏 駅前 粗利率トップ5」と聞いたら、query_kpi を呼んで実DBから集計し、citation 付きで回答する
- [ ] prompt caching で 90%+ のシステムプロンプトトークンがキャッシュヒット
- [ ] documents テーブルに meeting_note / review が embedding 付きで投入されている
- [ ] AI ガバナンス UI から role × tool の制御ができる
- [ ] 月次予算超過で 429 が返る
- [ ] 全 LLM 呼び出しが `audit_log` + `ai_call_log` に記録されている
- [ ] eval set 30問のうち 24問以上で正答（80%）

## 2026-05-02 実装メモ
- `frontend/src/app/ai-analyst/page.tsx`: `NEXT_PUBLIC_API_URL` がある場合は `/api/v1/ai/chat` に直接POSTし、SSEの text / tool_use / tool_result を表示。未設定または失敗時は既存 `/api/v1/ai/query` にfallback
- `app/services/ai/tools.py`: `get_product_margin_outliers`, `get_labor_compliance_summary`, `get_qsc_summary`, `get_haccp_summary` を追加

## 工数見積
- Step 1-2: 1日
- Step 3-5 (LLM core): 6日
- Step 6 (RAG): 3日
- Step 7 (ガバナンス): 3日
- Step 8 (UI): 4日
- Step 9 (eval): 2日
- **合計: 約 3〜4週間（1人）**

## 注意
- prompt caching の TTL は 5分。チャット中の連続リクエストは確実にヒット、新規セッションは miss
- claude-opus-4-7 の 1M context を活かして「全店舗の月次データ」をシステムにブロック化する手もあるが、トークン消費が膨大。RAG で必要分だけが王道
