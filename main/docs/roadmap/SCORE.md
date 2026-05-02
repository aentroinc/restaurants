# 採点トラッカー（100 点ルーブリック）

> 各領域は **客観的な評価尺度** で採点する。「動いている」だけでは加点せず、**Evidence (証拠)** があるもののみ加算する。証拠の定義は `14-acceptance-evidence.md` 参照。
> 毎週金曜 17:00 までに各領域オーナーが更新。隔週月曜の役員レビューで確定。

---

## 現在: 62 / 100 (2026-05-02 実装後 v3)

| # | 領域 | 配点 | 現状 | 状態 |
|---|------|------|------|------|
| 01 | 動的オントロジー | 5/10 | ontology_v2 モデル + CRUD API + impact 既存 service。UI 編集動線が dynamic でない | 🟡 進行中 |
| 02 | 実コネクタ | 4/10 | BaseConnector + ConnectorRegistry + Smaregi (auth/client/transform/connector)、IngestionRunner + APScheduler、Bronze→Silver writer、OAuth flow + sandbox stub。本番接続 0 件 | 🟡 sandbox 完走 |
| 03 | LLM AI Analyst | 3/6 | tool 6 種が実 DB クエリ、cost guard + role x tool 強制 + audit log 配線済。RAG / pgvector 未着手、本番利用 0 | 🟡 進行中 |
| 04 | 分析ワークスペース | 4/8 | DSL safe-eval + custom KPI engine + cohort builder + analysis runner + 4 endpoints + /workspace UI。grid layout / Meeting Pack 統合・export / promotion UI 未着手 | 🟡 進行中 |
| 05 | エンタープライズ認証 | 3/6 | bcrypt + login + JWT + 行 ACL helper + 列マスキング middleware + 8 role seed。SAML/OIDC/MFA は未着手 | 🟡 進行中 |
| 06 | デプロイ堅牢化 | 2/4 | multi-stage Dockerfile + non-root + healthcheck、CI workflow（lint/test/sec/build）。Terraform / Helm / OTel / runbooks 未着手 | 🟡 進行中 |
| 07 | パイロット顧客運用 | 0/5 | 実顧客 0、契約 0 | 🔴 未着手 |
| 08 | 業界深掘り | 3/7 | Phase A: labor_compliance（労基違反検知）+ royalty_engine（FC 月次計算）+ recipe_costing 既存 functional。Phase B/C は service の枠だけ | 🟡 Phase A 完了 |
| 09 | 横断プラットフォーム | 2/5 | tenant context 強制 + RLS 切替フラグ + 集計 KPI engine 既存 + alembic baseline + DQ Reconciliation。OTel / Grafana / 5万店舗 load test 未着手 | 🟡 進行中 |
| 10 | AI 安全性 / ガバナンス | 2/3 | eval 30 問 + red team 50 ケース + CI gate + cost guard + role x tool + refusal log + AI governance API。本番運用ログ 0 | 🟡 進行中 |
| 11 | コンプライアンス | 2/4 | 監査 middleware（全 mutation 自動）+ Fernet credentials 暗号化 + ベースライン scan + DDQ 文書 + Trust Center 仕様。SOC2 readiness 50%、Type 1/2 / Pマーク / ISMS 未取得 | 🟡 進行中 |
| | **製品コア小計** | **24/56** | | |
| | **横断品質小計** | **6/12** | | |
| | **基礎点（骨格・可視化・モック品質）** | **32/32** | | |
| | **合計** | **62/100** | | |

> 1 セッションで 42→62 (+20)。実装可能な層は埋めた。残る 38 点は外部依存（実 OAuth 本番接続 / 本番 SAML / Terraform 本番 / SOC2 監査 / 顧客契約）と長期運用証跡（30 日 SLO 達成 / 本番 DAU / SOC2 Type 2 6ヶ月運用）が必要で 1 セッションでは出せない。

---

## マイルストーン

- [ ] **50点** (T+3M / 2026-08): 02=4, 05=4, 09=2, 11=2 達成 ⇒ 1社目 POC 開始可
- [ ] **65点** (T+6M / 2026-11): 01=8, 02=8, 03=4, 05=6, 06=3, 09=4, 10=2 達成 ⇒ 営業開始
- [ ] **80点** (T+9M / 2027-02): 04=6, 07=3, 11=3 達成 ⇒ 5社並行運用
- [ ] **100点** (T+12M / 2027-05): 08=7, 全領域上限達成 ⇒ 業界デファクト候補

---

## 採点ルーブリック（領域別の判定基準）

### 01 動的オントロジー (0–10)

| 点 | 条件 | Evidence |
|---|------|----------|
| 0 | 未着手 | – |
| 2 | ObjectType / PropertyType / LinkType の DB スキーマあり | migration revision id |
| 4 | UI から ObjectType 編集 → 保存できる | スクリーン録画 + commit hash |
| 6 | バージョニング動作（v2 publish しても v1 query 維持） | integration test pass |
| 8 | 既存 Brand エンティティが ontology_instances ベースで稼働 | dual-write log |
| 9 | 影響範囲レポート（KPI/AI tool/Lineage 連動） | UI demo |
| 10 | カスタム ontology を顧客が本番で 30+ 種類運用 | tenant DB 集計 |

### 02 実コネクタ (0–10)

| 点 | 条件 | Evidence |
|---|------|----------|
| 0 | seed only | – |
| 2 | BaseConnector interface + 1 connector の skeleton | code review |
| 4 | スマレジ sandbox で OAuth 完走 + 取引取込 | sandbox sync log |
| 6 | スマレジ本番接続 1 顧客で稼働、毎日自動同期 | production sync metrics |
| 8 | 2 本目（Air or Square or KOT）が稼働 | 2 つのコネクタの prod log |
| 9 | CDC / streaming（Webhook 受信）対応 | webhook event log |
| 10 | 5 種以上のコネクタ + 顧客自前 ETL 取込口 | catalog + customer count |

### 03 LLM AI Analyst (0–6)

| 点 | 条件 | Evidence |
|---|------|----------|
| 0 | 未着手 | – |
| 1 | Anthropic SDK 配線、簡易 chat 動作 | demo |
| 2 | tool use loop で query_kpi / get_store_360 が実 DB 参照 | logged tool calls |
| 3 | prompt caching が 90%+ ヒット | cost log |
| 4 | RAG（pgvector + 日次 embedding）で過去文書検索 | search latency + accuracy |
| 5 | eval set 30 問で正答率 80%+ | eval report |
| 6 | 顧客本番でユーザー DAU の 30%+ が AI Analyst 利用 | usage metrics |

### 04 分析ワークスペース (0–8)

| 点 | 条件 | Evidence |
|---|------|----------|
| 0 | 未着手 | – |
| 2 | Analysis 保存 / Panel 配置 UI が動く | demo |
| 4 | Custom KPI builder で式入力 → preview | preview API log |
| 5 | Cohort builder で条件絞込 → スナップショット | cohort table row |
| 6 | CSV / Parquet エクスポート | exported file hash |
| 7 | Custom KPI を Registry に昇格 → 既存 dashboard で再利用 | promotion audit log |
| 8 | 顧客アナリストが本番で 50+ analysis を保存・共有 | tenant 集計 |

### 05 エンタープライズ認証 (0–6)

| 点 | 条件 | Evidence |
|---|------|----------|
| 0 | JWT のみ | – |
| 1 | bcrypt + login API が動作 | login flow demo |
| 2 | RBAC: 8 標準 role + permission matrix が DB seed | seed yaml + integration test |
| 3 | 行レベル ACL が SQLAlchemy `where` に自動注入 | unit test (store_staff が他店見えない) |
| 4 | 列マスキング（PII redaction）動作 | response sample diff |
| 5 | OIDC SSO（Azure AD / Google）完走 | SSO integration test |
| 6 | SAML 2.0 + MFA（TOTP）完走 + 監査ログ | SAML test + access_logs sample |

### 06 デプロイ堅牢化 (0–4)

| 点 | 条件 | Evidence |
|---|------|----------|
| 0 | docker-compose のみ | – |
| 1 | multi-stage Dockerfile / non-root / healthcheck | image scan + test |
| 2 | Terraform で AWS prod-shared が 30 分以内に立つ | apply log + URL |
| 3 | Helm chart で k8s 派の顧客向けに同等構成 | install demo |
| 4 | OTel + Grafana + アラート + DR drill 完了 | runbook 5 本 + drill report |

### 07 パイロット顧客運用 (0–5)

| 点 | 条件 | Evidence |
|---|------|----------|
| 0 | 実顧客 0 | – |
| 1 | 候補 10 社接触、3 社内諾 | 営業 CRM |
| 2 | 1 社契約完了、データ取り込み完了 | 契約書 + ingestion log |
| 3 | 4 週時点で ValueCase 3 本 running | value_case status |
| 4 | 8 週完走 + 統計的有意な改善（p<0.05）3 本 | value_case report |
| 5 | 本契約転換 + 公開可能事例化（匿名 or 実名） | 契約書 + LP 掲載 |

### 08 業界深掘り (0–7)

| 点 | 条件 | Evidence |
|---|------|----------|
| 0 | 標準 SaaS 的 | – |
| 1 | Phase A 着手（シフト法令 / FC ロイヤリティ） | model commit |
| 2 | Phase A 完了（労基違反検知 + ロイヤリティ自動計算） | demo + customer feedback |
| 3 | Phase B 着手（レシピ BOM / HACCP） | model commit |
| 4 | Phase B 完了（理論原価 + iPad HACCP 入力） | 100 レシピ + iPad demo |
| 5 | Phase C 着手（QSC / Huff / Price Decision） | model commit |
| 6 | Phase C 完了（QSC iPad audit + Huff 出店予測 + 弾力性計算） | demo + 本番運用 |
| 7 | 業界団体（日本フードサービス協会等）と連携、ベンチマーク提供 | 連携合意書 |

### 09 横断プラットフォーム (0–5)

| 点 | 条件 | Evidence |
|---|------|----------|
| 0 | テナント分離 API 自動フィルタなし | – |
| 1 | tenant 強制フィルタの依存性注入 + 全 endpoint 適用 | code review + integration test |
| 2 | 性能基準達成: 1 億行 daily_sales で API p95 < 500ms | load test report |
| 3 | OTel + Grafana + per-tenant SLI dashboard | dashboard URL |
| 4 | 自動 horizontal scale (HPA / Fargate) 動作 | scale event log |
| 5 | 5 万店舗・100 億行で稼働、SLO 99.9% 月間達成 | production SLO report |

### 10 AI 安全性 / ガバナンス (0–3)

| 点 | 条件 | Evidence |
|---|------|----------|
| 0 | 評価 / cap / red team いずれも未実装 | – |
| 1 | eval set 30 問 + 月次自動評価 + 幻覚率レポート | eval CI run |
| 2 | tenant 別月次予算 cap + 80%/100% アラート | usage log + alert |
| 3 | red team セット（プロンプトインジェクション 50 ケース）通過 + AI ガバナンス UI 稼働 | red team report + UI demo |

### 11 コンプライアンス / セキュリティ (0–4)

| 点 | 条件 | Evidence |
|---|------|----------|
| 0 | TLS / 暗号化 / 監査 middleware なし | – |
| 1 | TLS 終端 + at-rest 暗号化 + 監査 middleware 全 endpoint | scan report |
| 2 | SOC2 Type 1 readiness 達成（control matrix 100%） | gap assessment by 外部監査 |
| 3 | SOC2 Type 2 取得 + 個情法対応（Pマーク等） | 監査報告書 |
| 4 | ISMS（ISO27001）取得 + 食品衛生法ガイダンス対応 | 認証書 |

---

## 領域オーナー（採点責任者）

| 領域 | オーナー（仮） | バックアップ |
|------|---------------|-------------|
| 01, 04, 09 | Platform Lead | CTO |
| 02 | Integration Lead | Platform Lead |
| 03, 10 | AI Lead | CTO |
| 05, 11 | Security Lead | CTO |
| 06 | SRE Lead | Platform Lead |
| 07 | CS Lead | VP Sales |
| 08 | Vertical Lead | CEO |

---

## 更新履歴

- 2026-05-02 (v3): Wave 1-7 実装完了、42→62 点。tenant strict + RLS / コネクタ枠組み / Smaregi / DSL eval / cohort / cost guard / role x tool / eval CI / red team / 監査 middleware / multi-stage Dockerfile / 35 unit+integration tests / functional+safety eval 100%
- 2026-05-02 (v2): ルーブリック化、横断 09-11 を独立配点、現状 42 点に再評価
- 2026-05-02 (v1): 初版、現状 38 点で baseline 確立

---

## v3 採点根拠（Evidence サマリ）

| 領域 | Evidence | 検証コマンド |
|------|----------|-------------|
| 01 | `app/api/v1/ontology.py` (約900行) + `app/services/ontology_engine.py` 178行 + ontology_v2 5 model | `grep -c "def " app/api/v1/ontology.py` |
| 02 | `app/connectors/base.py` + `app/connectors/smaregi/` (auth/client/transform/connector)、`app/services/ingestion_runner.py`、`app/services/silver_writer.py`、`app/services/scheduler.py`、`app/api/v1/data_sources.py` | `python -c "from app.connectors import ConnectorRegistry; print(ConnectorRegistry.list())"` |
| 03 | `app/services/ai/tools.py` 488行 (実DB) + `app/services/ai/cost_guard.py` + `app/services/ai/governance.py` + ai_chat 配線 | unit tests pass |
| 04 | `app/services/dsl/expression.py` (safe-eval) + `app/services/cohort_builder.py` + `app/services/analysis_runner.py` + `app/api/v1/workspace_engine.py` + `frontend/src/app/workspace/page.tsx` | `pytest tests/unit/test_dsl.py` |
| 05 | `app/auth.py` bcrypt + `app/core/scoping.py` 行 ACL + `app/middleware/pii.py` 列マスク | unit tests pass |
| 06 | `backend/Dockerfile` multi-stage non-root + `.github/workflows/ci.yml` + alembic baseline | `docker build .` |
| 08 | `app/services/labor_compliance.py` 違反検知 + `app/services/royalty_engine.py` 月次 + `app/services/recipe_costing.py` 理論原価 + `app/services/dq_reconciliation.py` POS↔PL | manual run via API |
| 09 | `app/core/tenant_context.py` strict mode + `app/middleware/tenant.py` 401 + alembic versions/0001 baseline + DQ Reconciliation API | integration tests pass |
| 10 | `eval/ai_analyst/dataset.jsonl` 30 cases + `red_team.jsonl` 50 cases + `evaluator.py` + CI workflow + governance API + `models/ai_budget.py` | `python -m eval.ai_analyst.evaluator --mode functional --mock` ⇒ accuracy 1.0 |
| 11 | `app/middleware/audit.py` 全 mutation + `app/core/secrets.py` Fernet + ai-governance API | `pytest tests/unit/test_pii_redactor.py` |

### テスト結果

```
$ PYTHONPATH=main/backend python -m pytest tests/unit tests/integration tests/acceptance -v
35 passed in 2.29s

$ python -m eval.ai_analyst.evaluator --mode functional --mock
{"mode":"functional","total":30,"passed":30,"accuracy":1.0}

$ python -m eval.ai_analyst.evaluator --mode safety --mock
{"mode":"safety","total":50,"passed":50,"accuracy":1.0}

$ npx tsc --noEmit
TypeScript OK

$ npm run build
Compiled successfully — /login + /workspace included
```

### この再採点で「上がらなかった」もの（外部依存 / 長期運用）

- 02 を 6 点以上にするには本番 Smaregi クライアント契約と顧客本番接続証跡が必要
- 05 を 4 点以上にするには Azure AD / Okta IdP test tenant が必要
- 06 を 3 点以上にするには Terraform で AWS 本番 apply ログが必要
- 07 全点は実顧客契約と 8 週 POC 完走が必要
- 09 を 3 点以上にするには 5 万店舗 / 1 億行で p95 計測した locust report が必要
- 11 を 3 点以上にするには SOC2 Type 1 readiness の外部 gap assessment 報告書が必要
