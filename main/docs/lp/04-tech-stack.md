# 04 — 技術スタック / ホスティング / 計測

## アーキテクチャ概要

```
[訪問者]
    ↓ HTTPS
[Cloudflare CDN]                ← edge cache, WAF, DDoS protect
    ↓
[Vercel Edge]                   ← Next.js edge functions, ISR
    ↓
[Next.js 15 App Router]         ← Server Components + Static
    ↓
[Backend (内部 API のみ)]        ← フォーム送信専用、別 instance
    ↓
[Slack webhook + Sendgrid]      ← 通知 + メール
```

**重要**: LP は 95% static、ほぼ Vercel で完結。プロダクション本体（main/）と完全独立。

## 技術選定

### Framework: Next.js 15 (App Router)

**理由**:
- main プロダクトと同じ技術スタック → 部品共有 / 学習コスト 0
- Server Components で server-side rendering、SEO が強い
- ISR (Incremental Static Regeneration) で軽量
- Vercel deploy がシームレス
- next/image で画像最適化自動

**代替検討**:
- Astro: Next より軽いが、main との整合性で却下
- Webflow / Framer: ノーコード。商談後の編集効率は良いが、機能性で却下
- 静的 HTML: 工数最小だが将来の拡張性で却下

### Style: Tailwind CSS 3

- main プロダクトと同じ
- design token は `tailwind.config.ts` に CSS variable で揃える

### Animation: Framer Motion

- Hero 入場 / scroll reveal / 数値 counter
- main の `LiveCounter` component を borrow

### Form: React Hook Form + Zod

- type-safe validation
- フォーム送信は `/api/contact` (Next.js API route)

### Image: next/image + Sharp

- 自動 WebP 変換
- レスポンシブ srcset 自動生成

### Analytics: GA4 + Hotjar

- GA4: 全 page view + custom event
- Hotjar: heatmap + session record (sample 10%)

### CMS（事例追加用）: Contentlayer + Markdown

- `/content/case-studies/*.md` でケーススタディ追加
- pull request → auto deploy

---

## ディレクトリ構造

```
restaurants/main-lp/                         ← 新規ディレクトリ
├── app/
│   ├── layout.tsx                            ← root layout
│   ├── page.tsx                              ← /
│   ├── how-it-works/page.tsx                 ← /how-it-works
│   ├── value/page.tsx                        ← /value
│   ├── security/page.tsx                     ← /security
│   ├── poc/page.tsx                          ← /poc
│   ├── vs/page.tsx                           ← /vs
│   ├── demo/page.tsx                         ← /demo
│   ├── case-studies/[id]/page.tsx            ← /case-studies/:id
│   ├── docs/[slug]/page.tsx                  ← /docs/:slug
│   ├── api/
│   │   ├── contact/route.ts                  ← フォーム submit
│   │   └── newsletter/route.ts
│   ├── globals.css
│   └── opengraph-image.tsx
├── components/
│   ├── hero.tsx
│   ├── trust-strip.tsx
│   ├── feature-grid.tsx
│   ├── action-loop-animation.tsx
│   ├── case-card.tsx
│   ├── comparison-table.tsx
│   ├── roi-calculator.tsx
│   ├── nav.tsx
│   ├── footer.tsx
│   └── cta-buttons.tsx
├── content/
│   ├── case-studies/
│   │   ├── case-001.md
│   │   ├── case-002.md
│   │   ├── case-003.md
│   │   ├── case-004.md
│   │   └── case-005.md
│   └── docs/
│       ├── architecture.md
│       └── api-reference.md
├── public/
│   ├── og-image.png
│   ├── favicon.svg
│   ├── images/
│   │   ├── hero-mobile.png
│   │   ├── hero-desktop.png
│   │   ├── screenshots/
│   │   │   ├── daily-brief.png
│   │   │   ├── action-loop.png
│   │   │   ├── pilot-wizard.png
│   │   │   └── ...
│   │   └── icons/
│   └── videos/
│       ├── hero-loop.mp4
│       └── how-it-works.mp4
├── lib/
│   ├── analytics.ts
│   ├── slack.ts
│   ├── sendgrid.ts
│   └── utils.ts
├── types/
│   └── case-study.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

**配置場所**: `restaurants/main-lp/` (新規ディレクトリ、本体 `main/` とは別)

---

## package.json (主要依存)

```json
{
  "name": "aentro-lp",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "15.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "framer-motion": "^11.0.0",
    "lucide-react": "^0.400.0",
    "react-hook-form": "^7.50.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "contentlayer2": "^0.5.0",
    "next-contentlayer2": "^0.5.0",
    "@vercel/analytics": "^1.2.0",
    "@vercel/speed-insights": "^1.0.0",
    "remark-gfm": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "typescript": "^5.4.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "15.0.0",
    "prettier": "^3.2.0"
  }
}
```

---

## tailwind.config.ts

```typescript
import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: "class",  // always dark
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./content/**/*.md",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0a0e14",
          elevated: "#0f1219",
        },
        accent: {
          blue: "#3b82f6",
          emerald: "#10b981",
          amber: "#f59e0b",
          red: "#ef4444",
          purple: "#a855f7",
        },
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans JP", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      maxWidth: { container: "1280px" },
    },
  },
  plugins: [require("@tailwindcss/typography")],
}
export default config
```

---

## next.config.ts

```typescript
import { withContentlayer } from "next-contentlayer2"

const config = {
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
  },
  redirects: async () => [
    { source: "/blog", destination: "/case-studies", permanent: true },
  ],
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Strict-Transport-Security", value: "max-age=63072000" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
  ],
}

export default withContentlayer(config)
```

---

## ホスティング: Vercel

**設定**:
- Project: `aentro-lp`
- Framework: Next.js
- Domain: `aentro.jp/restaurants/` or `restaurants.aentro.jp`
- Branch: `main` → production / `develop` → preview
- Auto deploy on push

**料金見積**:
- Vercel Pro: $20/month (1 user)
- 帯域: 1TB/月（ローンチ時十分）
- Build: 6,000 minute/月

**Cloudflare DNS**:
- A / CNAME: Vercel に向ける
- WAF: 標準ルール ON
- DDoS: Pro tier

---

## 環境変数

```
# Frontend (.env.local)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_HOTJAR_ID=1234567
NEXT_PUBLIC_LINKEDIN_PARTNER_ID=12345
NEXT_PUBLIC_SITE_URL=https://aentro.jp/restaurants

# Backend (Vercel env)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SENDGRID_API_KEY=SG....
SENDGRID_FROM_EMAIL=contact@aentro.jp
SLACK_DEMO_CHANNEL=#demo-requests
SLACK_DOWNLOAD_CHANNEL=#downloads
RECAPTCHA_SECRET=...
NEWSLETTER_API_KEY=...
```

**機密情報**: Vercel Secrets で管理、git に commit 禁止。

---

## API Routes (Next.js)

### `app/api/contact/route.ts`

```typescript
import { NextRequest } from "next/server"
import { z } from "zod"

const ContactSchema = z.object({
  company: z.string().min(1).max(200),
  name: z.string().min(1).max(100),
  role: z.enum(["executive", "planning", "business_unit", "it", "other"]),
  store_count: z.number().min(1),
  brands: z.array(z.string()),
  email: z.string().email(),
  phone: z.string().optional(),
  preferred_dates: z.array(z.string()),
  message: z.string().max(2000).optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const data = ContactSchema.parse(body)

  // 1. Slack 通知
  await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `🎯 デモ予約: ${data.company} (${data.role})`,
      blocks: [/* ... */],
    }),
  })

  // 2. SendGrid 自動返信
  await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}` },
    body: JSON.stringify({/* template data */}),
  })

  // 3. CRM 投入（HubSpot or Salesforce）
  // optional

  return Response.json({ ok: true })
}
```

### `app/api/newsletter/route.ts`

メールマガ登録、簡易版。

---

## 計測タグ実装

### GA4

```typescript
// components/analytics.tsx
"use client"
import Script from "next/script"

export function Analytics() {
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`} strategy="afterInteractive" />
      <Script id="ga" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', { send_page_view: true });
      `}</Script>
    </>
  )
}
```

### Custom event

```typescript
// lib/analytics.ts
export const trackEvent = (event: string, params?: Record<string, any>) => {
  if (typeof window === "undefined") return
  ;(window as any).gtag?.("event", event, params)
}

// 使い方
trackEvent("cta_click", { section: "hero", action: "demo_request" })
trackEvent("download", { resource: "security_pack" })
trackEvent("form_submit", { form: "contact", fields: 8 })
trackEvent("scroll_depth", { depth: "50%" })
```

### Hotjar

```typescript
// components/hotjar.tsx
"use client"
import Script from "next/script"

export function Hotjar() {
  if (process.env.NODE_ENV !== "production") return null
  return (
    <Script id="hotjar" strategy="afterInteractive">{`
      (function(h,o,t,j,a,r){
        h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
        h._hjSettings={hjid:${process.env.NEXT_PUBLIC_HOTJAR_ID},hjsv:6};
        a=o.getElementsByTagName('head')[0];
        r=o.createElement('script');r.async=1;
        r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
        a.appendChild(r);
      })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
    `}</Script>
  )
}
```

---

## SEO 実装

### Sitemap

```typescript
// app/sitemap.ts
import { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL!
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/how-it-works`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/value`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/security`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/poc`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/vs`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/demo`, changeFrequency: "monthly", priority: 1.0 },
  ]
}
```

### Robots

```typescript
// app/robots.ts
export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin/"] }],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  }
}
```

### Per-page metadata

```typescript
// app/page.tsx
export const metadata = {
  title: "AENTRO Restaurant OS — 外食大手向け AI 経営レイヤー",
  description: "既存システム置換せず、1ブランド 8週間で収益改善を円換算で証明...",
  openGraph: {
    title: "AENTRO Restaurant OS",
    description: "...",
    url: "https://aentro.jp/restaurants/",
    siteName: "AENTRO",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    locale: "ja_JP",
    type: "website",
  },
}
```

---

## パフォーマンス目標

| 指標 | 目標 |
|------|------|
| Lighthouse Performance | 95+ |
| Lighthouse SEO | 100 |
| Lighthouse Accessibility | 95+ |
| LCP (Largest Contentful Paint) | < 2.0s |
| FID (First Input Delay) | < 50ms |
| CLS (Cumulative Layout Shift) | < 0.05 |
| Total Page Weight (above fold) | < 500KB |

**達成法**:
- next/image で全画像最適化
- 動画は `<video preload="metadata">` で初回ロード軽減
- Tailwind の purge で unused CSS 削除
- font-display: swap

---

## CI/CD

### GitHub Actions (`.github/workflows/lp.yml`)

```yaml
name: LP CI/CD

on:
  push:
    branches: [main, develop]
    paths:
      - "main-lp/**"
  pull_request:
    paths:
      - "main-lp/**"

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: main-lp/package-lock.json
      - run: cd main-lp && npm ci
      - run: cd main-lp && npm run lint
      - run: cd main-lp && npm run type-check
      - run: cd main-lp && npm run build
```

Vercel 自動連携で `develop → preview deploy`、`main → production`。

---

## 監視

| ツール | 用途 |
|--------|------|
| Vercel Analytics | Core Web Vitals |
| Vercel Speed Insights | 詳細 perf |
| GA4 | conversion funnel |
| Hotjar | UX 観察 |
| Sentry | runtime error |
| Slack alert | デモ予約即通知 |

---

## メンテナンス想定

- 月1回: セキュリティ patch（next 等の dependabot 自動 PR）
- 月1回: 事例カードの数値更新
- 四半期: コピー / デザイン microcopy 見直し
- 半年: 大規模 v2 検討

LP は本体プロダクトと**独立**したサイクルで動かす。
