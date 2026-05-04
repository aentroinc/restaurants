# 01 — 情報設計 / URL / SEO

## サイトマップ

```
https://aentro.jp/restaurants/
├── /                              ← Hero + 全要素サマリ（最重要、滞在60秒で完結）
├── /how-it-works                  ← 仕組み（Action Loop アニメ + 4ステップ）
├── /value                         ← 業界実績 + ROI 計算機
├── /security                      ← セキュリティ + コンプライアンス
├── /poc                           ← 8週POC 提案書 + 5テーマ説明
├── /vs                            ← 競合比較
├── /demo                          ← デモ予約フォーム
├── /docs/                         ← 公開ドキュメント（後段）
│   ├── /architecture
│   ├── /api-reference
│   └── /case-studies/[id]
└── /jp/legal                      ← プライバシー / 利用規約 / 特商法
```

## 各ページの責務

### `/` (Top)

**ジョブ**: 60秒以内に「何ができる、何が違う、次に何する」を伝える

**構成 (上から)**:
1. Hero (1 viewport): 一行価値命題 + 28秒デモ動画自動再生
2. Trust strip: 業界実績数値 (¥32.1億 / 9,240店 / 5社)
3. 課題 → 解決 (3カラム): 既存 BI / Palantir / AENTRO
4. 機能ハイライト (2x2 グリッド): 経営エグゼ / Daily Brief / Workflow Builder / POC Wizard
5. Action Loop アニメーション (横スクロール 4ステージ)
6. 5社事例カルーセル
7. POC オファー: 8週間 ¥4M でいくら戻ってくるか
8. アーキテクチャ図 (overlay 思想)
9. CTA: 「デモを依頼」 / 「Security Pack DL」

**ファーストビュー (above the fold)**:
- 左: 大見出し（48px）+ サブ見出し（20px）+ Primary CTA + Secondary CTA
- 右: プロダクトのスクリーンショット（Daily Brief モバイル風）or 動画

### `/how-it-works`

**ジョブ**: 「動く絵」で AI Loop の説得力を強化

**構成**:
1. 28秒動画（demo-tour 録画）or live iframe
2. 4 ステージ詳細解説（AI 検出 / SV 配布 / 店舗実行 / POS 反映）
3. 各ステージのスクリーンショット + 解説
4. CTA: 「実際の画面を触る (デモ依頼)」

### `/value`

**ジョブ**: 数字で説得

**構成**:
1. ROI 計算機 (input: 店舗数 + ブランド数 + 年商) → output: 年間改善見込み額
2. 5 case studies 詳細（/case-studies/[id] へリンク）
3. KPI 別効果 (廃棄 / 欠品 / 人時売上 等)
4. 信頼性: 統計検定方法 + 計算前提
5. CTA: 「POC 提案書 DL」

### `/security`

**ジョブ**: 情シス審査を 1 ページで通す

**構成**:
1. 一覧表: SOC2 / SSO / MFA / Audit / Encryption / Tenant 分離 / DR
2. アーキテクチャ図（VPC isolated / Aurora encrypted / KMS）
3. データ取扱方針（PII redaction / Column policy）
4. LLM 利用方針（Anthropic 直接 / no retention / 監査ログ）
5. CTA: 「Security Review Pack DL」

### `/poc`

**ジョブ**: 8週POC を即決させる

**構成**:
1. 4-step Wizard プレビュー（実プロダクトの POC Wizard を埋め込み or 録画）
2. 5 テーマ説明 (ZP-01 〜 ZP-05)
3. 週別計画
4. 価格: ¥4M 一括 / 改善額の20% 成功報酬選択
5. 終了時の成果物: 経営報告書 / 事業部レポート / IT レポート
6. CTA: 「POC 起動相談」

### `/vs`

**ジョブ**: NTT/SAP/Tableau との違いを明示

**構成**:
1. 12 機能 × 5 ベンダー比較表
2. 「なぜ AENTRO」3 段
3. 「他社で届かない理由」3 社別
4. ポジションステートメント
5. CTA: 「比較表 PDF DL」

### `/demo`

**ジョブ**: デモ予約 conversion を上げる

**構成**:
1. 短い説明（45分・無料・オンライン or 訪問）
2. フォーム: 会社名 / 役職 / 店舗数 / 業態 / メール / 電話 / 希望日時
3. submit → calendly 連携
4. confirm 画面: 「○月○日○時に弊社 CTO がメール」+ Security Pack 即 DL リンク

## URL 命名規則

| 規則 | 例 |
|------|-----|
| 全 lower-case + hyphen | `/how-it-works` |
| トップは `/` のみ | `/` not `/home` |
| 動詞ベースは避ける | `/value` not `/see-value` |
| 業界用語の英語化を避ける | `/poc` not `/proof-of-concept` |
| 階層は最大 2 段 | `/docs/architecture` |

## SEO 設計

### Primary Keywords (TOP 6)

| キーワード | 月間検索数 | competitive | 戦略 |
|-----------|----------|-------------|------|
| 外食 経営 AI | 480 | low | TOP page で main target |
| 外食チェーン データ統合 | 320 | low | /how-it-works |
| 飲食 BI ツール | 1,900 | medium | /vs で comparison |
| 多店舗 シフト最適化 | 720 | low | /value で sub target |
| HACCP 監視 システム | 590 | medium | /security |
| 外食 POC | 90 | very low | /poc |

### 各ページの meta

| Page | Title | Description |
|------|-------|-------------|
| / | AENTRO Restaurant OS — 外食大手向け AI 経営レイヤー | 既存システム置換せず、1 ブランド 8週間で収益改善を円換算で証明。日本の外食チェーン専用の AI × データ統合プラットフォーム |
| /how-it-works | 仕組み — AENTRO | AI が異常検出、SV に配布、現場で実行、POS に反映。28秒で見るループ全体 |
| /value | ROI 試算 — AENTRO | 5社累計 ¥32.1億 改善実績、店舗数とブランドから年間改善見込みを試算 |
| /security | セキュリティ — AENTRO | SOC2 相当 / SSO / MFA / 列マスク / VPC isolated / DR 対応 |
| /poc | 8週間 POC — AENTRO | 廃棄削減 / 人員配置 / SV 訪問 等 5 テーマから 1 つ選び、8週間で効果を統計検定で証明 |
| /vs | 競合比較 — AENTRO | NTT データ / SAP / Tableau / Smaregi BI との 12 機能比較 |

### Open Graph

- og:image: 1200x630 ヒーロー画像（プロダクトの Daily Brief or Action Loop screenshot）
- og:type: website
- og:locale: ja_JP

### Schema.org

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "AENTRO Restaurant OS",
  "applicationCategory": "BusinessApplication",
  "applicationSubCategory": "RestaurantOperationsManagement",
  "operatingSystem": "Cloud",
  "offers": {"@type": "Offer", "price": "4000000", "priceCurrency": "JPY", "name": "8週間 POC"},
  "aggregateRating": {"@type": "AggregateRating", "ratingValue": "5", "reviewCount": "5"}
}
```

## ナビゲーション

### 上部 nav (sticky)

```
[Logo AENTRO]   仕組み | 効果 | セキュリティ | POC | 比較     [デモを依頼]
```

- モバイル: ハンバーガーメニュー
- スクロール時に 高さ縮小（80px → 60px）

### Footer

```
製品                解決                会社                法務
- 仕組み            - 廃棄削減          - About             - Privacy
- 効果              - 人員配置最適化    - 採用              - 利用規約
- セキュリティ      - SV 効率化         - お問合せ          - 特商法
- POC               - QSC 統合
- 比較              - PMI 加速

© 2026 AENTRO Inc.   [Twitter] [LinkedIn]
```

## アクセシビリティ

- WCAG 2.1 AA 準拠
- すべてのインタラクティブ要素に focus state
- カラーコントラスト 4.5:1 以上
- 動画は字幕付き（自動再生は muted）
- form は label 必須

## 多言語

- 日本語: メイン
- 英語: 海外展開時に追加（Phase 2）
- URL: `/en/...` で分離

## 計測タグ

| ツール | 用途 |
|--------|------|
| Google Analytics 4 | 全イベント |
| Hotjar | ヒートマップ + record |
| Linkedin Insight Tag | リターゲ広告 |
| Slack webhook | デモ予約即通知 |

各 CTA クリックにイベント発火: `cta_click_{section}_{action}`

## Conversion Funnel 設計

```
TOP 訪問
  ↓ 60% scroll past hero
Hero CTA クリック
  ↓ 8% click rate
/demo 訪問
  ↓ 30% form submit
デモ予約
  ↓ 60% show up
デモ実施
  ↓ 40% qualify
商談 → POC
```

各 step を GA4 で計測、ボトルネック特定 → A/B test。

## A/B テスト第1陣 (ローンチ後 1ヶ月)

| 場所 | バリアント |
|------|----------|
| Hero CTA copy | "デモを依頼" vs "8週間で試す" |
| Hero 画像 | Daily Brief vs Action Loop |
| 価格表示 | "¥4M / POC" vs "改善額の20%" |
| トラスト | 数字 vs 顔写真（許可取得後） |
