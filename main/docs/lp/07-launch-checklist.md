# 07 — Launch Checklist

ローンチ前 1週間で全項目クリア。クリアできない項目は遅延とみなす。

---

## D-7: 機能完成

### Code

- [ ] 7 ページ全て build エラーなし: `npm run build`
- [ ] type-check 通過: `npm run type-check`
- [ ] ESLint 通過: `npm run lint`
- [ ] dependencies に脆弱性なし: `npm audit --audit-level=high`
- [ ] dead code / TODO コメント削除
- [ ] console.log / debugger 削除

### Vercel

- [ ] Production project 設定: `aentro-lp-production`
- [ ] preview deploy が `develop` branch から動作
- [ ] production deploy が `main` branch から動作
- [ ] 環境変数 9 個全て設定: GA / HOTJAR / LINKEDIN / SITE_URL / SLACK / SENDGRID 系
- [ ] Branch protection: main は PR + 1 review 必須

### DNS / SSL

- [ ] domain `restaurants.aentro.jp` (or `aentro.jp/restaurants/`) Cloudflare 設定
- [ ] CNAME / A レコード Vercel に向く
- [ ] HTTPS 自動証明書発行確認
- [ ] WWW リダイレクト確認: `www.restaurants.aentro.jp` → `restaurants.aentro.jp`

---

## D-5: コンテンツ完成

### コピー

- [ ] 全 7 ページのコピーが `02-copy-deck.md` と一致
- [ ] 業界用語のスペル / 表記揺れ確認（HACCP / FL比率 等）
- [ ] CTA の煽り表現を弁護士 review 済
- [ ] 5 case studies の本文 review 済
- [ ] 数字（¥32.1億 等）が最新値に更新済

### 画像

- [ ] Hero 画像: 1920x1080 + 750x1334 (mobile) 配置
- [ ] スクリーンショット 8 枚: 全部 retina 対応 (1.5x)
- [ ] og-image: 1200x630 配置（全ページ）
- [ ] favicon: 32x32 + Apple touch icon
- [ ] 画像全部 WebP 化、`<Image>` で next/image 経由

### 動画

- [ ] `hero-loop.mp4` 配置、5MB 以下、muted 自動再生確認
- [ ] `how-it-works.mp4` 配置、字幕 SRT 同梱
- [ ] poster image 設定（動画読込前の表示画像）

### Markdown

- [ ] case-001 ～ case-005 全部 ContentLayer から render
- [ ] テーブル / コードブロック表示崩れなし

---

## D-3: SEO + 計測

### SEO

- [ ] `app/sitemap.ts` 動作 (`/sitemap.xml` で確認)
- [ ] `app/robots.ts` 動作 (`/robots.txt` で確認)
- [ ] 全ページの `<title>` と `<meta description>` 記入
- [ ] og:image / og:title / og:description 全ページ確認
- [ ] Schema.org JSON-LD 配置（`<script type="application/ld+json">`）
- [ ] 内部リンク構造: TOP → 各サブページに 2 hop 以内
- [ ] alt text 全画像で記入

### 計測

- [ ] GA4 動作確認: テスト訪問が見える
- [ ] Hotjar 動作確認: heatmap が記録されている
- [ ] LinkedIn Insight Tag 動作確認
- [ ] Vercel Analytics + Speed Insights 動作

### Custom event 確認

- [ ] `cta_click_hero_demo`
- [ ] `cta_click_hero_pdf`
- [ ] `cta_click_value_pdf`
- [ ] `cta_click_security_pdf`
- [ ] `form_submit_demo`
- [ ] `download_security_pack`
- [ ] `download_poc_proposal`
- [ ] `download_comparison`
- [ ] `scroll_depth_25/50/75/100`

---

## D-2: Form / API

### `/demo` フォーム

- [ ] 9 項目 全部入力可能
- [ ] バリデーション動作（必須 / メール形式 / 数値）
- [ ] reCAPTCHA v3 で bot 防御
- [ ] submit 中 disabled 表示
- [ ] 成功画面に正しく遷移
- [ ] 失敗時のエラー表示

### Backend (`/api/contact`)

- [ ] Zod validation 動作
- [ ] Slack webhook で通知届く（テスト送信）
- [ ] SendGrid で自動返信届く（テスト送信）
- [ ] HubSpot CRM に lead 投入（設定時）
- [ ] レート制限（5回/min/IP）動作
- [ ] エラー時に Sentry に飛ぶ

### Resource downloads

- [ ] `/downloads/security-pack.pdf` 配置（実 PDF）
- [ ] `/downloads/poc-proposal.pdf` 配置
- [ ] `/downloads/comparison.pdf` 配置
- [ ] download 時に GA4 イベント発火
- [ ] download 時にメール capture（optional）

---

## D-1: パフォーマンス + アクセシビリティ

### Lighthouse

各ページで以下を達成:

- [ ] Performance: 95+
- [ ] SEO: 100
- [ ] Accessibility: 95+
- [ ] Best Practices: 95+

### Core Web Vitals (PageSpeed Insights)

- [ ] LCP < 2.0s
- [ ] FID < 50ms
- [ ] CLS < 0.05

### モバイル

- [ ] iPhone 14 Pro / iPhone SE で確認
- [ ] Android (Galaxy S22) で確認
- [ ] Chrome / Safari / Firefox 全部確認

### アクセシビリティ

- [ ] キーボードのみで全機能操作可能
- [ ] スクリーンリーダー（VoiceOver）で読める
- [ ] フォーカスインジケータ表示
- [ ] color contrast 4.5:1 以上
- [ ] 動画に字幕

### Edge cases

- [ ] 200ms ネットワーク遅延でスムーズ
- [ ] JS off で最低限の表示できる
- [ ] dark mode prefer の OS でも問題なし
- [ ] 大画面 (4K) でレイアウト崩れない
- [ ] 小画面 (320px) でレイアウト崩れない

---

## D-Day: ローンチ

### Before launch (午前)

- [ ] CEO + 営業 final review (30分)
- [ ] 法務 final sign-off
- [ ] バックアップ取得（preview 環境のスクリーンショット）
- [ ] ロールバック手順を Slack に貼付
- [ ] On-call ローテーション設定（24時間）

### Launch (12:00 JST)

- [ ] Vercel main branch deploy 確認
- [ ] DNS 切り替え（Cloudflare）
- [ ] 30分 monitoring（GA real-time / Sentry / Vercel logs）
- [ ] 全ページ open して目視確認

### After launch (午後)

- [ ] 社内 #all-hands で announce
- [ ] LinkedIn 公式アカウントで投稿
- [ ] 既存 30 社リードに告知メール
- [ ] 業界メディア（FoodService.jp, FoodWiz.jp）にニュースリリース送信
- [ ] CEO / 営業の LinkedIn で個人 share

### 24時間以内

- [ ] アクセス数確認: 目標 200+
- [ ] デモ予約 5+ 確認
- [ ] Slack #demo-requests に動作確認
- [ ] 不具合 0 件 → 成功
- [ ] retro mtg 設定（D+3）

---

## ロールバック手順

### 軽微な不具合

CSS / コピー miss → hot fix で対応:
```bash
# 1. fix する
git checkout -b hotfix-cta-color
# edit
git commit -m "fix CTA color"
git push origin hotfix-cta-color
# PR → merge → auto deploy (5分)
```

### 重大な不具合

Form 動かない / 全ページ 500 → roll back:
```bash
# Vercel UI で前 deploy に instant rollback
# or
git revert HEAD
git push origin main
# auto deploy
```

ロールバック実行と同時に Slack #incidents で公開。

### DNS 障害

Cloudflare 側でフェイルオーバー設定:
- primary: Vercel
- failover: GitHub Pages 静的版（Coming soon ページ）

---

## D+3: Retro

### 確認項目

| 項目 | 目標 | 実績 |
|------|------|------|
| 訪問数（72h） | 600 | ___ |
| デモ予約 | 15 | ___ |
| Security Pack DL | 30 | ___ |
| Bounce rate | <60% | ___ |
| LCP | <2.0s | ___ |
| Slack 反応 | 高 | ___ |
| メディア掲載 | 1社 | ___ |

### 学び共有

- うまくいった点
- 改善必要な点
- 次月の A/B test 仮説 (3 つ)

### 次の 30 日アクション

`06-content-pipeline.md` の月次 update サイクル開始。

---

## ローンチ失敗の判定基準

ローンチ後 7 日でいずれか:

- [ ] 訪問数 < 300 (期待の 50%)
- [ ] デモ予約 0 件
- [ ] Bounce rate > 80%
- [ ] Lighthouse Performance < 80

→ Hero / メインコピー / CTA を全面再設計、2週間で v1.1 リリース。

---

## ローンチ後 30日のターゲット

| KPI | 目標 |
|-----|------|
| 月間 ユニーク訪問 | 1,500 |
| デモ予約 | 30 |
| Security Pack DL | 50 |
| 新規パイプライン | 8 件 |
| 商談化 | 3 件 |
| POC 契約 | 1 件 |

達成できれば「順調」、未達なら 7日以内に LP v2 計画立案。

---

## まとめ

ローンチは終わりじゃない。**スタートライン**。
LP 公開後 30日が **最重要**。data 取って、改善し続ける。

3 ヶ月後には A/B test の勝者が決まり、6 ヶ月後には conversion が 2x 改善し、1 年後には毎月 5 社以上の POC が回り始める。

**ローンチ後の継続が LP の本質**。
