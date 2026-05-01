# 外食チェーン経営OS Enterprise PoC 完成パッケージ索引 v1

## 0. この索引の目的

本資料は、外食チェーン経営OSを「顧客データ投入直前」まで持っていくために必要な仕様書群の使い方を整理する。

現時点で必要な仕様群は以下である。

1. restaurant_os_product_spec.md
2. restaurant_os_spec_evaluation.md
3. restaurant_os_v2_delta_spec.md
4. claude_code_build_plan.md
5. restaurant_os_pre_ingestion_enterprise_readiness_spec.md
6. customer_data_request_pack.md
7. eight_week_poc_operating_playbook.md
8. enterprise_security_data_handling_brief.md

---

# 1. 各ファイルの役割

## 1.1 restaurant_os_product_spec.md

プロダクト本体の基本仕様。

含まれるもの。

- コンセプト
- Core Ontology
- モジュール設計
- フロントエンド仕様
- バックエンド仕様
- データモデル
- API初期案
- MVPスコープ
- 開発ロードマップ

主な用途。

- プロダクト開発の土台
- Claude Code初期開発指示
- 営業デモ設計

## 1.2 restaurant_os_spec_evaluation.md

現行仕様の評価レポート。

主な用途。

- 何が足りないかの確認
- Palantir的に不足する要素の把握
- 開発優先順位の整理

## 1.3 restaurant_os_v2_delta_spec.md

外食版Palantirに近づけるための追加仕様。

含まれるもの。

- Ontology Runtime
- Workflow Engine
- ROI Measurement
- Connector Strategy
- Industry Playbook
- AI Governance

主な用途。

- v1を単なるBIで終わらせないための設計
- 本導入/全社展開に向けた拡張設計

## 1.4 claude_code_build_plan.md

Claude Codeで開発するための実装計画。

主な用途。

- 開発順序
- 分割プロンプト
- 受け入れ条件
- 5分デモスクリプト

## 1.5 restaurant_os_pre_ingestion_enterprise_readiness_spec.md

顧客データ投入前に必要なエンタープライズ準備仕様。

含まれるもの。

- Tenant Isolation
- Data Contract
- Ingestion Sandbox
- Schema Mapping
- KPI Governance
- Reconciliation
- Data Quality Gate
- RBAC/ABAC
- Audit Log
- AI Governance

主な用途。

- 実データ受け入れ前の事故防止
- 情シス/データ担当との会話
- 本番に近いPoC準備

## 1.6 customer_data_request_pack.md

顧客に提出するデータ依頼書。

含まれるもの。

- 必須データ一覧
- CSVテンプレート
- 必須/任意カラム
- 匿名化ルール
- データ提出チェックリスト
- 受領後チェック項目

主な用途。

- 顧客からデータをもらう
- PoC前の混乱を減らす
- 情シス/経理/店舗運営/商品部に依頼を出す

## 1.7 eight_week_poc_operating_playbook.md

8週間PoCを成功させるための運用台本。

含まれるもの。

- Week 0〜8の進行
- 会議体
- 成果物
- 成功条件
- リスクと対策
- 本導入判断基準

主な用途。

- PoC運営
- 顧客との合意形成
- Executive Readout準備

## 1.8 enterprise_security_data_handling_brief.md

情シス・法務・経営陣向けのセキュリティ/データ取扱説明書。

含まれるもの。

- データ取扱方針
- AI利用方針
- 権限管理
- 監査ログ
- データ削除
- 障害対応
- 想定Q&A

主な用途。

- 情シス/法務突破
- NDA後のデータ受領前説明
- セキュリティチェックシート前の概要説明

---

# 2. 開発で使う順番

Claude Codeに渡す順番は以下。

## Step 1：MVP構築

渡すファイル。

1. restaurant_os_product_spec.md
2. claude_code_build_plan.md

目的。

- 動くフルスタックMVP
- ダミーデータ
- Executive Overview
- Store Ranking
- Store Detail
- SV Mission
- Board Meeting Pack
- AI Analyst

## Step 2：Palantir化

追加で渡すファイル。

3. restaurant_os_v2_delta_spec.md

目的。

- Ontology Runtime
- Workflow Engine
- ROI Measurement
- AI Governance
- Industry Playbook

## Step 3：実データ受け入れ準備

追加で渡すファイル。

4. restaurant_os_pre_ingestion_enterprise_readiness_spec.md
5. customer_data_request_pack.md

目的。

- Data Contract
- Ingestion Sandbox
- Schema Mapping
- Data Quality Gate
- Reconciliation
- 顧客CSV受け入れ準備

## Step 4：PoC運用・営業投入

追加で渡すファイル。

6. eight_week_poc_operating_playbook.md
7. enterprise_security_data_handling_brief.md
8. restaurant_os_spec_evaluation.md

目的。

- 顧客提案
- PoC運営
- 情シス/法務対応
- 本導入提案

---

# 3. 現時点の到達レベル

この仕様群に従って開発できた場合、到達レベルは以下。

| 領域 | 到達レベル |
|---|---|
| 営業デモ | 高い |
| 有料PoC提案 | 高い |
| 初期顧客の実データ受け入れ | 中〜高 |
| エンタープライズ情シス説明 | 中〜高 |
| 店舗別利益改善分析 | 高い |
| SV改善ワークフロー | 中〜高 |
| AI Analyst | 中 |
| Palantir的オントロジー | 中〜高 |
| 本番全社利用 | まだ追加開発が必要 |

正確な表現。

> 日本の外食版Palantirを目指すための、Enterprise PoC-readyプロダクト仕様。

まだ言い切れない表現。

> すでに完成された日本の外食版Palantir。

---

# 4. これで「完成」と言える範囲

この仕様群で完成と言えるのは以下。

- 顧客に見せる営業デモ
- 有料PoCの提案
- PoCの運用設計
- 顧客データ依頼
- データ受領前セキュリティ説明
- 顧客データ投入前の安全設計
- 初期分析モジュール
- 経営会議/店舗改善の初期ワークフロー

完成と言えないもの。

- 1000店舗規模の本番SLA運用
- 複数社同時運用での実績
- すべてのPOS/勤怠/会計との標準コネクタ
- 完全なSSO/監査/法務対応
- 業態別プレイブックの実データ検証済み精度
- ROI実績の証明

---

# 5. 次の最重要アクション

## 5.1 開発

まずは以下を作る。

1. ダミーデータ100店舗
2. Executive Overview
3. Store Ranking
4. Store Detail / Profit Graph
5. SV Mission Board
6. Board Meeting Pack
7. AI Analyst
8. Data Quality Center

## 5.2 営業

同時に以下を準備する。

1. 5分デモスクリプト
2. PoC提案書
3. Customer Data Request Pack
4. Security Brief
5. 8-week PoC Playbook

## 5.3 初期顧客

狙うべき顧客。

- 100〜300店舗
- 準大手外食チェーン
- 内製DXが強すぎない
- 店舗別PL/人件費/原価に課題がある
- 経営陣が本部運営に関心を持っている

---

# 6. 最終判断

この仕様群が揃った状態は、かなり強い。

ただし、プロダクトの本当の価値は仕様書ではなく、1社目の実データPoCで証明される。

最初のゴールは以下。

> 顧客の経営陣に、実データで「どの店舗を、なぜ、どう改善するか」を示し、経営会議とSV運用に入り込むこと。

これができれば、日本の外食版Palantirにかなり近づく。
