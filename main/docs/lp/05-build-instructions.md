# 05 — 実装手順 (週次)

## 全体タイムライン: 6 週間

```
Week 1: ベース構築 + Hero + Trust strip
Week 2: 全ページ skeleton + コピー流し込み
Week 3: コンポーネント polish + アニメーション
Week 4: Form + API + 計測 + ContentLayer
Week 5: コンテンツ充実 + 撮影 + 動画
Week 6: パフォーマンス調整 + ローンチ準備
```

各週の詳細を以下。

---

## Week 1: ベース構築

### Day 1: 環境構築

```bash
# 1. ディレクトリ作成
cd /Users/doohyw/restaurants
mkdir main-lp
cd main-lp

# 2. Next.js 初期化
npx create-next-app@latest . \
  --typescript --tailwind --eslint --app --no-src-dir \
  --import-alias "@/*"

# 3. 追加 dependency
npm install framer-motion lucide-react react-hook-form \
  @hookform/resolvers zod clsx tailwind-merge \
  contentlayer2 next-contentlayer2 \
  @vercel/analytics @vercel/speed-insights remark-gfm

# 4. 設定ファイル配置
# - tailwind.config.ts (03-visual-design.md 参照)
# - next.config.ts (04-tech-stack.md 参照)
# - tsconfig.json (strict: true)
```

### Day 2: ベース layout 構築

`app/layout.tsx`:
- フォント (Inter + Noto Sans JP) 読み込み
- ダーク mode 強制
- Analytics / Hotjar
- Nav + Footer placeholder

`app/globals.css`:
- design tokens (CSS variables)
- typography 階層

`components/nav.tsx`:
- sticky top
- 上スクロールで縮小
- モバイルハンバーガー

`components/footer.tsx`:
- 3 列構成
- ソーシャル + 法務リンク

### Day 3-4: Hero セクション

`components/hero.tsx`:
- 1 viewport 高さ
- 左: H1 + Sub + CTA × 2
- 右: ヒーロー画像 (placeholder で OK)
- 背景 gradient
- Scroll indicator（下矢印）
- Framer Motion で entry animation

```tsx
<section className="relative min-h-screen flex items-center">
  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.04] to-transparent" />
  <div className="container mx-auto px-6 py-20 grid lg:grid-cols-2 gap-12">
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-5xl lg:text-6xl font-bold text-white/95 leading-tight">
        外食グループの "次の一手" を、<br />
        <span className="text-emerald-400">8週間で数字にする。</span>
      </h1>
      <p className="mt-6 text-xl text-white/65 leading-relaxed">
        既存システムは置き換えません。POS・勤怠・物流に overlay する形で...
      </p>
      <div className="mt-8 flex gap-3">
        <Button variant="primary" size="lg">28秒のデモを見る →</Button>
        <Button variant="secondary" size="lg">POC 提案書 DL</Button>
      </div>
    </motion.div>
    <Image src="/images/hero-desktop.png" alt="..." width={800} height={600} priority />
  </div>
</section>
```

### Day 5: Trust strip + 課題セクション

`components/trust-strip.tsx`:
- 4 stat グリッド
- LiveCounter で 0 → 目標値 count up（スクロールで起動）

`components/problem-section.tsx`:
- 3 列カード比較（Tableau / Palantir / AENTRO）
- × ✓ アイコン

### Day 6-7: テスト + デプロイ確認

- `npm run dev` で確認
- Vercel に preview deploy 設定
- domain 仮設定: `aentro-lp-preview.vercel.app`

---

## Week 2: 全ページ skeleton + コピー流し込み

### Day 8-9: 機能ハイライト + Action Loop

`components/feature-grid.tsx`:
- 2x2 グリッド（Daily Brief / Action Loop / Workflow Builder / POC Wizard）
- 各カードに icon + 見出し + 説明 + プロダクトリンク

`components/action-loop-animation.tsx`:
- 4 ステージ horizontal scroll
- main プロダクトの `/action-loop` の核心ロジックを移植
- 自動再生 + 一時停止ボタン

### Day 10-11: 5社事例 + POC オファー

`components/case-cards.tsx`:
- 横スクロール carousel
- 5 カード
- 各カードに H4 + KPI 改善 + 年間額

`components/poc-offer.tsx`:
- 価格 ¥4M
- 成果物リスト
- リスク説明（返金保証）

### Day 12-13: アーキテクチャ図 + Final CTA

`components/architecture-diagram.tsx`:
- 4 layer の overlay 図
- SVG または Tailwind でレイヤー構造可視化
- "既存システム" ボックスを下に配置

`components/final-cta.tsx`:
- 大きな見出し
- Primary + Secondary CTA

### Day 14: TOP 完成、サブページ skeleton

サブページ作成 (各 page.tsx に最小実装):
- `/how-it-works`
- `/value`
- `/security`
- `/poc`
- `/vs`
- `/demo`

各ページに 02-copy-deck.md のコピーを **完全に** 流し込む。

---

## Week 3: コンポーネント polish + アニメ

### Day 15-16: Form 実装 (`/demo`)

`components/demo-form.tsx`:
- React Hook Form + Zod
- 9 fields
- field validation（store_count は数値、email は format）
- Submit 中 disabled
- 成功時 confirm 画面

`app/api/contact/route.ts`:
- Zod validate
- Slack webhook
- SendGrid 送信
- HubSpot CRM POST（optional）

### Day 17: ROI Calculator (`/value`)

`components/roi-calculator.tsx`:
- 4 input slider/dropdown
- 計算 logic
- output: 推定年間改善額 + 投資回収期間 + 推奨テーマ

```typescript
function calculateROI(stores: number, brands: number, revenueY: number, segment: string) {
  const wasteReduction = revenueY * 0.025 * 0.30 * 0.45  // 廃棄削減
  const stockoutReduction = stores * 1500000 * 12 * 0.50
  const laborOpt = stores * 8 * 365 * 50
  const meetingTime = brands * 3 * 1000000 * 12
  return wasteReduction + stockoutReduction + laborOpt + meetingTime
}
```

### Day 18: 比較表 (`/vs`)

`components/comparison-table.tsx`:
- 12 機能 × 5 ベンダー matrix
- AENTRO 列 highlight
- ✓ / ✗ / 部分対応 アイコン
- モバイル: 横スクロール、1列目 sticky

### Day 19: Security ページ

`/security` の table + アーキテクチャ図 + LLM 利用方針。
Compliance status table。

### Day 20-21: Animation polish

- Hero entry: Framer Motion で stagger
- Scroll reveal: Intersection Observer + animation classes
- Number counter: LiveCounter 移植
- Button hover: subtle elevation
- Card hover: border + transform

---

## Week 4: Form + API + 計測 + Content

### Day 22-23: 全 CTA 動作確認

各 CTA をクリックして:
- `/demo` に遷移
- Modal 開く
- DL リンクが正しい

custom event 発火確認:
```typescript
trackEvent("cta_click", { section, action })
```

### Day 24: ContentLayer 設定

`contentlayer.config.ts`:
```typescript
import { defineDocumentType, makeSource } from "contentlayer2/source-files"

export const CaseStudy = defineDocumentType(() => ({
  name: "CaseStudy",
  filePathPattern: "case-studies/**/*.md",
  fields: {
    id: { type: "string", required: true },
    industry: { type: "string", required: true },
    scale: { type: "string", required: true },
    stores: { type: "string", required: true },
    annualImpact: { type: "string", required: true },
    publishedAt: { type: "date", required: true },
  },
  computedFields: {
    url: { type: "string", resolve: (post) => `/case-studies/${post.id}` },
  },
}))

export default makeSource({
  contentDirPath: "content",
  documentTypes: [CaseStudy],
})
```

`app/case-studies/[id]/page.tsx`:
- Markdown を render
- KPI table を MDX で

### Day 25-26: Open Graph 画像生成

`app/opengraph-image.tsx`:
```typescript
import { ImageResponse } from "next/og"

export const runtime = "edge"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ background: "#0a0e14", display: "flex", ... }}>
        <h1>AENTRO Restaurant OS</h1>
        <p>外食大手向け AI 経営レイヤー</p>
      </div>
    ),
    { ...size }
  )
}
```

各サブページに同様の og image を作る。

### Day 27-28: SEO + sitemap + robots

03-visual-design.md と 01-information-architecture.md に従って実装。

---

## Week 5: コンテンツ充実 + 撮影 + 動画

### Day 29-30: スクリーンショット

`main/` 起動 → 8 ページの screenshot 取得:
1. Daily Brief (mobile + desktop)
2. Executive Command
3. Action Loop
4. Pilot Wizard Step 2
5. Workflow Builder
6. Case Studies
7. Security Review

mock データを polish（リアルな数字 / brand 名）して取得。

### Day 31-32: 動画録画

**`hero-loop.mp4`**:
- Action Loop ページの動作録画 28秒
- 1920x1080 60fps
- ffmpeg 圧縮: H.264 / 5Mbps / 5MB 以下

**`how-it-works.mp4`** (60秒):
- 4 ステップ別 録画
- ナレーション収録（声優依頼 or 創業者）
- 字幕付き
- subbtle BGM

```bash
ffmpeg -i hero-loop.mp4 -c:v libx264 -preset slow -crf 23 -c:a aac -b:a 128k -movflags +faststart hero-loop-optimized.mp4
```

### Day 33: 5 case studies markdown

`content/case-studies/case-001.md`:
```markdown
---
id: case-001
industry: 大手牛丼チェーン
scale: 年商 1,200億円規模
stores: 約 3,000 店舗
annualImpact: ¥18.2億
publishedAt: 2026-04-01
---

## 課題

深夜営業店の人時売上が業界平均より 15% 低、人件費率が上昇傾向...

## 介入内容

AENTRO の Workflow Builder で「もし深夜帯人時売上 -10% かつ 雨予報が出たら...」のルールを設定。

## 結果

| KPI | Before | After | 変化 |
|-----|--------|-------|------|
| 深夜帯人時売上 | ¥4,820/h | ¥5,210/h | +8.1% |
| 人件費率 | 32.4% | 30.1% | -2.3pt |
| 残業時間 | 月18.4h | 月14.7h | -20% |

## 役職者コメント

> シフト最適化を経験 → データに切り替えただけで、年間18億の改善が出た。
```

5本作成。

### Day 34-35: Hero 画像 + その他

ストック画像から候補を選定 → Photoshop / Figma で polish:
- ダーク照明調整
- 背景にプロダクト screenshot を重ねる
- 余白調整

最終的な Hero 画像 1920x1080 PNG / WebP。

---

## Week 6: パフォーマンス + ローンチ準備

### Day 36-37: Lighthouse 監査

```bash
npx lighthouse https://aentro-lp-preview.vercel.app --view
```

目標:
- Performance: 95+
- SEO: 100
- Accessibility: 95+

修正:
- 画像最適化（WebP / AVIF / next/image）
- Font preload
- Critical CSS inline
- Lazy load below fold

### Day 38: A/B test 設定

Vercel Edge Config で variant 切り替え:
- Hero CTA copy A: "デモを依頼"
- Hero CTA copy B: "8週間で試す"

```typescript
import { get } from "@vercel/edge-config"

export default async function Hero() {
  const variant = await get("hero_cta_variant") || "A"
  const cta = variant === "A" ? "デモを依頼" : "8週間で試す"
  // ...
}
```

### Day 39: Form integration test

実際にデモ予約フォームから送信:
- Slack に通知届く
- SendGrid から自動返信届く
- HubSpot に lead 投入される（設定時）

### Day 40: コンテンツ final review

- 全コピーを CEO + 営業 + 弁護士 で review
- 法務観点（誇大広告にあたらないか）
- 業界用語の正確性
- 数字の妥当性

### Day 41: domain 設定 + DNS

- Cloudflare DNS で `aentro.jp/restaurants/` または `restaurants.aentro.jp` 設定
- Vercel に custom domain 追加
- HTTPS 証明書自動発行確認
- WWW redirect 設定

### Day 42: ローンチ

**ローンチチェックリスト** は `07-launch-checklist.md` 参照。

完了後:
- 社内 announce (Slack #all-hands)
- LinkedIn / Twitter 投稿
- 業界メディア (FoodService.jp 等) にニュースリリース
- 既存リード（30社）に告知メール

---

## チーム構成

| 役割 | 人数 | 主な担当 |
|------|------|---------|
| デザイナー | 1 | コンポーネント / 画像 / Hero |
| FE エンジニア | 1 | 全ページ実装 / Form / API |
| コピーライター | 0.5 | コピー final / 法務調整 |
| 撮影 / 動画 | 0.3 | スクリーンショット / 動画 |
| QA / リーダー | 0.3 | review / lighthouse / launch |

合計 約 3.1 人月。Day x 8h で約 240時間 / 人。

---

## リスク

| リスク | 影響 | 対策 |
|--------|------|------|
| 画像 / 動画作成遅延 | ローンチ延期 | Week 4 までに発注、placeholder で先に build |
| ChatGPT で書いた感のあるコピー | 経営層が見抜く | 一人でゴーストライティング、CEO レビュー必須 |
| Vercel 課金超過 | 突発コスト | Cloudflare で edge cache、bandwidth 監視 |
| 競合に類似 LP 公開される | USP 弱体化 | ローンチ前に競合 LP 全 inventory、差別化見直し |
| デモ予約の質が低い | 営業負担 | フォームに qualify 質問追加（店舗数 1+ 必須など） |

---

## 参考になるデザイン

LP 制作前に以下を 1 時間ずつ研究:

1. https://www.palantir.com/platforms/foundry/ - 業界比較の構造
2. https://www.linear.app/ - ダーク + 数字の使い方
3. https://stripe.com/jp - Form / API / SEO の構造
4. https://airtable.com/solutions - 業界別 case studies の見せ方
5. https://www.notion.so/jp - 日本語版の typography

これらを「真似」するのではなく、**何が機能しているか**を分析する。

---

## 完了基準

- [ ] 7 ページ全て build エラーなし、Lighthouse 95+
- [ ] Form 送信が Slack + メールに届く
- [ ] 全コピーが 02-copy-deck.md と一致
- [ ] スクリーンショット 8 枚が高解像度で揃ってる
- [ ] og-image / favicon / sitemap / robots 設置済
- [ ] GA4 + Hotjar イベント計測動作
- [ ] HTTPS 証明書 + WAF 設定済
- [ ] CEO / 営業 / 弁護士 review 通過
- [ ] 30社 既存リードに告知メール送信済

ここまで来たら、本格運用開始。
