# 06 — Content Pipeline (写真・動画・Case Study 追加方針)

## 哲学

LP のコンテンツは **生もの**。
1度作って終わりではなく、月次で「数字」「事例」「役職者コメント」「画面」を更新する。

凍ったままの LP は売れなくなる。

---

## 月次更新サイクル

| 週 | やること | 担当 |
|----|----------|------|
| 第1週 | 数字 update（事例カード、Trust strip、ROI 計算機の前提） | 営業 + データ |
| 第2週 | 新規事例 1本追加 or 既存事例 update | CS |
| 第3週 | スクリーンショット refresh（プロダクト UI 変更追従） | デザイナー |
| 第4週 | パフォーマンス監査 + A/B test 結果 review + 次月施策 | LP 担当 |

---

## Case Study 追加プロセス

### 0. 顧客許可の取得

**前提**: 顧客との契約書に「事例公開の権利」条項を入れる。

```
契約書草案 (POC 契約):
"AENTRO は、本 POC で得られた知見・成果について、
 顧客の社名・担当者氏名・具体的店舗数を明示せずに、
 業態・規模感・改善内容・効果のみを匿名化して公開する権利を有する"
```

公開可能な情報:
- ✓ 業態（牛丼 / ファミレス / 寿司 等）
- ✓ 規模カテゴリ（500店規模 等）
- ✓ 改善 KPI と数値変化
- ✓ 介入内容
- ✓ 役職者コメント（役職のみ、氏名なし）

公開不可:
- ✗ 社名 / ブランド名
- ✗ 個別店舗の特定情報
- ✗ 売上絶対値
- ✗ 顧客所属組織図

### 1. 事例ドラフト作成

CS マネージャが POC 完了 W8 までに記入:

```markdown
---
id: case-006
industry: ハンバーガーチェーン
scale: 年商 200億円規模
stores: 約 250 店舗
theme: 商圏 Huff モデルで出店候補スコアリング
duration: 8週間 POC
annualImpact: ¥3.8億
publishedAt: 2026-08-15
---

## 課題

3年で 50店舗の純増を中計コミットしているが、出店候補の評価が
「営業部の経験 + 競合密度の手作業計算」で...

## 介入内容

AENTRO の Huff モデル + e-Stat メッシュデータを統合、
候補地 35 件を AI でスコアリング...

## 結果

| KPI | 評価方法 |
|-----|----------|
| 出店候補スコア精度 | 過去5店の実績売上と AI 予測の乖離率: 12%（業界一般 30%） |
| 評価工数 | 1案件 8時間 → 1時間 (-87%) |
| 採用案件の初年度売上達成率 | 既存 67% → 91% |

## 役職者コメント

> 商圏分析が「勘と経験」から「データと AI」に変わった。
> 役員会での説明も、議論できるレベルに。
> — 店舗開発部長
```

### 2. レビュー

- 事業責任者: 数字の妥当性
- 弁護士: 守秘義務 / 誇大広告
- 顧客（最終）: 「これで公開して問題ない」確認

### 3. 公開

```bash
git checkout -b case-006
echo "..." > content/case-studies/case-006.md
git commit -m "add case-006: hamburger chain expansion"
git push origin case-006
# PR → merge → auto deploy
```

LP の 5社事例カルーセル = 6 社に増える、Trust strip も自動更新。

---

## Trust strip 数字の管理

### 自動計算（PostgreSQL クエリ）

`scripts/update-trust-stats.ts` を毎月1日に Vercel cron で実行:

```typescript
// 全 PilotProject から集計
const totalAnnualImpact = await sumAnnualizedImpactYen()  // ¥32.1億 → 自動更新
const storeCount = await sumTargetStores()                  // 9,240 店
const customerCount = await countCompletedPilots()          // 5社
const conversionRate = await calculateConversionRate()      // 100%

// Vercel Edge Config に書き込み
await edgeConfig.set("trust_stats", {
  total_impact_yen: totalAnnualImpact,
  total_stores: storeCount,
  customer_count: customerCount,
  conversion_rate: conversionRate,
})
```

LP の `<TrustStrip>` は Edge Config から読み取り、build なしで自動更新。

---

## スクリーンショット pipeline

### 撮影頻度

- メインの Hero スクショ: 月1回
- 全 8 page スクショ: 四半期 (UI 変更時は即時)

### 撮影手順

1. main プロダクト最新版を `make dev` で起動
2. Demo データを seed: `make seed`
3. 各ページにアクセス、Chrome DevTools で 1920x1080 (or 750x1334) 設定
4. 必要に応じて mock data を polish (リアルな数字)
5. Lighthouse パフォーマンス確認後、screenshot
6. PNG → WebP 変換: `cwebp -q 90 input.png -o output.webp`
7. `public/images/screenshots/` に配置
8. Markdown alt text で SEO 最適化

### 自動化（将来）

`scripts/capture-screenshots.ts`:
```typescript
import { chromium } from "playwright"

const PAGES = [
  { path: "/daily-brief", filename: "daily-brief.png", viewport: { width: 1920, height: 1080 } },
  { path: "/zensho-executive", filename: "executive.png", viewport: { width: 1920, height: 1080 } },
  { path: "/action-loop", filename: "action-loop.png", viewport: { width: 1920, height: 1080 } },
  // ...
]

const browser = await chromium.launch()
for (const page of PAGES) {
  const ctx = await browser.newContext({ viewport: page.viewport })
  const p = await ctx.newPage()
  await p.goto(`http://localhost:3000${page.path}`)
  await p.waitForLoadState("networkidle")
  await p.screenshot({ path: `public/images/screenshots/${page.filename}` })
}
```

毎週月曜に自動実行 → PR で confirm → auto deploy。

---

## 動画追加 pipeline

### 動画候補（Phase 2 〜）

| 動画 | 長さ | 撮影方法 |
|------|------|----------|
| `ceo-message.mp4` | 45秒 | スマホで自撮り、明るい部屋 |
| `daily-brief-walkthrough.mp4` | 90秒 | OBS で画面録画 + 声 |
| `action-loop-explained.mp4` | 60秒 | 既存ページ録画 + ナレーション |
| `customer-testimonial-001.mp4` | 60-120秒 | 顧客許可取得後、訪問撮影 |
| `apollo-deploy-demo.mp4` | 30秒 | onboarding ページ録画 |

### 撮影前チェックリスト

- [ ] スクリプト準備
- [ ] 字幕 SRT ファイル準備（.srt）
- [ ] 解像度 1920x1080
- [ ] H.264 codec / 5Mbps 以下
- [ ] muted 自動再生 OK か確認

### 配置

```
public/videos/
├── hero-loop.mp4
├── how-it-works.mp4
├── ceo-message.mp4 (Phase 2)
└── customer-testimonial-001.mp4 (Phase 3)
```

CDN 配信:
- Vercel: 5GB まで無料、それ以上は Cloudflare R2 + CDN

---

## メールマガコンテンツ (Phase 2 ~)

### 配信頻度

月1回、第3金曜日。

### 配信先

- LP からの newsletter 登録者
- 既存 POC 顧客
- 商談中リード

### コンテンツ構成

```
件名: [AENTRO] 6月号 - すき家事例 + 新機能 Workflow Builder

[ヒーローイメージ]

H1: 今月のハイライト

# 1. 新規事例: 大手牛丼チェーンで深夜帯シフト最適化が動き出した
[200字 + 詳細リンク]

# 2. 新機能: 自然言語で workflow を作れるようになりました
[150字 + デモ動画 GIF]

# 3. 業界動向: 2026 年外食業界の人件費トレンド
[200字 + 統計図表]

# 4. 来月のイベント: フードシステムソリューション展に出展
[100字 + 申込リンク]

CTA: デモを予約 →
```

### Tool

- 配信: SendGrid Marketing Campaigns
- A/B test: 件名 / CTA
- Open rate / click rate を GA4 で計測

---

## ブログ / オピニオン記事 (Phase 3)

### 記事タイプ

1. **業界トレンド**: 「2026 年外食 DX の現状」(月1)
2. **テクニカル深掘り**: 「Difference-in-Differences とは何か」(月1)
3. **CEO の View**: 「なぜ AENTRO を作ったか」(隔月)
4. **顧客活用事例**: 「○○チェーンの SV ミッション最適化」(月1)

### SEO ターゲット

各記事に primary keyword を 1 つ:
- "外食 経営 DX"
- "外食 KPI 統合"
- "シフト最適化 AI"
- "HACCP 自動化"

### 配置

```
content/blog/
├── 2026-08-restaurant-dx-trends.md
├── 2026-08-did-explained.md
└── 2026-08-ceo-why-aentro.md
```

---

## ソーシャルメディア戦略

### LinkedIn (主戦場)

**頻度**: 週1〜2投稿

**コンテンツ種類**:
- 自社 LP の case study 抜粋（カルーセル post）
- 業界統計に AENTRO の見解を載せる
- POC 開始の announce
- イベント告知

**KPI**:
- LP への流入 月100+ session
- 経営層フォロワー 1000+

### X (Twitter)

**頻度**: 週3-4投稿

- ニュース速報
- 業界動向への short take
- LinkedIn と相互補完

### Note / メディア寄稿

- 月1: Note で長文記事
- 業界誌（フードビジネス、月刊食堂）に寄稿（半年に1）

---

## イベント / 展示会

### 出展候補

| イベント | 時期 | 規模 | コスト |
|----------|------|------|--------|
| FOODEX JAPAN | 3月 | 75,000人 | ¥600万 |
| ファベックス | 4月 | 65,000人 | ¥500万 |
| FOOD STADIUM EXPO | 7月 | 30,000人 | ¥300万 |
| フードシステムソリューション | 9月 | 20,000人 | ¥200万 |
| 外食 DX EXPO | 11月 | 15,000人 | ¥250万 |

### LP との連動

イベント期間中:
- 専用 LP `/events/foodex2027` で事前予約 + ブース番号
- イベント後にリード 100-300名 → メールマガ + 営業電話
- LP 訪問数 月200+ ブースト

---

## ROI 計算機の前提値 update

`/value` の ROI 計算機の前提値は `lib/roi-config.ts` で管理。

```typescript
export const ROI_CONFIG = {
  // 業界ベンチマーク（毎年 4月に更新）
  industryAverages: {
    waste_rate_pct: 2.8,
    stockout_rate_pct: 4.5,
    fl_ratio_pct: 62.0,
    labor_cost_rate_pct: 28.0,
  },
  // AENTRO 改善余地（毎月 case studies から自動更新）
  aentroImprovementRanges: {
    waste_reduction_pct: { min: 15, typical: 25, max: 40 },
    stockout_reduction_pct: { min: 20, typical: 35, max: 50 },
    labor_optimization_pct: { min: 1.5, typical: 2.5, max: 4.0 },
  },
  // POC 価格（経営判断で変更）
  pocPrice: 4_000_000,
  // 推奨 license 価格（規模別）
  licensePricing: {
    small: { stores_max: 100, annual: 24_000_000 },
    medium: { stores_max: 500, annual: 80_000_000 },
    large: { stores_max: 2000, annual: 200_000_000 },
    enterprise: { stores_max: 10000, annual: 500_000_000 },
  },
}
```

更新頻度:
- industryAverages: 年1回（公開統計）
- aentroImprovementRanges: 月1回（事例追加時）
- pocPrice / licensePricing: 経営判断で随時

---

## 法務 review が必要な箇所

毎月の更新で **必ず** 弁護士 review:

1. 新規事例の数字（誇大広告の判定）
2. 比較表の競合表記（差別的に見えるか）
3. 新規 testimonials（許諾範囲）
4. CTA の煽り文言

不安な表現:
- "100% 改善保証" ← 誇大広告
- "業界 No.1" ← 客観裏付け必要
- "5 社の社名（公開不可）"

OK な表現:
- "5社で実証、累計¥32.1億改善"
- "POC 契約 → 本契約への転換 100%"
- "業態別比較で AENTRO が機能網羅"

---

## アナリティクス確認 (毎週)

### KPI ダッシュボード（GA4）

毎週月曜に確認:
- ユニーク訪問数
- ページ別 滞在時間
- CTA クリック率
- Form completion rate
- Bounce rate

### Hotjar Heatmap

注目箇所:
- Hero CTA がどれだけ視覚的に強いか
- 比較表のスクロール深度
- フォームの記入途中離脱箇所

### Slack 通知

毎日 9:00 に GA から日次 summary を Slack に投稿:

```
[AENTRO LP 日次レポート 2026-08-15]
✓ 訪問: 142 (前日 +12%)
✓ デモ予約: 4 (累計今月 28)
✓ Security Pack DL: 12
⚠ /vs ページの bounce rate 78% (要 review)
```

---

## まとめ

LP は **生き物**。
- 月次で数字、事例、画像、動画を update
- A/B test を継続的に走らせる
- 顧客の声を反映、競合の動きを追う

LP 公開時の状態は「ベースライン」、そこから 6 ヶ月かけて 2x の conversion に育てる。
