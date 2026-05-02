# 13 — マスタースケジュール（12 ヶ月クリティカルパス）

> 00-overview の論理計画を **実行レベル** に落とした gantt。各週の責任者 / 成果物 / ゲート判定基準を明記。

---

## 全体俯瞰

```
              ┌── 50点 ──┐  ┌── 65点 ──┐  ┌── 80点 ──┐  ┌── 100点 ──┐
時期          T   M1  M2  M3  M4  M5  M6  M7  M8  M9  M10 M11 M12 M15
────────────────────────────────────────────────────────────────────
09 横断PF     ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  (Step1-7)
01 動的onto    ░░░░░██████████████████░░░░░░░░░░░░░░░░░░░░░  (Step1-7)
02 コネクタ    ░░░░░░░░██████████████████░░░░░░░░░░░░░░░░░░  (Smaregi→Air)
05 認証        ░░░░░░░░██████████████████░░░░░░░░░░░░░░░░░░  (bcrypt→SAML)
11 ベース      ░░░░░░░░░░██████░░░░░░██████████░░░░░░░░░░░░  (Phase1→2)
06 デプロイ    ░░░░░░░░░░░░░░██████████████░░░░░░░░░░░░░░░░  (TF→Helm→OTel)
03 LLM         ░░░░░░░░░░░░░░░░██████████████░░░░░░░░░░░░░░  (実DB→RAG)
10 AI safety   ░░░░░░░░░░░░░░░░░░░░██████████░░░░░░░░░░░░░░  (eval→cost→red)
07 パイロット   ░░░░░░░░░░░░░░░░░░░░░░░░██████████░░░░░░░░░░  (POC1→POC2)
04 Workspace   ░░░░░░░░░░░░░░░░░░░░░░░░░░██████████████░░░░  (Custom KPI)
08 業界深掘り   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░██████████████░░  (Phase A→C)
11 SOC2 T2     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██████████████  (6mo 運用)
12 GTM         ░░░░░░░░██████████████████████████████████████  (継続)
14 evidence    ░░░░░░░░░░░░██████████████████████████████████  (継続)
```

---

## Phase 1: T+0 〜 T+3M（50 点ライン到達）

**目標**: 1 社目 POC 受注可能な状態。製品コア「動く」 + セキュリティベースライン + 1 コネクタ。

### Month 1（T+0〜T+1M）

| 週 | 主活動 | 担当 | 成果物 / ゲート |
|---|--------|------|---------------|
| W1 | キックオフ + 09 Step1-2（tenant context 強制） | Platform Lead | tenant 強制 PR merge |
| W1 | 11 Step1（TLS / 暗号化 / 監査 middleware） | Security Lead | scan report |
| W1 | 02 Step1（スマレジ developer 登録） | Integration Lead | client_id 取得 |
| W2 | 09 Step3-4（性能基盤 + 集計パイプライン） | Platform Lead | locust + KPI 集計 |
| W2 | 11 Step2-3（DDQ + SAST/SCA/Container scan） | Security Lead | CI green |
| W2 | 02 Step2-3（モデル + 暗号化基盤） | Integration Lead | migration revision |
| W3 | 01 Step1-2（動的オントロジー モデル + ORM） | Platform Lead | 5 model created |
| W3 | 02 Step4（スマレジ auth / client） | Integration Lead | OAuth flow demo |
| W3 | 12 GTM: ICP / 価格表 / 提案テンプレ確定 | CEO + VP Sales | docs/sales/ 完成 |
| W4 | 01 Step3-4（API + 影響分析） | Platform Lead | API + impact UI |
| W4 | 02 Step5（ジョブランナー + scheduler） | Integration Lead | sandbox sync 完走 |
| W4 | 09 Step5（DQ ルール + Reconciliation） | Platform Lead | DQ report |

**M1 ゲート**: tenant 強制 / TLS / 監査 / コネクタ skeleton / 動的オントロジー API （**45 点**目標）

### Month 2（T+1M〜T+2M）

| 週 | 主活動 | 担当 | 成果物 |
|---|--------|------|-------|
| W5 | 01 Step5-6（既存 Brand 移行 + UI） | Platform + FE | dual-write log |
| W5 | 02 Step6-7（OAuth flow + UI） | Integration + FE | sandbox 接続 UI |
| W5 | 05 Step1-2（モデル + RBAC seed） | Security Lead | 8 role seed |
| W5 | 12 営業: パイロット候補 10 社接触開始 | VP Sales | CRM lead |
| W6 | 01 Step7（ガバナンス + audit） | Platform Lead | audit log 検証 |
| W6 | 02 Step8-9（lineage + テスト） | Integration Lead | E2E test |
| W6 | 05 Step3-4（policy + 列マスク） | Security Lead | row/column ACL test |
| W6 | 09 Step6-7（OTel + Grafana） | SRE Lead | dashboard 6 本 |
| W7 | **02 ゲート**: スマレジ sandbox → 1 顧客本番接続準備 | Integration | 顧客 commit |
| W7 | 05 Step5-6（OIDC SSO + bcrypt + login API） | Security Lead | SSO test |
| W7 | 11 Step5（control matrix 整備開始） | Security Lead | 50% 整備 |
| W8 | 09 Step8-9（partition + DB tier） | Platform Lead | partition migration |
| W8 | 05 Step7（MFA） | Security Lead | TOTP 動作 |
| W8 | 12 営業: 3 社 qualified → POC SOW 提示 | VP Sales | SOW 草案 |

**M2 ゲート**: 01 動的オントロジー UI 動作 / 02 sandbox 完走 / 05 SSO + MFA / 09 OTel（**55 点**目標）

### Month 3（T+2M〜T+3M）

| 週 | 主活動 | 担当 | 成果物 |
|---|--------|------|-------|
| W9 | **02 顧客 1 社で本番接続開始**（パイロット契約と同時） | Integration + CS | 本番 sync |
| W9 | 06 Step1-2（multi-stage Dockerfile + Terraform 着手） | SRE Lead | terraform apply |
| W9 | 03 Step1-2（pgvector + Anthropic SDK） | AI Lead | chat エンドポイント |
| W10 | 03 Step3-4（system prompt + 4 tools） | AI Lead | tool use loop |
| W10 | 09 Step10（5万店舗・1億行 性能テスト） | Platform Lead | p95 達成証跡 |
| W10 | **POC 契約 1 社目** | VP Sales + CS | 契約書 |
| W11 | 03 Step5-6（チャット endpoint + RAG） | AI Lead | streaming demo |
| W11 | 06 Step3（Helm chart skeleton） | SRE Lead | helm install |
| W11 | 07 Step1-2（パイロット環境テンプレート） | CS + SRE | dedicated VPC |
| W12 | 03 Step7-8（ガバナンス + UI） | AI Lead + FE | AI Analyst UI |
| W12 | 11 Step6（policy 文書 + CEO 承認） | Security Lead | 7 policy 文書 |
| W12 | **50 点ゲート**: SCORE.md 全領域評価、リソース再配分判定 | 役員 + PdM | SCORE 50+ |

**M3 ゲート（50 点）**: パイロット 1 社契約 / コネクタ本番接続 / SSO / OTel / AI Analyst 実 DB 接続

---

## Phase 2: T+3M 〜 T+6M（65 点ライン）

**目標**: パイロット 1 社進行 + 営業開始可能 + 本番デプロイ可。

### Month 4-5（T+3M〜T+5M）

| 週 | 主活動 | 担当 |
|---|--------|------|
| W13-14 | **POC W1-W2**: データ取り込み + DQ 検証（顧客と擦り合わせ） | CS + Integration |
| W13 | 03 Step9（eval set 30 問） | AI Lead |
| W13-14 | 05 Step8-9（SAML + audit UI） | Security Lead |
| W14 | 06 Step4（SOPS 導入） | SRE Lead |
| W15 | **POC W3**: KPI 構築 + 顧客固有 KPI を Custom KPI 用 spec で記録 | CS |
| W15 | 06 Step5-6（OTel 計装 + バックアップ） | SRE Lead |
| W15 | 10 Step1-2（eval CI） | AI Lead |
| W16 | **POC W4**: 仮説出し + AI Analyst で論点抽出 | CS + AI |
| W16 | 04 Step1-3（Workspace モデル + DSL） | Platform Lead |
| W16 | 11 Step5 完了（control matrix 100%） | Security Lead |
| W17 | **POC W5**: 介入実装（ValueCase 3 本） | CS + Vertical |
| W17 | 06 Step7-8（CI/CD + runbook） | SRE Lead |
| W17 | 10 Step3-4（red team + cost cap） | AI Lead |
| W18 | **POC W6**: 効果計測 + value_measurement | CS |
| W18 | 04 Step4-5（cohort + analysis runner） | Platform Lead |
| W18 | 12 営業: 2 社目 POC SOW 提示 | VP Sales |
| W19 | **POC W7**: Meeting Pack 報告書作成 | CS |
| W19 | 04 Step6-7（API + UI） | Platform + FE |
| W19 | 11 外部 gap assessment 開始 | Security Lead |
| W20 | **POC W8**: 経営層プレゼン + 本契約交渉 | CS + VP Sales |
| W20 | 04 Step8-9（Meeting Pack 統合 + KPI 昇格） | Platform Lead |
| W20 | 10 Step5-7（モデル選択 + PII + refusal） | AI Lead |

**M5 ゲート**: POC 1 社目完走、Workspace 動作、SOC2 readiness 50%

### Month 6（T+5M〜T+6M）

| 週 | 主活動 | 担当 |
|---|--------|------|
| W21 | パイロット 2 社目 POC 開始 | CS + Integration |
| W21 | 11 Step6-7（policy + Trust Center 公開） | Security Lead |
| W21 | 10 Step8-9（AI ガバナンス UI + 統合テスト） | AI Lead + FE |
| W22 | 02 Air or Square 第 2 コネクタ着手 | Integration Lead |
| W22 | 12 営業: AE 2 名 / CSM 2 名 hire 完了 | VP Sales |
| W23 | 06 prod-shared 本番立ち上げ | SRE Lead |
| W23 | パイロット 1 社目 本契約 commitment | VP Sales |
| W24 | **65 点ゲート**: 営業開始判定 / 価格表公開 / Trust Center 公開 | 役員 |

**M6 ゲート（65 点）**: 製品コア完成度高い、SOC2 Type 1 readiness、POC 完走 1 件、本契約 commitment 1 件

---

## Phase 3: T+6M 〜 T+9M（80 点ライン）

**目標**: 5 社並行運用 + SOC2 Type 2 完了 + 業界深掘り Phase A 完了。

### Month 7-9

| 週 | 主活動 |
|---|--------|
| W25-26 | パイロット 3 社目 / 4 社目 POC 開始 |
| W25-28 | 08 Phase A 着手（シフト法令 + FC ロイヤリティ） |
| W27 | 02 第 2 コネクタ完了 |
| W28-32 | 08 Phase A 完了 |
| W29-32 | 04 Workspace 顧客本番投入 |
| W30 | 03 RAG embedding 全顧客導入 |
| W30-36 | 11 Pマーク準備 + 内部監査 |
| W34 | パイロット 1 社目 本契約締結 |
| W36 | **80 点ゲート**: 5 社並行 / SOC2 Type 2 取得 / Pマーク取得 |

**M9 ゲート（80 点）**: 製品プロダクション運用、業界深掘り Phase A、コンプライアンス上位

---

## Phase 4: T+9M 〜 T+12M（100 点ライン）

**目標**: 業界深掘り完成 + 大手 1 社本契約 + 業界デファクト候補認知。

### Month 10-12

| 週 | 主活動 |
|---|--------|
| W37-44 | 08 Phase B（レシピ BOM + HACCP） |
| W37-44 | 08 Phase C 並行（QSC + Huff + Price Decision） |
| W40 | 03 顧客 DAU の 30%+ AI Analyst 利用達成 |
| W41 | 02 Webhook / CDC 対応 |
| W42 | 02 5 種コネクタ catalog 完成 |
| W44 | パイロット 5 社目 POC 完走、大手 1 社契約 commitment |
| W45-48 | 08 Phase B/C 完了 + 業界団体連携 |
| W46 | AENTRO Conference 第 1 回開催 |
| W48 | **100 点ゲート**: 全領域上限到達、業界デファクト候補認知 |

**M12 ゲート（100 点）**: 製品 100 点 + 大手契約 + 業界露出

---

## Phase 5: T+12M 〜 T+15M（ISMS）

| 月 | 活動 |
|---|------|
| M13 | ISMS scope 確定 + 情報資産目録 |
| M14 | Annex A 114 controls 整備 |
| M15 | 認証審査（Stage 1 + Stage 2） |
| M15 | ISMS 取得 → 100 点固定 |

---

## ゲート判定の運用

### 各ゲート（M3, M6, M9, M12）で判定する 5 つの問い

1. **目標点数到達したか？**（SCORE.md ベース、Evidence 必須）
2. **クリティカルパス上の停滞は？**（09 / 01 / 02 / 05 / 07 のいずれかが 2 週間遅延 → 全体再計画）
3. **顧客指標は？**（パイロット ROI、本契約 commitment、NPS）
4. **採用は順調か？**（hiring plan 達成率、退職）
5. **収益指標は？**（ARR、MRR、契約締結数）

### NG 時の対応パターン

- **製品停滞** → 04 / 08 を凍結し 02 / 05 / 09 に集中
- **顧客 ROI 不足** → 08 業界深掘り前倒し + Vertical Lead 強化
- **採用未達** → 報酬見直し + 業務委託活用 + 海外 remote 検討
- **収益未達** → 価格見直し + パートナーチャネル拡張

---

## 並列実行の調整ルール

### コアチーム週次運営

| 会議 | 頻度 | 参加 | アジェンダ |
|------|------|------|---------|
| Daily standup（チーム別） | 毎日 15min | 各チーム | yesterday/today/blockers |
| Tech sync | 週 2 (Mon/Thu) 30min | Lead 全員 | 横串連携 / 設計レビュー |
| Sprint review | 隔週金曜 1h | 全員 | demo + 振り返り |
| Eng all-hands | 月 1 1h | Eng 全員 | ロードマップ / OKR |
| Exec review | 隔週月曜 2h | 役員 + Lead | SCORE / リスク / 採用 |
| Customer sync | 月 1 1h | CS + Eng + Sales | 顧客フィードバック → 製品反映 |

### 依存ブロッキング解消ルール

ある領域が他領域の未完成を待っている場合:
- **2 営業日**以内に解消できる: 担当者間で直接調整
- **1 週間**以内: Lead 連名で優先順位調整
- **1 週間超**: Exec review で決定

---

## リスク早期警告

毎週 Friday の SCORE 更新時に以下を check:

| 警告 | トリガー | 対応 |
|------|---------|------|
| 🟡 Yellow | 週次目標の 70% 未達 | Lead が原因分析、来週リカバ計画 |
| 🟠 Orange | 2 週連続 Yellow | チーム会議で人員 / 優先度見直し |
| 🔴 Red | 3 週連続 Yellow / Orange | Exec review で escalation、scope 削減判断 |

---

## ガントチャート用データソース

`docs/roadmap/gantt.csv`（別途作成）:

```csv
domain,task,owner,start_week,duration_weeks,depends_on
09,Step1 tenant強制,platform_lead,W1,1,
09,Step2 isolation test,platform_lead,W2,1,Step1 tenant強制
01,Step1 model,platform_lead,W3,1,
01,Step2 ORM,platform_lead,W3,1,Step1 model
02,Step1 dev登録,integration_lead,W1,0.5,
...
```

ProjectLibre / monday.com / Linear に import して **可視化** + 進捗追跡。

---

## 注意

- このスケジュールは「**全部順調に進んだ理想線**」。実績は通常 1.3-1.5x かかる
- パイロット顧客のスケジュール都合は外乱要因 No.1。**契約時点で 8 週間 + 4 週間バッファ**
- T+3M で 50 点未到達なら、04 と 08 の前半を完全凍結し、02 / 05 / 09 に全リソース投下
- T+6M で営業開始できないなら、CRO hire を遅らせ AE 採用を pause
- `gantt.csv` は **領域 Lead の自己申告ベース**で更新、PdM がレビュー
