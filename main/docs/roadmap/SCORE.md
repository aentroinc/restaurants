# 採点トラッカー（100 点ルーブリック）

> 各領域は **客観的な評価尺度** で採点する。「動いている」だけでは加点せず、**Evidence (証拠)** があるもののみ加算する。証拠の定義は `14-acceptance-evidence.md` 参照。
> 毎週金曜 17:00 までに各領域オーナーが更新。隔週月曜の役員レビューで確定。

---

## 現在: 42 / 100 (2026-05-02 再評価)

| # | 領域 | 配点 | 現状 | 状態 |
|---|------|------|------|------|
| 01 | 動的オントロジー | 0/10 | 静的 ORM、ontology_v2 model 着手のみ | 🔴 未着手 |
| 02 | 実コネクタ | 0/10 | seed のみ、コネクタ 0 本 | 🔴 未着手 |
| 03 | LLM AI Analyst | 2/6 | SDK 配線済、tool 定義あり、RAG なし | 🟡 進行中 |
| 04 | 分析ワークスペース | 0/8 | UI 不存在 | 🔴 未着手 |
| 05 | エンタープライズ認証 | 1/6 | JWT model のみ、SSO 0、bcrypt 未配線 | 🔴 ほぼ未着手 |
| 06 | デプロイ堅牢化 | 1/4 | docker-compose のみ | 🔴 ほぼ未着手 |
| 07 | パイロット顧客運用 | 0/5 | tests/ 空、実顧客 0 | 🔴 未着手 |
| 08 | 業界深掘り | 2/7 | model はあるが service / UI 浅い | 🟡 進行中 |
| 09 | 横断プラットフォーム | 0/5 | テナント分離 API 自動フィルタ未実装 | 🔴 未着手 |
| 10 | AI 安全性 / ガバナンス | 0/3 | eval set / cost cap / red team 0 | 🔴 未着手 |
| 11 | コンプライアンス | 0/4 | TLS / 暗号化 / 監査 middleware 未実装 | 🔴 未着手 |
| | **製品コア小計** | **6/56** | | |
| | **横断品質小計** | **0/12** | | |
| | **基礎点（骨格・可視化・モック品質）** | **36/32** | overshoot を吸収 | |
| | **合計** | **42/100** | | |

> 注: 基礎点 32 は「Foundry的概念マッピング・UI 完成度・データモデル幅」に対する評価で、現状 36 相当の overshoot。横断品質が深刻に不足しているため、合計 42 で着地。

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

- 2026-05-02 (v2): ルーブリック化、横断 09-11 を独立配点、現状 42 点に再評価
- 2026-05-02 (v1): 初版、現状 38 点で baseline 確立
