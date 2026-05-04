# 03 — Visual Design / Components / Imagery

## デザイン基本方針

**ターゲット**: ゼンショー級経営層 / 経営企画 / 情シス
**雰囲気**: Palantir 風の "spy-software-grade" 落ち着き + 日本企業のフォーマル感

**避ける**: 派手な色 / アニメ過剰 / B2C 風 (Notion 系)
**採用する**: ダークテーマ基調、数字を主役、スクリーンショットで信頼を作る

---

## デザイン Token

### Colors

```css
/* Background */
--bg-primary: #0a0e14;          /* メイン dark */
--bg-elevated: #0f1219;         /* card 背景 */
--bg-overlay: rgba(255, 255, 255, 0.02);  /* sub card */

/* Text */
--text-primary: rgba(255, 255, 255, 0.95);
--text-secondary: rgba(255, 255, 255, 0.65);
--text-muted: rgba(255, 255, 255, 0.40);
--text-disabled: rgba(255, 255, 255, 0.20);

/* Accent (use sparingly) */
--accent-blue: #3b82f6;         /* primary CTA */
--accent-blue-hover: #2563eb;
--accent-emerald: #10b981;      /* 良い数字 */
--accent-amber: #f59e0b;        /* 警告 / 注意 */
--accent-red: #ef4444;          /* 異常 */
--accent-purple: #a855f7;       /* AI / 提案 */

/* Border */
--border-default: rgba(255, 255, 255, 0.06);
--border-emphasis: rgba(255, 255, 255, 0.12);
--border-accent: rgba(59, 130, 246, 0.30);

/* Special */
--gradient-hero: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(59, 130, 246, 0.04));
--shadow-card: 0 4px 24px rgba(0, 0, 0, 0.40);
```

### Typography

```css
/* Font family */
--font-sans: "Inter", "Noto Sans JP", -apple-system, sans-serif;
--font-mono: "JetBrains Mono", "Source Code Pro", monospace;
--font-display: "Inter", "Noto Sans JP", sans-serif;  /* H1/H2 用 */

/* Scale */
--text-xs: 11px;     /* meta / caption */
--text-sm: 12px;     /* small label */
--text-base: 14px;   /* body */
--text-lg: 16px;     /* lead */
--text-xl: 20px;     /* H4 / sub */
--text-2xl: 24px;    /* H3 */
--text-3xl: 32px;    /* H2 */
--text-4xl: 48px;    /* H1 mobile */
--text-5xl: 64px;    /* H1 desktop */
--text-6xl: 80px;    /* hero impact */

/* Line height */
--leading-tight: 1.1;     /* H1 */
--leading-snug: 1.3;      /* H2 / H3 */
--leading-normal: 1.5;    /* body */
--leading-relaxed: 1.7;   /* paragraph */

/* Weight */
--weight-regular: 400;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;
```

### Spacing

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
--space-24: 96px;
```

### Border radius

```css
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
--radius-xl: 12px;
--radius-2xl: 16px;
```

### Animations

```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--duration-fast: 150ms;
--duration-normal: 300ms;
--duration-slow: 500ms;
```

---

## グリッドシステム

- 最大幅: 1280px (`max-w-7xl`)
- 内側 padding: 24px (mobile) / 48px (desktop)
- カラム: 12 column grid
- ガター: 24px (desktop) / 16px (mobile)

ブレークポイント:
- mobile: ~ 640px
- tablet: 640 ~ 1024px
- desktop: 1024px+
- large: 1280px+

---

## コンポーネント仕様

### Button

```typescript
<Button variant="primary" size="lg">
  デモを依頼
</Button>
```

| variant | bg | text | hover |
|---------|-----|------|-------|
| primary | --accent-blue | white | --accent-blue-hover |
| secondary | transparent | --accent-blue | bg-blue-500/10 |
| ghost | transparent | --text-secondary | bg-white/[0.04] |
| danger | --accent-red | white | red-600 |

| size | height | padding | font-size |
|------|--------|---------|-----------|
| sm | 32px | 12px | 12px |
| md | 40px | 16px | 14px |
| lg | 48px | 24px | 16px |
| xl | 56px | 32px | 18px |

### Card

```typescript
<Card>
  <CardHeader>...</CardHeader>
  <CardBody>...</CardBody>
  <CardFooter>...</CardFooter>
</Card>
```

```css
.card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
}
.card:hover {
  border-color: var(--border-emphasis);
  background: rgba(255, 255, 255, 0.04);
}
```

### Hero

```css
.hero {
  background: linear-gradient(180deg, #0a0e14 0%, #0f1419 100%);
  padding: 120px 0 80px;
  position: relative;
  overflow: hidden;
}
.hero::before {
  /* 背景の subtle gradient circle */
  position: absolute;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.10), transparent 70%);
  width: 800px;
  height: 800px;
  top: -200px;
  right: -200px;
  filter: blur(80px);
}
```

### Trust strip

```typescript
<TrustStrip>
  <Stat value="¥32.1億" label="累計年間改善" />
  <Stat value="9,240" label="店舗合計" />
  <Stat value="5社" label="実装完了" />
  <Stat value="100%" label="本契約転換率" />
</TrustStrip>
```

```css
.stat {
  text-align: center;
}
.stat-value {
  font-size: var(--text-5xl);
  font-weight: var(--weight-bold);
  color: var(--accent-emerald);
  font-family: var(--font-mono);
  letter-spacing: -0.02em;
}
.stat-label {
  font-size: var(--text-sm);
  color: var(--text-muted);
  margin-top: var(--space-2);
}
```

### Comparison Table (`/vs`)

```css
.comparison-table {
  border-collapse: collapse;
  width: 100%;
}
.comparison-table th {
  background: var(--bg-elevated);
  padding: var(--space-4);
  text-align: center;
  font-size: var(--text-sm);
}
.comparison-table th[data-product="aentro"] {
  background: rgba(59, 130, 246, 0.06);
  border-bottom: 2px solid var(--accent-blue);
}
.comparison-table td {
  padding: var(--space-3) var(--space-4);
  text-align: center;
  border-bottom: 1px solid var(--border-default);
}
```

### Form

```css
.form-input {
  width: 100%;
  height: 48px;
  padding: 0 16px;
  background: rgba(0, 0, 0, 0.30);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 14px;
  transition: all var(--duration-fast);
}
.form-input:focus {
  outline: none;
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.10);
}
```

---

## Image / 写真要件

### Hero 画像（最重要）

**サイズ**: 1920x1080 (大画面) / 1200x900 (デフォルト) / 750x1334 (モバイル)

**内容**: AENTRO Daily Brief をモバイルでスクロールしている手元 + 後ろにラップトップで Action Loop 動作中

**スタイル**: 
- 暗い室内、青みがかった照明
- 手元のスマホは現実的（ Apple iPhone）
- ラップトップは MacBook Pro
- 椅子・デスクは木目（外食オーナーの office っぽさ）
- 背景に自然の植物 1本

**撮影方法**:
- プロカメラマン依頼（2-3万円）
- スタジオ or 自社カフェスペース
- light box で柔らかい光
- 後処理: コントラスト強め、shadow tone を青寄り

### スクリーンショット（プロダクト）

**必須 8 枚**:
1. `daily-brief-mobile.png` (750x1334) - Daily Brief をモバイルで
2. `daily-brief-desktop.png` (1920x1080) - 同 デスクトップ
3. `executive-command.png` (1920x1080) - 経営エグゼクティブ画面
4. `action-loop.png` (1920x1080) - Action Loop アニメ実行中
5. `pilot-wizard.png` (1920x1080) - POC Wizard Step 2
6. `workflow-builder.png` (1920x1080) - Workflow Builder + Claude 生成結果
7. `case-studies.png` (1920x1080) - 5 事例カード一覧
8. `security-review.png` (1920x1080) - Security Review Pack 表示

**撮影方法**:
- 1920x1080 で取得、 1.5x で書き出し（retina 対応）
- フォント等の polish 確認
- mock data がリアルな数字（"￥3.84B" など）に揃ってる

### ロゴ

**ファイル**:
- `aentro-logo-white.svg` (light bg 用 / 反転)
- `aentro-logo-dark.svg` (dark bg 用)
- `aentro-favicon.svg` (32x32)
- `aentro-og-image.png` (1200x630)

**マーク**: 既存の Hexagon icon (lucide-react)

### 動画

**`hero-loop.mp4`**:
- 28秒、自動再生 muted、ループ
- demo-tour ページの 4 ステージ録画
- 1920x1080 H.264 / 8Mbps
- ファイルサイズ < 5MB（圧縮）

**`how-it-works.mp4`**:
- 60秒、字幕付き
- 4 ステップを丁寧に解説（声 nasr 必要）

---

## アイコン

**ライブラリ**: lucide-react (既存と同じ)

**主要使用**:
- Hexagon: ロゴ
- Brain: AI / Daily Brief
- Sparkles: 提案 / 強調
- Target: 目標 / SV
- Building2: 店舗 / 顧客
- Database: データ
- Lock / Shield: セキュリティ
- Banknote: 金額
- TrendingUp / TrendingDown: KPI
- ArrowRight: CTA
- CheckCircle2: 達成
- AlertTriangle: 警告
- Activity: live

サイズ: 16px / 20px / 24px / 32px / 48px

---

## アニメーション

### Hero エントリ

```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.hero-h1 { animation: fadeUp 800ms var(--ease-out); }
.hero-sub { animation: fadeUp 800ms var(--ease-out) 200ms backwards; }
.hero-cta { animation: fadeUp 800ms var(--ease-out) 400ms backwards; }
```

### Scroll-triggered (Intersection Observer)

```css
.scroll-reveal {
  opacity: 0;
  transform: translateY(40px);
  transition: opacity 600ms var(--ease-out), transform 600ms var(--ease-out);
}
.scroll-reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
```

### Number counter (Trust strip)

JS で 0 → 目標値まで 1.5秒で count up（Intersection Observer 起動）。
プロダクト側の `<LiveCounter>` をそのまま流用可能。

### Hover

```css
.card { transition: transform 200ms var(--ease-out), box-shadow 200ms var(--ease-out); }
.card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(59, 130, 246, 0.10); }
```

---

## レスポンシブ

### Mobile (~640px)

- Hero H1: 40px（desktop 64px）
- Trust strip: 縦並び 1列
- 機能カード: 1列
- 比較表: 横スクロール（sticky 1列目）
- Form: 全幅
- ナビ: ハンバーガーメニュー

### Tablet (640-1024px)

- Hero H1: 48px
- 機能カード: 2列
- 比較表: 横スクロール

### Desktop (1024px+)

- Hero H1: 64px
- 機能カード: 4列 (2x2)
- 比較表: 全幅表示

---

## ダークテーマ唯一論

ライトテーマは **作らない**。理由:
1. ターゲット（経営層）は早朝にスマホで見る。ダークが目に優しい
2. プロダクト側がダーク、整合性
3. Palantir 風 brand consistency
4. 開発工数半減

将来必要になったらライトテーマ追加。

---

## 写真 / 動画の調達計画

### Phase 1（ローンチ時）

- Hero photo: ストック画像 (Unsplash の MacBook + iPhone でダーク照明) → 加工
- スクリーンショット: 自前で撮影（プロダクトを操作）
- 動画: demo-tour と action-loop ページの動作録画 + ナレーション後付け

### Phase 2（ローンチ 1ヶ月後）

- プロカメラマンでオフィス撮影 → Hero 画像差し替え
- 顧客許可取れた事例の logo 追加
- CEO 動画メッセージ（45秒）

### Phase 3（公開許可案件出現後）

- 顧客現場（店舗）撮影
- 経営層インタビュー動画（120秒）
- 事例事例事例

---

## ブランドガイドライン要点

### Do

- 数字を主役にする（数字 + 単位 + ラベル の3点セット）
- 余白を多く取る（情報密度より読みやすさ）
- 業界用語を恐れず使う（HACCP / FL比率）
- スクリーンショットは pixel perfect

### Don't

- emoji を多用しない（CTA や誤検知 indicator のみ）
- ラベルに英語を混ぜすぎない（Mixed Japanese-English Chaos 回避）
- アイコンを文字代わりにしない（必ず横に label）
- 動画自動再生は muted 必須（accessibility）

---

## デザイン Tool

- **Figma**: 全 Wireframe + Component library
- **Excalidraw**: アーキテクチャ図
- **Figma → コード**: Tailwind plugin で trim

`design/aentro-lp.fig` (Figma file) を作る。
コンポーネント library は再利用前提（main プロダクトとは別 file）。
