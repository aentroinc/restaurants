# 実装ギャップ分析

3 つの PoC ドキュメントの記述内容と、`main/backend/`・`main/frontend/` の現コードベースを突き合わせた結果。

> 自動生成（並列エージェントによる読み取り専用調査）。コードは時間とともに変わるので、レビュー時はリポジトリ最新状態でクロスチェック推奨。

---

## A. 01-customer-data-request-pack.md ↔ 実装

10 個の CSV テンプレート vs `backend/app/models/`

| # | CSV テンプレート | 対応モデル | 状態 | 主な不整合 |
|---|---|---|---|---|
| 3.1 | `store_master.csv` | `Store` | 🟡 | `closing_date`, `floor_area`, `parking_capacity` 未実装。`sv_code/sv_name` は Area 経由で間接化されており顧客 CSV 形式と乖離 |
| 3.2 | `product_master.csv` | `Product` | 🟡 | `category_l3`, `tax_type`, `start_date/end_date` 未実装。期間限定商品の正確な分析が困難 |
| 3.3 | `daily_sales.csv` | `DailyStoreSales` | ✅ | 完全一致 |
| 3.4 | `hourly_sales.csv` | `HourlyStoreSales` | ✅ | 完全一致 |
| 3.5 | `product_sales.csv` | `DailyProductSales` | ✅ | 完全一致 |
| 3.6 | `labor_actuals.csv` | `LaborActual` | ✅ | 完全一致 |
| 3.7 | `store_pl.csv` | `StorePL` | ✅ | 完全一致 |
| 3.8 | `budget_targets.csv` | （未実装） | 🔴 | テーブル・モデルが一切なし。予実分析不可 |
| 3.9 | `sv_visits.csv` | `SVVisit` | 🟡 | `next_action_required` 未実装（findings JSON に格納可能） |
| 3.10 | `reviews.csv` | `Review` | 🟡 | `category` 列未実装（speed/quality/cleanliness 等） |

### 推奨対応
- **PoC 開始前に必須**: `BudgetTarget` モデル新設（予実分析は経営会議資料の核なので）
- **PoC 中に対応可**: `Product.tax_type`, `Product.category_l3`, `Product.start_date/end_date`, `Review.category`, `SVVisit.next_action_required` の列追加
- **顧客説明で吸収**: Store の SV/店長は Area 経由で受ける旨を顧客 IT に説明

---

## B. 03-enterprise-security-data-handling-brief.md ↔ 実装

| # | ドキュメント記述 | 状態 | 補足 |
|---|---|---|---|
| 3.1 | テナント分離（全テーブルに `company_id`、API 自動フィルタ） | 🟡 | `tenant_id` は全テーブルにあるが API ミドルウェアでの自動フィルタ未実装 |
| 3.2 | 環境分離（local / staging / production） | 🟡 | `ENVIRONMENT` env var 定義済み。環境別データアクセス制御ロジック未実装 |
| 3.4 | 暗号化（TLS / 保存時暗号化） | 🔴 | docker-compose に TLS 設定なし。Postgres at-rest 暗号化未設定 |
| 4.1 | 認証（メール/パスワード + 強固ポリシー + 2FA） | 🔴 | 認証エンドポイント未実装。`User.password_hash` フィールドはあるが bcrypt 未配線。2FA 完全未着手 |
| 4.2 | RBAC + ABAC（9 ロール） | 🟡 | `AccessScope` モデルと `User.role` あり。API 層で権限チェックロジックなし |
| 5 | 監査ログ（15 項目を自動記録） | 🟡 | `AuditLog` モデルあり。API 層で自動記録する middleware なし |
| 6.5 | AI 監査ログ | 🟡 | `AIQueryLog` モデルあり。`/api/v1/ai/query` で保存ロジックの配線が必要 |
| 7.1 | Ingestion Sandbox（8 段階フロー） | 🟡 | `IngestionBatch / DataContract / SchemaMapping` モデルあり。8 段階ロジック未実装 |
| 7.2 | Data Quality Gate | 🟡 | `DataQualityIssue` モデルあり。自動昇格判定ルールの実装なし |

### PoC 開始までに必須
1. **API テナント分離フィルタ**: 全エンドポイントに `where(Model.tenant_id == current_user.tenant_id)` を強制する依存性注入
2. **認証エンドポイント + bcrypt**: ログイン・ログアウト・パスワード変更
3. **監査ログ middleware**: POST/PATCH/DELETE を自動捕捉
4. **AI Query ログ記録**: `/api/v1/ai/query` で質問・回答・参照データ・ユーザーIDを保存
5. **環境別アクセス制御**: `ENVIRONMENT=production` 時の本番データ保護

### PoC 開始後に許容
- TLS（本番化時に nginx 等で終端）
- 9 ロール完全 RBAC（PoC は最小ロールで開始）
- 2FA（本導入時）
- Ingestion 8 段階フロー全実装（PoC は簡略化）
- Data Quality Gate 自動判定の閾値ロジック

---

## C. 02-eight-week-poc-operating-playbook.md ↔ 実装

### 週次成果物 vs 実装状態

| 週 | 主要成果物 | 状態 | コメント |
|---|---|---|---|
| W3 | Reconciliation Report (POS↔PL ±1%) | 🔴 | `DataQualityIssue` モデルあり。POS↔PL 自動合致検証ロジックなし |
| W4 | Executive Cockpit | ✅ | `/api/v1/executive/summary` 実装済み。frontend に経営概要画面あり |
| W4 | Store Ranking | ✅ | `/api/v1/stores/ranking` 実装済み。`/stores` ページで利用可能 |
| W4 | 人件費・原価・売上低下 異常店舗 | ✅ | `/api/v1/executive/issues` で issue 別に検出 |
| W4 | 店舗詳細 / Profit Graph | ✅ | `/stores/{id}`, `/stores/{id}/profit-graph` 実装済み |
| W5 | 店舗別原因分析 | 🟡 | AI Query で簡易あり。詳細分解が不足 |
| W5 | 類似店舗比較 | 🟡 | `peer_comparator.py` service あり。API endpoint なし |
| W5 | 人時売上分析 | 🟡 | `kpi_calculator.py` で計算。専用 API なし |
| W5 | 商品構成分析 | 🔴 | `DailyProductSales` モデルあり。query endpoint なし |
| W6 | SV Mission Board | ✅ | `/api/v1/sv/missions` + sv-missions ページ実装済み |
| W6 | SV別巡回優先順位 | ✅ | 優先度スコアリング（`sv_prioritizer.py`）あり |
| W6 | 改善タスク設計 | ✅ | `/api/v1/tasks` POST/PATCH 実装済み |
| W7 | ROI試算 | 🟡 | `ValueCase` モデル・API あり。自動計算は service 止まり |
| W7 | Board Meeting Pack | 🟡 | Pack/Item の作成 API あり。自動生成・PDF export なし |
| W7 | 本導入ロードマップ | 🔴 | export 機能未実装 |

### KPI 計算可否

| KPI | 計算可能か | 補足 |
|---|---|---|
| 売上 (net_sales) | ✅ | `StoreDailyKPI` で集計、YoY 比較済 |
| 客数 | ✅ | `DailyStoreSales`, `StoreDailyKPI` |
| 人件費率 | ✅ | `StoreDailyKPI.labor_cost_rate` |
| 原価率 | ✅ | `StoreDailyKPI.cogs_rate`（ただし理論 vs 実績の分解なし）|
| 人時売上 | ✅ | `StoreDailyKPI.sales_per_labor_hour` |
| FL比率 | ✅ | `StoreDailyKPI.fl_ratio` |
| 営業利益 | ✅ | `StorePL.operating_profit` |
| 改善余地金額 | ✅ | `improvement_estimator.py` で peer-adjusted 試算 |

### 8週完走に向けた必須開発（優先度順）

**Phase 1: Week 3-4 ゲート（必須・3-5日想定）**
- POS ↔ PL Reconciliation Logic（±1% チェック → `DataQualityIssue` 自動記録）
- Week 3 Data Quality Report の export 機能

**Phase 2: Week 5 分析機能（高・推定 7-10日）**
- Product Mix 分析 API（`DailyProductSales` query）
- Peer Comparison API（service を endpoint 公開）
- Issue → Task 自動生成

**Phase 3: Week 6-7 実行/報告機能（中・推定 12-16日）**
- Board Meeting Pack 自動生成（Issue/SV Mission → Pack Item）
- ROI 自動計算（ValueCase の baseline/measured 期間 impact）
- 本導入ロードマップ Export（PDF/PPTX）

**推定総工数: 35-45 人日（バックエンド 2名 + フロント 1-2名）**

### リスク
- **データが汚い / POS↔PL 合致しない**: Reconciliation 実装ゼロ。Week 1-2 で実データの合致状況を早期把握して許容差分を再交渉する仕組みが必要
- **W5 分析の遅延**: 商品分析 API・peer 比較・人時売上分析の 3 つが揃わないと Week 5 が薄くなる。Week 2 から並行開発開始が前提
- **W7 報告の見栄え**: PDF/PPTX export がないと経営陣への説得力が落ちる。テンプレート化必須

---

## 横断観点

- **データ依頼書 vs セキュリティ説明書 の整合**:
  - 依頼書 4.1「個人情報を匿名化」⇄ セキュリティ 2.2 「PoC では原則受領しない」 → 整合 ✅
  - 依頼書はファイル提出経路を SFTP 推奨、セキュリティ説明書はそれを保証する仕組みの言及が薄い → 補強の余地あり
- **データ依頼書 vs プレイブック の整合**:
  - 依頼書「過去 13〜25 か月」⇄ プレイブック Week 1「対象期間確定」 → 整合 ✅
  - 依頼書 7「最小 PoC データ判定」が Week 0 の Go/No-Go と重複しているが、依頼書側がより具体 → プレイブック Week 0 から依頼書 7 への参照を追加するとよい
- **セキュリティ説明書 vs プレイブック の整合**:
  - セキュリティ 11「顧客データ受領前」チェックリスト ⇄ プレイブック Week 0 → 整合 ✅
  - プレイブック Week 8 の Executive Readout 後の「データ削除/保持」がセキュリティ 8 を参照していない → 相互リンクで強化可能

## 顧客に出す前の最終チェック

- [ ] **A セクション**の 🟡/🔴 を、ドキュメント本文に「現状は X、PoC では Y で対応」と明記
- [ ] **B セクション**の「PoC 開始までに必須」5 項目をスプリントに組み込む
- [ ] **C セクション**の Phase 1 を Week 0 までに完了させる計画
- [ ] 3 ドキュメント間の相互リンク（README に書いた読み順 `00 → 01 → 03 → 02` が機能するか）
