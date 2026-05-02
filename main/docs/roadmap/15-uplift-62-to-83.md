# 15 — 62 → 83 点 アップリフト計画（顧客データ非依存）

> 顧客本番接続・SOC2 監査・パイロット完走など外部依存を必要としない範囲で、製品を **62 → 83 点** に押し上げるための実行計画 + 仕様書。
> 13 タスクを Tier 1-3 に分類し、6 ヶ月で wall-clock 完了する。

---

## 1. ゴールとスコープ

### 1.1 達成目標
| 軸 | 現在 | 目標 |
|---|------|------|
| 総合スコア | 62 / 100 | **83 / 100** |
| 製品コア | 24 / 56 | **42 / 56** |
| 横断品質 | 6 / 12 | **9 / 12** |
| 期間 | – | **6 ヶ月**（並列実行で wall-clock） |
| エンジニア工数 | – | **約 22 人月** |

### 1.2 スコープ外（顧客 / 監査が来てから）
- 02 顧客本番 OAuth / 30 日稼働 (+5)
- 07 パイロット 8 週完走 (+5)
- 11 SOC2 Type 1+ / Pマーク / ISMS (+2)
- 03 顧客 DAU 30%+ (+1)
- 04 顧客 50+ analysis (+1)
- 09 30 日連続 prod SLO (+1)
- 08 業界団体連携 (+1)
- 01 顧客 30+ ontology (+1)

合計 **17 点** = 顧客 11 + 監査 4 + 業界連携 2

### 1.3 アップリフト完了の定義
- 全 13 タスクの「完了基準」が満たされる
- `evidence/` ディレクトリに 13 タスク分の証拠（demo 動画 / test pass / scan report）が整備される
- `SCORE.md` v4 で 83 点が外部 advisor によりサインオフ

---

## 2. クリティカルパス

```
[T1.B 動的onto Brand移行] ──┐
                              │
[T1.A Workspace export]────┐  ├──> [T3.D ontology version migration E2E]
                            │ │
[T1.C Governance UI]────────┤ │
                            │ │
[T1.D Container scan CI]────┘ │
                              │
                  ┌───────────┘
                  ▼
[T2.A OIDC SSO + MFA]─────┐
                            │
[T2.B Terraform + Helm + OTel]─┐
                                ├──> [T3.C 5万店舗 load test]
[T2.D 第2 connector + Webhook]──┘
                              │
[T2.C prompt caching + RAG]───┐
                                ├──> [T3.E live eval 80%+]
[T3.A Phase B (BOM/HACCP)]────┐
                                │
[T3.B Phase C (QSC/Huff/弾力性)]
```

クリティカルパス: **T1.B → T3.D**（onto 移行 → version migration テスト）が一番長い直列。
ボトルネック: **T2.A SSO**（エンプラ商談に直結 / 単独で 5 週かかる）。

---

## 3. Tier 1（+7 点 / 1 ヶ月 / 並列 4 人）

### T1.A 04 ワークスペース: export + promotion + Meeting Pack 統合（+3）

**現状（4 点）**
- DSL safe-eval 完成、cohort builder 動作、analysis runner 完成
- /workspace UI で formula preview + cohort 実行は可能
- **しかし**: export 0、Custom KPI promotion UI 0、Meeting Pack 連携 0

**完了状態（7 点）**
- Analysis 結果を CSV / Parquet / xlsx で export
- Custom KPI を `kpi_definitions` registry に昇格、既存 dashboard で参照可能
- Meeting Pack に Analysis panel を埋め込み、自動更新

**仕様**

#### export 機能
新規: `app/services/exporters.py`
```python
async def export_analysis_csv(db, tenant_id, analysis_id) -> bytes
async def export_analysis_parquet(db, tenant_id, analysis_id) -> bytes  # pyarrow
async def export_analysis_xlsx(db, tenant_id, analysis_id) -> bytes      # openpyxl
```

新規 endpoint: `POST /api/v1/workspace-engine/export?format=csv|parquet|xlsx`
- 1000 行上限、超過時 streaming
- audit log に `export` action 記録

requirements.txt: `pyarrow>=14.0.0`、`openpyxl>=3.1.2`

#### promotion UI 完成
既存 backend `/api/v1/workspace-engine/promote-kpi` は実装済。
新規 frontend: `/workspace` ページに "Custom KPI 一覧 → 昇格" ボタン追加。
- 一覧: `GET /api/v1/workspace/custom-kpis` （既存）
- 昇格: `POST /api/v1/workspace-engine/promote-kpi` （既存）

#### Meeting Pack 統合
新規モデル拡張: `BoardMeetingItem` に `analysis_id` カラム追加（マイグレーション 0003）

新規 endpoint: `POST /api/v1/meeting-packs/{pack_id}/items/from-analysis`
入力: `{analysis_id, panel_id, refresh_policy: "static"|"weekly"|"monthly"}`

新規 service: `app/services/meeting_pack_renderer.py`
- 静的: 作成時に panel 結果を保存
- 動的: 表示時に re-run、cache 1日

UI: Meeting Pack 詳細ページに "Analysis から追加" モーダル

**完了基準（Evidence）**
- [ ] CSV / Parquet / xlsx 各 format で 1000 行 export が成功（golden test）
- [ ] Custom KPI を昇格 → `KPIDefinition` row に `source='promoted_from_custom_kpi'` が立つ
- [ ] Meeting Pack に Analysis を埋め込み → 翌週同じ pack を開いたら最新値が出る（動的）
- [ ] /workspace UI と /meeting-packs/[id] UI の動作録画（Loom 30秒）

**工数**: 2 週 / 1 人

---

### T1.B 01 動的オントロジー: Brand → ontology_instances 完全移行（+2）

**現状（5 点）**
- ontology_v2 のモデル + API + service 一式実装済
- **しかし**: 既存の Brand エンティティは旧 ORM テーブルのまま、ontology_instances には未登録

**完了状態（7 点）**
- Brand が ontology_instances ベースで運用可能
- v1 Brand テーブルは read-only、v2 instance が write 主
- 影響範囲レポート UI（impact analyzer）で property 削除時の依存関係が見える

**仕様**

#### 移行スクリプト
新規: `app/scripts/migrate_brand_to_ontology.py`
```python
async def migrate(db, tenant_id):
    # 1. Brand ObjectType (api_name="Brand") を v2 で作成 / 取得
    # 2. 標準 PropertyType を seed: name(string) / category(enum) / parent_company_id(uuid)
    # 3. 各 Brand row を OntologyInstance に複製
    # 4. dual_write: Brand 書込み時に instance も同期
```

#### Dual-write hook
`app/services/ontology_dual_write.py`:
- SQLAlchemy event hook: `after_insert` / `after_update` on Brand
- 同 tx で OntologyInstance に upsert
- 失敗時は warning ログ（block しない）

#### Impact Analyzer UI
既存 backend `services/ontology_engine.compute_impact` を拡張：
- 戻り値: `{kpi_definitions: [...], ai_tools: [...], dashboards: [...], lineage_edges: [...]}`

新規 frontend: `/admin/ontology` ページに property クリック時のサイドパネル
- 影響を受ける KPI 定義 / AI tool / Lineage edge を表示
- 削除時は modal で confirm + impact 表示

**完了基準（Evidence）**
- [ ] `SELECT count(*) FROM ontology_instances WHERE object_type='Brand'` ≥ 全 Brand 件数
- [ ] Brand を新規作成 → ontology_instances に同期 row が立つ（integration test）
- [ ] /admin/ontology で Property 削除 → impact report が表示、cancel で削除されない
- [ ] migration script を本番スナップショット相当 DB で 1 度実行 → 同期完了の確認

**工数**: 2 週 / 1 人

---

### T1.C 10 AI Governance UI 完成（+1）

**現状（2 点）**
- backend API（budget / usage / role-tools / refusals / red-team）実装済
- frontend: `/admin/ai-governance` ページは mock のまま

**完了状態（3 点）**
- 顧客 admin が UI から：
  - 月次予算 / 上限 / 超過ポリシー編集
  - 累積コスト / モデル別利用量グラフ表示
  - role × tool matrix の可視化（編集は次フェーズ、まずは閲覧）
  - refusal 一覧 + false-positive 判定
  - 直近の red team CI 結果（pass/fail %）

**仕様**

frontend `/admin/ai-governance/page.tsx` 全面改修：
- 上段: KPI カード（今月コスト、cap までの残り、red team pass率、refusal 件数）
- 中段: 月次コスト推移チャート（recharts）モデル別 stacked
- 中段: role × tool matrix（テーブル）
- 下段: refusal 検索テーブル + FP 判定 modal

API client 追加: `frontend/src/lib/api/ai-governance.ts`

**完了基準（Evidence）**
- [ ] 動画録画 30秒：admin が予算 ¥100,000 → ¥50,000 に変更 → /api/v1/ai-governance/budget で確認
- [ ] cost 推移チャートで過去 3 ヶ月分が表示される（mock データでも可）
- [ ] refusal 一覧で 5 件以上を false-positive とマーク → DB に反映

**工数**: 1 週 / 1 人

---

### T1.D 06 デプロイ堅牢化: container scan CI + runbook 5 本（+1）

**現状（2 点）**
- multi-stage Dockerfile + healthcheck 完成
- GHA CI（unit test / eval / pip-audit / bandit）

**完了状態（3 点）**
- Trivy container scan が CI に組込まれ、CRITICAL 検出で merge block
- runbook 5 本完成

**仕様**

#### Trivy container scan
`.github/workflows/ci.yml` に追加：
```yaml
container-scan:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: docker build -t aentro-backend:ci main/backend
    - uses: aquasecurity/trivy-action@master
      with:
        image-ref: aentro-backend:ci
        format: sarif
        output: trivy-results.sarif
        severity: CRITICAL,HIGH
        exit-code: '1'
        ignore-unfixed: true
```

#### Runbook 5 本
新規: `main/docs/runbooks/`
1. `incident-response.md`: SEV1-4 分類、エスカレーション、post-mortem テンプレ
2. `db-migration.md`: alembic upgrade、PITR 復元、failover 手順
3. `secret-rotation.md`: Fernet マスタキー rotation、JWT secret 更新
4. `tenant-onboarding.md`: 新テナント作成、role seed、初期データ投入
5. `dr-drill.md`: 災害復旧訓練（RDS 別リージョン復元、4h 以内）

各 runbook テンプレ:
```markdown
# [タイトル]
## トリガー
## 必要権限
## 手順（番号付き、各ステップ < 5 分）
## 検証
## ロールバック
## エスカレーション先
## 関連ドキュメント
```

**完了基準（Evidence）**
- [ ] Trivy CI が green、CRITICAL=0、HIGH を意図的に追加すると CI fail を確認
- [ ] runbook 5 本が `docs/runbooks/` にコミット、各 100 行以上の手順記載
- [ ] CTO レビュー済（PR 承認 log）

**工数**: 1 週 / 1 人

---

## 4. Tier 2（+6 点 / 3 ヶ月 / 並列 4 人）

### T2.A 05 認証: OIDC SSO + TOTP MFA（+3）

**現状（3 点）**
- bcrypt + JWT ログイン動作
- 8 role seed + 行レベル ACL helper + 列マスキング middleware

**完了状態（6 点）**
- OIDC（Azure AD / Google Workspace）でログイン可能（dev tenant 利用、無料）
- SAML 2.0（Okta dev）でログイン可能
- TOTP MFA を admin role に強制
- 全認証イベントが access_logs に記録

**仕様**

#### OIDC 実装
依存追加: `authlib>=1.3.0`

新規モデル: `IdentityProvider`（既存仕様に従う）
```python
class IdentityProvider(Base):
    id, tenant_id
    type: "oidc" | "saml" | "local"
    name
    config: dict  # client_id, client_secret_encrypted, metadata_url
    role_mapping: dict  # IdP group claim -> aentro role
    enabled: bool
```

新規: `app/api/v1/auth_oidc.py`
```
GET  /api/v1/auth/oidc/start?provider_id=...      → IdP authorize URL に redirect
GET  /api/v1/auth/oidc/callback                    → token 交換 + user 作成 + JWT 発行
```

新規 service: `app/services/auth/oidc_client.py`
- `authlib.integrations.starlette_client.OAuth` で IdP との通信
- ID Token claim から user lookup or auto-provision
- group claim → role_mapping 経由で aentro role 付与

#### SAML 実装
依存追加: `python3-saml>=1.16.0`

新規: `app/api/v1/auth_saml.py`
```
GET  /api/v1/auth/saml/{provider_id}/metadata   → SP metadata XML
POST /api/v1/auth/saml/{provider_id}/acs        → assertion consumer service
GET  /api/v1/auth/saml/{provider_id}/sls        → single logout
```

#### TOTP MFA
新規モデル: `MFASecret`（仕様 05 通り）

新規: `app/api/v1/auth_mfa.py`
```
POST /api/v1/auth/mfa/enroll       → secret 生成 + QR code（pyotp）
POST /api/v1/auth/mfa/verify       → 6 桁コード検証 → JWT に "mfa_verified": true
POST /api/v1/auth/mfa/regenerate   → 8 桁 backup codes 8 本
```

login flow を 2 段階に：
1. POST /api/v1/auth/login → email/password 検証 → 仮 token (1分有効、scope=mfa_only)
2. POST /api/v1/auth/mfa/verify → 仮 token + TOTP code → 本 JWT (24h)

admin role は MFA 必須、それ以外は opt-in。

#### Frontend
- `/login` を 2 段階対応（password → MFA prompt → home）
- `/admin/identity-providers`: IdP 設定 UI
- `/admin/mfa`: 自分の MFA 登録ページ（QR code 表示）
- `/login` に "SSO でログイン" ボタン（IdP 一覧から選択）

#### Dev tenant 接続手順
- Azure AD: portal.azure.com で trial tenant → App registration → client_id 取得
- Google Workspace: console.cloud.google.com で OAuth client 作成
- Okta: developer.okta.com で dev tenant 取得 → SAML 2.0 app 設定

**完了基準（Evidence）**
- [ ] Azure AD trial tenant でログイン完走 → screen recording
- [ ] Google Workspace dev でログイン完走 → screen recording
- [ ] Okta dev で SAML ログイン完走 → screen recording
- [ ] admin@example.jp で MFA 必須 → TOTP 入力なしでログイン不可（integration test）
- [ ] access_logs に SSO / MFA イベントが記録されている（query で確認）

**工数**: 5 週 / 1 人

---

### T2.B 06 デプロイ: Terraform + Helm + OTel + Grafana（+1）

**現状（3 点 = T1.D 後）**
- multi-stage Dockerfile / Trivy / runbooks 完成

**完了状態（4 点）**
- Terraform module で AWS dev 環境が立ち上がる（apply 30 分以内）
- Helm chart で minikube / kind に install 可能
- OTel 計装（FastAPI + SQLAlchemy + httpx）動作
- Grafana dashboard 6 本（OSS Grafana で確認）

**仕様**

#### Terraform
`infra/modules/`:
- `network/`: VPC, 3AZ, subnets (public/private/data)
- `database/`: RDS Aurora PostgreSQL 16 + pgvector option
- `compute/`: ECS Fargate cluster + task definition
- `storage/`: S3 + KMS keys
- `secrets/`: Secrets Manager + KMS
- `observability/`: CloudWatch + OTel collector

`infra/environments/dev/main.tf`: 上記 module を組合せ、apply で立ち上がる

検証: `make tf-dev-up` で 30 分以内に http://... が応答

#### Helm chart
`charts/aentro/`:
- `Chart.yaml`、`values.yaml`、`values-prod.yaml`
- `templates/`:
  - `backend-deployment.yaml`（HPA cpu 70%）
  - `frontend-deployment.yaml`
  - `ingress.yaml`（cert-manager 連携）
  - `secrets-external.yaml`（External Secrets Operator）
  - `postgres-statefulset.yaml`（自前 postgres オプション）

検証: `helm install aentro charts/aentro --dry-run` が成功

#### OTel
依存追加:
```
opentelemetry-distro>=0.51b0
opentelemetry-instrumentation-fastapi
opentelemetry-instrumentation-sqlalchemy
opentelemetry-instrumentation-httpx
opentelemetry-exporter-otlp
```

新規: `app/observability/otel.py`
- FastAPI / SQLAlchemy / httpx を auto-instrument
- tenant_id を span attribute に注入
- OTLP gRPC で collector に送信

`docker-compose.yml` に OTel collector + Grafana + Loki + Tempo を追加（dev 用）

#### Grafana dashboard
`infra/grafana/dashboards/`:
- `01-platform-overview.json`
- `02-per-tenant-sli.json`
- `03-ingestion-pipeline.json`
- `04-llm-cost.json`
- `05-db-performance.json`
- `06-error-budget.json`

実際の dashboard JSON を Grafana エディタで作って export → コミット

**完了基準（Evidence）**
- [ ] `terraform apply` log で AWS dev 環境が立ち上がる（apply 時間 < 30 分）
- [ ] `helm install --dry-run` 成功、minikube に install して curl /health 200
- [ ] Grafana に API latency dashboard が表示、テストリクエスト発火で更新
- [ ] OTel trace に tenant_id が含まれる（Grafana Tempo で確認）

**工数**: 4 週 / 1 人（インフラ経験者）

---

### T2.C 03 LLM AI Analyst: prompt caching + RAG（synthetic）（+1）

**現状（3 点）**
- 6 tool 実 DB クエリ + cost guard + role × tool 配線
- 配線済みだが prompt caching 未活用、RAG 未着手

**完了状態（4 点）**
- system prompt + tools 定義に prompt caching 適用、cache hit 率 90%+
- pgvector で 10,000 件以上の synthetic document 検索
- search_documents tool が実際に embeddings 検索結果を返す

**仕様**

#### Prompt caching
`app/services/ai/system_prompt.py` を改修:
```python
async def build_system_prompt(tenant_id, db) -> list[ContentBlock]:
    return [
        {
            "type": "text",
            "text": ONTOLOGY_SCHEMA_BLOCK,  # 大きい、変動少ない
            "cache_control": {"type": "ephemeral"},
        },
        {
            "type": "text",
            "text": TOOLS_DESCRIPTION_BLOCK,
            "cache_control": {"type": "ephemeral"},
        },
        {
            "type": "text",
            "text": tenant_context_block(tenant_id, db),  # 中サイズ
            "cache_control": {"type": "ephemeral"},
        },
        {
            "type": "text",
            "text": today_and_recent_messages,  # 動的、cache せず
        },
    ]
```

#### pgvector RAG
依存追加: `pgvector>=0.3.0`、`voyageai>=0.2.0`（or OpenAI embedding）

新規モデル: `Document`（仕様 03 通り）
```python
class Document(Base):
    id, tenant_id
    type: "meeting_note" | "review" | "sv_report" | "playbook"
    title, content
    embedding: Vector(1024)  # voyage-3 dimension
    metadata: JSONB
    created_at
```

migration: `CREATE EXTENSION vector; CREATE INDEX ... USING ivfflat (...)`

新規 service: `app/services/ai/embedder.py`
- `embed_text(text) -> list[float]` （voyage-3 / OpenAI）
- 失敗時 stub: deterministic hash → 1024-dim vector（dev / no-API-key 用）

新規 tool: `search_documents`
```python
async def execute_search_documents(input_data, tenant_id, db) -> dict:
    query_emb = await embed_text(input_data["query"])
    res = await db.execute(
        select(Document, Document.embedding.cosine_distance(query_emb).label("distance"))
        .where(Document.tenant_id == tenant_id)
        .order_by("distance")
        .limit(input_data.get("limit", 5))
    )
    return {"results": [{"title": r.title, "snippet": r.content[:300], "distance": float(d)} for r, d in res.all()]}
```

#### Synthetic document seed
`app/seed/synthetic_documents.py`:
- meeting note 1000 件（経営会議議事録テンプレ × 5 ブランド × 200 ヶ月）
- review 5000 件（テンプレ + ランダムバリエーション）
- sv_report 2000 件
- playbook 50 件

**完了基準（Evidence）**
- [ ] prompt caching: response.usage.cache_read_input_tokens / cache_creation_input_tokens 比率 ≥ 9
- [ ] documents テーブルに 8000+ 件 + 全件 embedding 付き
- [ ] search_documents("駅前店の客単価改善") が relevant 5 件返す（手動評価で 3 件以上 relevant）
- [ ] cost log で同一質問の 2 回目以降が cache hit で安くなる

**工数**: 3 週 / 1 人

---

### T2.D 02 第 2 connector + Webhook（+1）

**現状（4 点）**
- Smaregi sandbox stub OK
- BaseConnector / Registry / IngestionRunner 完成

**完了状態（5 点）**
- Square or Air レジ の sandbox 接続が完走
- Webhook 受信 endpoint（HMAC 検証）動作
- 受信 event が ingestion_records に記録、リアルタイム反映

**仕様**

#### Square connector（推奨：API ドキュメント明確）
新規: `app/connectors/square/`
- `auth.py`: OAuth 2.0 + PKCE
- `client.py`: 公式 SDK or httpx ラッパー
- `transform.py`: Square `Order` / `Catalog` → canonical
- `connector.py`: `BaseConnector` 実装

`SQUARE_APPLICATION_ID` / `SQUARE_APPLICATION_SECRET` を settings に。

stub mode: `SQUARE_APPLICATION_ID` 空のときは決定的 fixture を返す。

#### Webhook 受信
新規: `app/api/v1/webhooks.py`
```
POST /api/v1/webhooks/{connector}/{data_source_id}
- Header: X-Smaregi-Signature / X-Square-Signature
- HMAC SHA256 検証（secret は data_source.config.webhook_secret）
- payload を ingestion_records に保存（target_table='_webhook_event'）
- 同期的に transform → silver 反映
```

検証 helper: `app/connectors/{type}/webhook_verify.py`

各 connector に `verify_webhook(headers, body) -> bool` メソッド追加。

#### Connector catalog UI
`/admin/data-sources` の "コネクタを追加" UI に Square カードを追加。
OAuth flow は Smaregi と同じパターン。

**完了基準（Evidence）**
- [ ] Square sandbox 接続完了、daily_sales / product_sales が同期される
- [ ] Webhook endpoint に curl でモックイベント送信 → ingestion_records に記録
- [ ] HMAC 検証失敗時は 403 を返す（integration test）
- [ ] /admin/data-sources で Square / Smaregi 両方が選択できる

**工数**: 3 週 / 1 人

---

## 5. Tier 3（+8 点 / 6 ヶ月 / 並列 3 人）

### T3.A 08 業界深掘り Phase B（+2）

**現状（3 点）**
- Phase A 完了：labor_compliance / royalty_engine / recipe_costing が functional

**完了状態（5 点）**
- レシピ BOM が顧客 100 件以上で運用可能（synthetic seed）
- 理論原価 vs 実原価の日次差異が dashboard に表示
- iPad で HACCP 入力（5 秒以内に 1 記録）
- アレルゲン 28 品目マトリクスが完成

**仕様**

#### Recipe BOM 完成
既存 `app/services/recipe_costing.py` を拡張：
- `app/api/v1/recipes.py` 新規（CRUD + cost calc）
- CSV import: 顧客既存レシピ表を取り込む（`POST /api/v1/recipes/import`）
- 理論原価日次バッチ: APScheduler に追加

UI: `/recipes` ページ新設
- レシピ一覧 + 材料 BOM 編集 + 原価変動グラフ
- ingredient_price_history に基づく感度分析

seed: `app/seed/recipes.py` で 100 レシピ + 50 食材

#### HACCP 入力 iPad UI
新規: `/haccp/monitor` ページ（PWA / mobile-first）
- 各 CCP（揚げ物中心温度 / 冷蔵庫温度 / 冷凍庫温度）の最新監視結果
- ワンタップで入力フォーム → 値を送信 → 数秒で list 更新
- threshold 違反は赤バッジ + 偏差アクション要記入

新規 model: `CCPDefinition` / `HACCPMonitoring` / `AllergenMatrix`（既に仕様にある）
新規 endpoint: `POST /api/v1/haccp/monitoring`、`GET /api/v1/haccp/ccp/{store_id}`

#### アレルゲン 28 品目
既存 model `AllergenMatrix` を全商品で seed
- 28 品目: 特定原材料 7（小麦・そば・卵・乳・落花生・えび・かに）+ 特定原材料に準ずる 21
- 商品ページに「アレルゲン情報」タブ追加

UI: 商品詳細に matrix 表示、admin が手動修正

**完了基準（Evidence）**
- [ ] recipes テーブルに 100+ 行、recipe_bom に 500+ 行
- [ ] /recipes で 1 レシピの理論原価変動グラフが表示
- [ ] iPad シミュレータで HACCP monitoring 1 件入力 → 5 秒以内
- [ ] AllergenMatrix で全商品の 28 品目記入率 ≥ 80%

**工数**: 6 週 / 1 人（vertical engineer）

---

### T3.B 08 業界深掘り Phase C: QSC + Huff + 価格弾力性（+1）

**完了状態（6 点）**
- QSC iPad audit が 1 店舗 完走 → 自動スコア化 + 写真添付
- Huff 商圏予測モデル動作（e-Stat メッシュデータ取込）
- 商品 50 種以上で価格弾力性が自動計算

**仕様**

#### QSC iPad audit
新規 endpoint: 既存 model を活用
- `GET /api/v1/qsc/templates`
- `POST /api/v1/qsc/audits`
- `POST /api/v1/qsc/audits/{id}/photo`（S3 upload）

UI: `/qsc/audit` ページ（mobile-first）
- 質問リスト（Q/S/C 各 10 問）
- 各質問にスコア入力 + 写真添付ボタン
- 完了で submit、自動スコア計算 + dashboard 反映

#### Huff モデル
新規 service: `app/services/huff_model.py`
- 商圏候補地点 + 既存店ポリゴン → 来店確率予測
- 距離減衰 + 店舗魅力度（売上規模）パラメータ

e-Stat メッシュデータ取込: `app/scripts/load_estat_mesh.py`
- e-Stat API（無料）から国勢調査メッシュデータ取得
- `trade_areas` テーブルに人口 / 世帯数 / 昼間人口を保存

UI: `/expansion` ページに Huff 予測タブ追加

#### 価格弾力性
新規 service: `app/services/price_elasticity.py`
- 過去 12 ヶ月の価格変動 + 数量変動 → 弾力性係数を商品別に算出
- 結果を `price_decisions.expected_volume_change` に書き戻し

UI: 商品詳細ページに弾力性 + 弾力性に基づく値上げシミュレータ

**完了基準（Evidence）**
- [ ] iPad シミュレータで QSC audit 1 件完走（写真 3 枚以上）
- [ ] /expansion で 出店候補地点の Huff 予測値が表示
- [ ] price_decisions テーブルに 50+ 商品の弾力性係数が記録
- [ ] 弾力性 demo: ¥500 → ¥520 値上げ時の数量予測が表示

**工数**: 6 週 / 1 人（vertical engineer）

---

### T3.C 09 横断 PF: 5 万店舗 load test + HPA + p95<500ms（+2）

**現状（2 点）**
- tenant strict context + 集計 KPI engine + DQ Reconciliation 完成

**完了状態（4 点）**
- 5 万店舗 + 1 億行 daily_sales seed で API p95 < 500ms 達成
- HPA / Fargate auto-scale 動作（負荷急増で instance 追加）
- OTel + Grafana で per-tenant SLI dashboard 稼働

**仕様**

#### 5 万店舗 seed
新規: `app/scripts/seed_at_scale.py`
- 5 万店舗を 100 ブランド × 500 店舗で生成
- daily_sales 1 億行（=5万 × 730日 × 平均 2.7 日/店舗）  
- 完了時間: 数時間（並列 batch insert）

#### Locust 負荷試験
既存 `tests/perf/locustfile.py` を強化:
- 1000 users / 10 分
- targets.yaml の SLO に対するアサーション
- p50 / p95 / p99 を計測 → JSON report

新規: `tests/perf/run_perf.sh`
```bash
seed_at_scale.py 50000
locust -f tests/perf/locustfile.py --host ... --users 1000 --spawn-rate 50 \
       --run-time 10m --headless --html report.html --csv perf
python tests/perf/check_targets.py perf_stats.csv
```

#### Partition + Index 最適化
- daily_sales を `PARTITION BY RANGE (business_date) PARTITION BY HASH (tenant_id, 8)`
- ontology_instances.properties に GIN index
- store_daily_kpi に composite index `(tenant_id, business_date, store_id)`

#### HPA / auto-scale
- `infra/k8s/hpa.yaml`: cpu 70% で scale up
- Fargate 環境では `aws_appautoscaling_policy`（Terraform）

#### Per-tenant SLI dashboard
T2.B で作った Grafana の `02-per-tenant-sli.json` を実データで動作確認。
- API 可用性 / p95 latency / error rate / ingestion 成功率 をテナント別に

**完了基準（Evidence）**
- [ ] seed_at_scale.py 完走 → 5 万店舗 / 1 億行を確認
- [ ] locust report で 全 endpoint の p95 < 500ms（HTML 添付）
- [ ] HPA event log: 負荷急増時に instance が +1
- [ ] Grafana per-tenant dashboard で 5 テナント別の SLI 表示

**工数**: 4 週 / 1 人（SRE）

---

### T3.D 01 ontology version migration E2E + 30+ ontology seed（+2）

**現状（7 点 = T1.B 完了後）**
- Brand 移行完了、影響範囲レポート UI 動作

**完了状態（9 点）**
- ObjectType v1 → v2 publish migration が E2E test で通る（v1 query を破壊しない）
- カスタム ontology を 30+ 種類 seed（複数業態想定）

**仕様**

#### Version migration E2E test
新規: `tests/integration/test_ontology_migration.py`
```python
async def test_v1_query_survives_v2_publish():
    # 1. ObjectType "Store" v1 を作成、3 instance 投入
    # 2. v2 で Property 追加（draft）
    # 3. publish → migration job 起動
    # 4. v1 query は引き続き同じ結果を返す
    # 5. v2 query は新しい property を含む
    # 6. migration job が完了したら instance.object_type_version=2

async def test_breaking_change_blocked_without_migration():
    # 1. Property "name" を required に変更（draft）
    # 2. publish 試行 → impact report で migration plan 提示
    # 3. plan を skip すると publish blocked
    # 4. migration plan 適用後 publish 可能
```

#### 30+ ontology seed
新規: `app/seed/ontology_examples.py`
業態別の ObjectType セット:
- 牛丼チェーン用: BeefBowlVariant, RiceGrade, MeatSource
- とんかつチェーン用: TonkatsuCut, BreadingType, OilType
- 居酒屋: AlcoholType, Otsumami, OmuMenu
- カフェ: BeanOrigin, RoastLevel, BrewingMethod
- 寿司: NetaType, ShariBlend, WasabiOrigin
- ファミレス: KidsMenu, AllergenStrict, Birthday

**完了基準（Evidence）**
- [ ] integration test で v2 publish 後も v1 query が同じ結果（pytest）
- [ ] migration job ログ: 1000 instance / 5 秒で完走
- [ ] ontology_object_types テーブルに 30+ 業態固有 type
- [ ] /admin/ontology で 30 種類が tree view で見える

**工数**: 3 週 / 1 人

---

### T3.E 03 live eval（実 Claude）で accuracy 80%+（+1）

**現状（4 点 = T2.C 完了後）**
- prompt caching + RAG 完成

**完了状態（5 点）**
- eval が実 Claude API を叩き、30 問で accuracy 80%+ を達成
- 月次 CI で実行、ベンチマーク劣化で fail

**仕様**

#### Live eval mode
`backend/eval/ai_analyst/evaluator.py` 拡張:
- `--mode functional --live` 引数
- ANTHROPIC_API_KEY 必須
- 各 case を /api/v1/ai/chat 経由で実行（local server 起動）
- response の text + tool_calls を検証

新規: `eval/ai_analyst/live_runner.py`
- セットアップ: docker-compose up -d → seed → wait healthy
- 各 case を SSE で受信 → text 結合 + tool_use 抽出
- 終了時に container down

#### 評価メトリクスの強化
- accuracy: 80%+ 必須
- hallucination rate: ≤ 2%
- tool recall: ≥ 95%
- cost per query: ≤ ¥5
- p95 first-token latency: ≤ 3s

#### CI 統合
`.github/workflows/ai-eval-live.yml`（月次 cron + manual trigger）
- secrets.ANTHROPIC_API_KEY を使用
- live mode で実行 → JSON report を artifact に保存
- accuracy < 75% で fail、80% は warning

**完了基準（Evidence）**
- [ ] live eval が手動実行で 30 問完走、accuracy ≥ 80%
- [ ] 月次 CI run の JSON レポートが eval/reports/ に保存
- [ ] cost log: 1 run の合計コスト < ¥150（30 問 × 平均 ¥5）

**工数**: 2 週 / 1 人（AI lead）

---

## 6. 並列実行と組織配分

### 6.1 推奨アサイン（コア 6 人で 6 ヶ月）

| エンジニア | Tier 1（M1） | Tier 2（M2-3） | Tier 3（M4-6） |
|----------|--------------|---------------|---------------|
| Platform Lead | T1.B onto Brand 移行 | T2.C prompt caching + RAG | T3.D version migration |
| Integration | T1.A export+promotion | T2.D 第2 connector + Webhook | (Smaregi prod 待機) |
| AI Lead | T1.C governance UI | T2.C support | T3.E live eval |
| Security Lead | – | T2.A OIDC + SAML + MFA | – |
| SRE | T1.D Trivy + runbook | T2.B Terraform + Helm + OTel | T3.C 5万店舗 load test |
| Vertical | – | – | T3.A Phase B → T3.B Phase C |

### 6.2 月次マイルストーン

| 月 | 累積点 | 完了する Tier |
|----|------|--------------|
| M1 末 | 69 | Tier 1 完了 |
| M2 末 | 73 | T2.A SSO 半分、T2.B / T2.C / T2.D 並行 |
| M3 末 | 75 | Tier 2 完了 |
| M4 末 | 78 | T3.A Phase B、T3.C 着手 |
| M5 末 | 81 | T3.B Phase C、T3.C 完了 |
| M6 末 | **83** | T3.D / T3.E 完了 |

### 6.3 週次マイルストーン（Tier 1 詳細）

| 週 | 主な完了タスク |
|---|---------------|
| W1 | T1.A export endpoint 実装 / T1.B migration script 着手 / T1.C governance API client / T1.D Trivy 設定 |
| W2 | T1.A promotion UI / T1.B dual-write hook / T1.C 主要画面 / T1.D runbook 3 本 |
| W3 | T1.A Meeting Pack 統合 / T1.B impact UI / T1.C polish / T1.D runbook 残り 2 本 |
| W4 | 全タスク E2E test、Evidence 整備、SCORE.md 更新（69 点） |

---

## 7. 依存関係マトリクス

| タスク | 前提 | ブロックする後続 |
|-------|------|----------------|
| T1.A | – | T3.D（Workspace の安定が前提） |
| T1.B | – | T3.D（Brand 移行が前提） |
| T1.C | – | – |
| T1.D | – | T2.B（CI 整備が前提） |
| T2.A | – | – |
| T2.B | T1.D | T3.C（OTel + Grafana が前提） |
| T2.C | – | T3.E（RAG が前提） |
| T2.D | – | – |
| T3.A | – | – |
| T3.B | T3.A | – |
| T3.C | T2.B | – |
| T3.D | T1.A, T1.B | – |
| T3.E | T2.C | – |

---

## 8. リスクと対策

| # | リスク | 確率 | 影響 | 対策 |
|---|-------|------|------|------|
| R1 | T2.A SSO の IdP integration が想定より複雑 | 中 | 高 | OIDC 優先で完成させ、SAML は後回し可（OIDC で大手 70% カバー） |
| R2 | T3.C の 5 万店舗 seed で DB が遅すぎる | 中 | 中 | partition + index を先に入れる、subset で先に試す |
| R3 | T3.A レシピ BOM の seed データ業界実態と乖離 | 中 | 中 | 業界 advisor 1 名招聘（顧問 ¥200K/月程度） |
| R4 | T3.E 実 Claude API が CI で不安定 | 低 | 中 | 月次のみ live、PR は mock |
| R5 | エンジニア確保できず 6 人並列が崩れる | 高 | 致命 | Tier 3 を pause / Tier 1+2 で 76 点まで縮小 |
| R6 | OIDC 設定で IdP 側設定ミス | 中 | 低 | dev tenant 3 つ並行で hedge |

### 縮小プラン（リソース不足時）

| シナリオ | 達成可能点 |
|---------|-----------|
| Tier 1 のみ（4 人 / 1 ヶ月） | 69 |
| Tier 1 + 2 のみ（5 人 / 3 ヶ月） | 75 |
| 全部 / 縮小なし | 83 |

---

## 9. アップリフト完了の Evidence チェックリスト

### Tier 1（69 点）
- [ ] T1.A: CSV/Parquet/xlsx export 動画 + KPI 昇格 row + Meeting Pack live demo
- [ ] T1.B: Brand instance count = ORM count + impact UI 動画 + migration log
- [ ] T1.C: 予算編集動画 + cost chart screenshot + refusal review demo
- [ ] T1.D: Trivy CI green + runbook 5 本 PR

### Tier 2（75 点）
- [ ] T2.A: Azure AD / Google / Okta 各ログイン動画 + MFA TOTP 動作 + access_log query
- [ ] T2.B: terraform apply log + helm install demo + Grafana dashboard URL
- [ ] T2.C: cache hit ratio > 0.9 log + documents 8000+ 件 + search relevance manual eval
- [ ] T2.D: Square sandbox sync log + Webhook curl test + HMAC 検証 test

### Tier 3（83 点）
- [ ] T3.A: 100 レシピ + iPad HACCP demo + アレルゲン記入率 80%+
- [ ] T3.B: QSC iPad audit demo + Huff demo + 弾力性 50 商品
- [ ] T3.C: locust HTML report p95<500ms + HPA event + per-tenant dashboard
- [ ] T3.D: integration test green + 30+ custom ontology seed
- [ ] T3.E: live eval 80%+ JSON + 月次 CI URL

各 Evidence は `evidence/` ディレクトリに commit、`14-acceptance-evidence.md` のフロー で承認。

---

## 10. 採点シミュレーション（83 達成時）

| # | 領域 | 現 → 目標 |
|---|------|----------|
| 01 動的オントロジー | 5 → **9** |
| 02 実コネクタ | 4 → **5** |
| 03 LLM AI Analyst | 3 → **5** |
| 04 ワークスペース | 4 → **7** |
| 05 認証 | 3 → **6** |
| 06 デプロイ | 2 → **4** |
| 07 パイロット | 0 → 0 |
| 08 業界深掘り | 3 → **6** |
| 09 横断 PF | 2 → **4** |
| 10 AI 安全性 | 2 → **3** |
| 11 Compliance | 2 → 2 |
| **製品コア** | 24 → **42** |
| **横断品質** | 6 → **9** |
| **基礎点** | 32 → 32 |
| **合計** | 62 → **83** |

---

## 11. 顧客が来た瞬間の次の一手

83 点達成後、最初の顧客契約が決まれば自動的に開く点：

| トリガー | 解凍される点 |
|---------|------------|
| パイロット 1 社契約 | 02 +2（本番 OAuth）、07 +2（POC スタート） |
| パイロット 8 週完走 + ROI 3x | 07 +3（完走 evidence） |
| 顧客本番 30 日稼働 | 02 +2、09 +1 |
| 顧客本契約 | 02 +1、07 +0（5 点満点）、03 +1 |
| SOC2 Type 1 readiness | 11 +1 |

→ 顧客 1 社確保 + 8 週 POC 完走 + SOC2 Type 1 = **83 → 91** が現実的に見えてくる。

100 点（業界デファクト候補）は **5 社並行 + SOC2 Type 2 + ISMS + 業界団体連携 + 大手 1 社本契約** を要し、最低でも T+15 ヶ月。

---

## 12. 次の意思決定

このプランの実行可否を CTO + CEO + VP Eng で判定。判定材料：

1. **6 人 × 6 ヶ月のエンジニアが確保できるか**
2. **Tier 2 の OIDC 実装で IdP test tenant を 3 つ取得できるか**（営業 / IT 部門のサポート要）
3. **Tier 3 の Phase B/C で外食業界 advisor を確保できるか**
4. **¥10-15M 程度の外部監査予算を Q3 に確保できるか**（SOC2 Type 1 readiness 用、これがあれば 11 +1）

意思決定したら `13-master-schedule.md` を本ドキュメントに沿って更新、`SCORE.md` の milestone を 69 / 75 / 83 で再設定。
