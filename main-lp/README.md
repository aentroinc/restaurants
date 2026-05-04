# AENTRO Restaurant OS — Landing Page

公開 URL: https://aentroinc.com/restaurants

## 開発

```bash
npm install
npm run dev   # http://localhost:3100/restaurants
```

`basePath: "/restaurants"` のため URL に prefix が必要です。

## ビルド

```bash
npm run build
npm run start
```

## 構成

- Next.js 15 (App Router)
- Tailwind CSS 3
- Framer Motion (アニメーション)
- React Hook Form + Zod (フォーム)
- Lucide React (アイコン)

## ページ一覧

| Path | 内容 |
|------|------|
| `/` | TOP（Hero / Trust / 課題比較 / 機能 / Action Loop / 5事例 / POC / Architecture / CTA） |
| `/how-it-works` | 24h ループ詳細解説 + 4 ステップ + 効果計測 |
| `/value` | ROI 試算機 + 5社事例 + 統計検定方法 |
| `/security` | コンプライアンス一覧 + アーキテクチャ + LLM 方針 + Security Pack |
| `/poc` | 5 標準テーマ + 8週スケジュール + 価格 + 成果物 |
| `/vs` | 12機能×5ベンダー比較表 + ポジションステートメント |
| `/demo` | デモ予約フォーム |

## デプロイ

Vercel または Cloudflare Pages を想定。

```bash
# Vercel
vercel deploy --prod

# 環境変数
NEXT_PUBLIC_SITE_URL=https://aentroinc.com/restaurants
```

## 仕様書

詳細は `../main/docs/lp/` を参照:

- 00-overview.md — 全体方針
- 01-information-architecture.md — サイト構造
- 02-copy-deck.md — 全コピー
- 03-visual-design.md — デザイン
- 04-tech-stack.md — 技術選定
- 05-build-instructions.md — 実装手順
- 06-content-pipeline.md — 月次運用
- 07-launch-checklist.md — ローンチ前
