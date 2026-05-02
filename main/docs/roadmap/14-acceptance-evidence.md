# 14 — 受け入れテスト / 100 点認定 Evidence チェックリスト

> SCORE.md の各領域の点数加算は **客観的な Evidence (証拠)** を伴わなければならない。
> 自己申告だけで点数を上げるとロードマップが嘘になる。本ドキュメントは **「100 点認定のために提出すべき証拠の正式リスト」**。

---

## 1. Evidence の種類と要件

| 種別 | 内容 | 保存場所 | 検証者 |
|-----|------|---------|-------|
| **Code Evidence** | git commit hash / PR number / migration revision | git log + GitHub PR | Lead 同僚レビュー |
| **Test Evidence** | CI run URL / pytest report / coverage | GitHub Actions | CI 自動 |
| **Demo Evidence** | スクリーン録画 / 動画（Loom / YouTube unlisted） | `evidence/demos/` | Exec |
| **Production Evidence** | tenant DB クエリ結果 / Grafana dashboard URL / アラート log | 本番 | SRE / CS |
| **Customer Evidence** | 顧客サインオフ / 契約書 / NPS / ROI レポート | CRM | VP Sales |
| **Audit Evidence** | 外部監査報告書 / 認証書 | 法務 / 経理 | 外部監査人 |
| **Doc Evidence** | policy 文書 / runbook / Trust Center 公開 URL | docs/ + 公開サイト | Security Lead |

各 Evidence は **「再現可能・第三者検証可能」**であること。動画なら日時 + 環境表示、ログなら検索可能なクエリ付き。

---

## 2. 領域別 Evidence チェックリスト

### 01 動的オントロジー（10 点）

| 点 | Evidence 要件 | 保存先 |
|---|--------------|-------|
| 2 | (Code) ObjectType / PropertyType / LinkType / Instance / Link の migration revision id | alembic + git log |
| 4 | (Demo) 30 秒録画: ObjectType 新規 → Property 追加 → publish → instance 投入 | evidence/demos/01-04.mp4 |
| 6 | (Test) `tests/integration/test_ontology_versioning.py` が CI で pass | GHA run URL |
| 8 | (Production) `SELECT count(*) FROM ontology_instances WHERE object_type='Brand'` ≥ 既存 brand 件数 | DB query |
| 9 | (Demo) Property 削除時の影響範囲レポート画面録画 | evidence/demos/01-09.mp4 |
| 10 | (Production) 顧客テナント別 ontology object_type 数 ≥ 30、内 customer-defined ≥ 5 | tenant DB summary |

---

### 02 実コネクタ（10 点）

| 点 | Evidence 要件 | 保存先 |
|---|--------------|-------|
| 2 | (Code) `app/connectors/base.py` BaseConnector + `app/connectors/smaregi/` skeleton merged | PR # |
| 4 | (Production) スマレジ sandbox の 1 日分 sync log（rows_loaded > 0、duration < 10min） | GHA + ingestion_jobs |
| 6 | (Production) 顧客本番環境で 30 日連続 daily sync 成功率 ≥ 95% | Grafana metric |
| 8 | (Production) 2 つ目のコネクタ（Air or Square）が顧客本番で 30 日稼働 | Grafana |
| 9 | (Production) Webhook 受信実績ログ（HMAC 検証済 ≥ 100 イベント） | webhook_events |
| 10 | (Doc + Production) コネクタカタログ 5 種以上 + 顧客自前 ETL 取込口の SDK ドキュメント | docs/connectors/ |

---

### 03 LLM AI Analyst（6 点）

| 点 | Evidence 要件 | 保存先 |
|---|--------------|-------|
| 1 | (Demo) 30 秒録画: 質問 → SSE ストリーミング応答 | evidence/demos/03-01.mp4 |
| 2 | (Test) eval-set の上位 5 質問で query_kpi が呼ばれることが test 確認 | GHA |
| 3 | (Metric) 月間 audit log 集計：cache_read_tokens / total_input_tokens ≥ 0.9 | dashboard |
| 4 | (Production) pgvector documents テーブル row count ≥ 10,000、search latency p95 < 500ms | Grafana |
| 5 | (Test) eval CI report で accuracy ≥ 80%、hallucination ≤ 2% | eval/reports/ |
| 6 | (Production) tenant 別 user 利用率 = `weekly_ai_users / weekly_total_users` ≥ 0.3 平均 | analytics dashboard |

---

### 04 分析ワークスペース（8 点）

| 点 | Evidence 要件 | 保存先 |
|---|--------------|-------|
| 2 | (Demo) Workspace 新規 → panel 追加 → 保存 → 再オープンで再現の動画 | evidence/demos/04-02.mp4 |
| 4 | (Demo + Test) Custom KPI builder で `({sales}-{cogs})/{sales}` 入力 → preview 計算結果が正しいことを test | unit test + demo |
| 5 | (Demo) Cohort builder で「首都圏駅前 + 粗利率<25%」→ 23 店舗 hit を録画 | evidence/demos/04-05.mp4 |
| 6 | (Test) export endpoint の golden test：1000 行 CSV / Parquet が正しいフォーマット | GHA |
| 7 | (Production) `kpi_definitions` で `source = 'promoted_from_custom_kpi'` の row が ≥ 5 | DB query |
| 8 | (Production) tenant 別 saved analyses count、平均 ≥ 50 | DB |

---

### 05 エンタープライズ認証（6 点）

| 点 | Evidence 要件 | 保存先 |
|---|--------------|-------|
| 1 | (Test) login flow integration test pass、bcrypt cost ≥ 12 確認 | GHA |
| 2 | (Code + Test) 8 role seed yaml + permission matrix integration test | seed/permissions.yaml + GHA |
| 3 | (Test) `tests/integration/test_row_level_acl.py`：store_staff が他店データ 404 受信 | GHA |
| 4 | (Test + Demo) viewer のレスポンスから PII 列が `***` でマスクされる diff | snapshot test |
| 5 | (Demo + Log) Azure AD test tenant + Google Workspace で SSO 完走、access_log にログ | demo + log |
| 6 | (Demo + Test) Okta SAML 完走、TOTP 必須 role でコード入力なしで login 不可 | demo + test |

---

### 06 デプロイ堅牢化（4 点）

| 点 | Evidence 要件 | 保存先 |
|---|--------------|-------|
| 1 | (Code) multi-stage Dockerfile + Trivy scan で critical 0 件 | GHA |
| 2 | (Production) `terraform apply` log で空 AWS account → prod-shared 立ち上げ ≤ 30min | apply log |
| 3 | (Demo) `helm install` log で同等構成が k8s に立ち上がる | install log + curl health |
| 4 | (Production + Doc) DR drill report（RDS 別リージョン復元 ≤ 4h） + 5 本 runbook | docs/runbooks/ + drill report |

---

### 07 パイロット顧客運用（5 点）

| 点 | Evidence 要件 | 保存先 |
|---|--------------|-------|
| 1 | (CRM) 候補 10 社接触ログ、3 社 commitment 取得 | CRM export |
| 2 | (契約 + Log) 契約書 + ingestion_jobs で初期 sync 完走 | 契約 + DB |
| 3 | (DB) ValueCase 3 件 status='running'、4 週時点 | DB query |
| 4 | (Report) 8 週時点で 3 ValueCase の baseline vs intervention の t-test、p<0.05、推定改善額算出 | value_case report |
| 5 | (契約 + Doc) 本契約書 + 公開可能事例（顧客同意書 + LP コンテンツ） | 契約 + LP |

---

### 08 業界深掘り（7 点）

| 点 | Evidence 要件 | 保存先 |
|---|--------------|-------|
| 1 | (Code) Phase A モデル merged | PR # |
| 2 | (Demo + Customer) 労基違反検知が顧客本番で 30 日稼働 + ロイヤリティ自動計算月次 30 件以上 | demo + DB |
| 3 | (Code) Phase B モデル merged | PR # |
| 4 | (Production) 100 レシピ以上 BOM 登録、理論原価日次計算稼働、iPad HACCP 入力 demo | DB + demo |
| 5 | (Code) Phase C モデル merged | PR # |
| 6 | (Demo + Customer) QSC iPad audit 顧客運用、Huff 出店予測の本番案件適用、価格弾力性 ≥ 50 商品で計算 | demo + DB |
| 7 | (Doc) 業界団体（日本フードサービス協会等）連携合意書 / ベンチマーク提供契約 | 契約 |

---

### 09 横断プラットフォーム（5 点）

| 点 | Evidence 要件 | 保存先 |
|---|--------------|-------|
| 1 | (Test) `test_tenant_isolation.py` が全 GET endpoint で pass | GHA |
| 2 | (Test) locust report：1 億行投入後 API p95 < 500ms（30 endpoint） | tests/perf/reports/ |
| 3 | (URL) Grafana per-tenant SLI dashboard URL + アラート 6 本設定済 | Grafana |
| 4 | (Log) HPA / Fargate auto-scale event log（負荷急増時に instance 追加） | CloudWatch |
| 5 | (Report) 30 日連続 SLO 99.9% 達成（API 可用性、p95 latency 両方） | SLO report |

---

### 10 AI 安全性 / ガバナンス（3 点）

| 点 | Evidence 要件 | 保存先 |
|---|--------------|-------|
| 1 | (Test + Report) eval CI 月次 run で accuracy 80%+、hallucination ≤ 2% | eval/reports/ |
| 2 | (Production) tenant 月次予算超過テナントが 429 を受信した log（少なくとも 1 件） + alert log | usage log + alert |
| 3 | (Test + Demo) red team 50 ケース 100% pass、AI ガバナンス UI で admin が予算 / matrix 編集 | red_team report + demo |

---

### 11 コンプライアンス / セキュリティ（4 点）

| 点 | Evidence 要件 | 保存先 |
|---|--------------|-------|
| 1 | (Scan) SSL Labs A+、TLS 1.3、AWS Config rule pass、bandit / Trivy / pip-audit critical 0 | scan report |
| 2 | (Audit) 外部監査 firm の SOC2 Type 1 readiness report（gap 0 件） | 監査報告書 |
| 3 | (Audit) SOC2 Type 2 報告書 + Pマーク認定証 | 公式書類 |
| 4 | (Audit) ISMS（ISO27001）認定証 + 食品衛生法ガイダンス文書整備 + Trust Center 公開 URL | 認定証 + 公開 |

---

## 3. Evidence の保管 / 提出フロー

### 3.1 ディレクトリ構成

```
docs/
├── roadmap/                     # 仕様 / 計画
└── evidence/                    # 客観証拠（Lead が更新）
    ├── README.md                # 評価ルール
    ├── score-history.csv        # 週次 SCORE 推移
    ├── 01-ontology/
    │   ├── 01-04-demo.mp4
    │   ├── 01-06-test-run.txt
    │   └── 01-08-prod-query.sql
    ├── 02-connectors/
    ├── ...
    ├── certifications/
    │   ├── soc2-type1-2026q4.pdf
    │   ├── soc2-type2-2027q1.pdf
    │   ├── pmark-2027.pdf
    │   └── isms-2027.pdf
    └── customer-references/
        ├── customer-A-contract.pdf  # 機密、git LFS or private repo
        └── customer-A-roi-report.pdf
```

機密度の高いもの（契約書 / 監査報告書）は別途暗号化リポ。

### 3.2 提出 → 評価 → 加算 のサイクル

1. **領域 Lead** が `evidence/` に証拠を commit
2. **PdM** が SCORE.md に該当点を `pending` で記録
3. **隔週月曜の Exec review** で証拠を確認 → 承認 → `confirmed` に変更
4. 確認できないものは差し戻し、不足分を明示

### 3.3 第三者監査（年次）

- 年 1 回、外部 advisor（業界経験ある CTO 経験者 / 投資家）に SCORE と Evidence をレビュー依頼
- 監査結果は内部 + 投資家報告書に記載

---

## 4. 100 点認定セレモニー（最終ゲート）

すべての領域で上限点 + Evidence 揃った場合：

### 4.1 Pre-check
- [ ] SCORE.md = 100/100、各領域 Lead がサインオフ
- [ ] `evidence/` ディレクトリに全領域の証拠が完備
- [ ] CI が全テスト pass（製品 + 受け入れ）
- [ ] 直近 90 日の重大インシデント = 0
- [ ] 顧客 NPS 平均 ≥ 50

### 4.2 認定プロセス
1. **PdM** が `100-point-assertion.md` を作成（全証拠への参照付き）
2. **CTO** がレビュー、Eng 視点で問題ないことを確認
3. **CEO** + **役員会** で承認
4. **外部 advisor** 1 名以上が独立 audit
5. 全社員に announce、業界 PR

### 4.3 100 点後の維持

100 点は「達成」ではなく「維持」が課題。

| 維持指標 | 目標 |
|---------|------|
| SLO 達成率 | 月次 99.9% 継続 |
| eval accuracy | 月次 80%+ 継続 |
| 顧客 NPS | 半期 50+ 継続 |
| 重大インシデント | 90 日 0 件 |
| 認証維持 | SOC2 Type 2 / Pマーク / ISMS の年次更新 |
| 採用 / 退職 | 自発退職率 < 15% / 年 |

これらが下回ると **採点を 5 点単位で減点**。

---

## 5. 受け入れテスト（製品レベル）

100 点製品の動作確認テストスイート。CI で nightly 実行。

### 5.1 ゴールデンパステスト

```
backend/tests/acceptance/golden_paths/
├── test_executive_morning_brief.py  # 経営層が朝出社 → ダッシュボード → AI 質問
├── test_sv_visit_flow.py            # SV が店舗訪問 → タスク作成 → 完了
├── test_brand_manager_meeting.py    # ブランド責任者の月次会議シナリオ
├── test_franchise_royalty_close.py  # FC 月末ロイヤリティ計算
├── test_recipe_cost_simulation.py   # 原価変動時のレシピ影響シミュ
├── test_pos_pl_reconciliation.py    # POS↔PL 自動合致
├── test_pii_redaction_e2e.py        # PII が全経路で redact される
└── test_tenant_isolation_e2e.py     # tenant 間でデータ混入しない
```

### 5.2 性能受入テスト

`make perf-acceptance`:
- seed 100 億行
- locust 1000 users 30 分
- p95 / p99 / error rate を targets.yaml と比較
- 20% 劣化で fail

### 5.3 セキュリティ受入テスト

- OWASP ZAP DAST scan: critical 0
- バンドル size scan: 規定値以下
- gitleaks: 平文 secret 0
- license scan: GPL / AGPL 混入 0

### 5.4 業界受入テスト

業界 advisor（元 SV / FC 本部経験者）がチェックリストでレビュー：
- レシピ原価の単位 / 換算が業界慣行と整合
- シフト法令違反検知の閾値が労基署の運用と整合
- HACCP の CCP 設定が一般飲食店 ガイドラインと整合
- ロイヤリティ計算の控除項目が標準的な FC 契約と整合

---

## 6. 注意

- Evidence は **「写真より動画、動画より自動テスト、自動テストより本番ログ」**の優先度
- 「動いてはいるが顧客が使ってない」は加点しない（特に 03 / 04 / 08）
- 監査系 Evidence は **取得から失効まで継続**。年次更新が止まれば該当点は失効
- 一度認定された点も、Evidence の失効・劣化で **下方修正** される
- 100 点は「業界デファクト候補」を意味するが、**継続して維持できなければ単なる過去の栄光**
