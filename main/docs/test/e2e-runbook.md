# E2E テスト ランブック

Playwright を使った E2E テスト一式。3 アプリ（staff / manager / sv）+ 共通フロー（help / support）をカバーする。

## 構成

```
frontend/
├── playwright.config.ts        # 4 プロジェクト (mobile / tablet / desktop)
└── e2e/
    ├── staff-app.spec.ts        # 5 シナリオ (iPhone 14 Pro)
    ├── manager-app.spec.ts      # 5 シナリオ (Pixel 7)
    ├── sv-app.spec.ts           # 5 シナリオ (iPad Pro 11)
    └── shared.spec.ts           # 4 シナリオ (Desktop Chrome) — ヘルプ・サポート
```

合計 **19 シナリオ**。

## ローカルで実行

### 初回セットアップ

```bash
cd frontend
npm install                         # @playwright/test を含む
npx playwright install --with-deps  # ブラウザバイナリ (要 sudo on Linux)
```

### 普段の実行

```bash
# バックグラウンドで dev サーバーを起動 → 全テスト実行
npm run test:e2e

# UI モード (デバッグ用、シナリオを step-by-step で見られる)
npm run test:e2e:ui

# 実ブラウザを表示しながら実行
npm run test:e2e:headed

# 単一スペック
npx playwright test e2e/staff-app.spec.ts

# 単一プロジェクト
npx playwright test --project=manager-mobile
```

`playwright.config.ts` の `webServer` セクションが `npm run dev` を自動起動するため、別ターミナルでサーバー起動は不要。

既に dev サーバーを動かしている場合は `E2E_NO_SERVER=1 npm run test:e2e` で再利用可能。

### 環境変数

| 変数 | 用途 | デフォルト |
|------|------|-----------|
| `E2E_PORT` | dev サーバーのポート | `3000` |
| `E2E_BASE_URL` | テスト先 URL | `http://localhost:3000` |
| `E2E_NO_SERVER` | 既存サーバーを使う | `false` |
| `CI` | CI モード（リトライ・GitHub Reporter） | unset |

## デモ認証バイパス

各テストは `localStorage` に以下をセットして RoleGuard を通過させる:

```ts
window.localStorage.setItem("aentro.demo_role", "staff" | "manager" | "sv")
window.localStorage.setItem(`onboarding_${role}_done`, "1")
```

`OnboardingOverlay` がチュートリアルを表示しないように、初期化時に「完了済み」フラグをセットしている。

## CI 統合

### GitHub Actions

`.github/workflows/e2e.yml` に以下を追加:

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - name: Install deps
        working-directory: frontend
        run: npm ci
      - name: Install Playwright browsers
        working-directory: frontend
        run: npx playwright install --with-deps
      - name: Run E2E
        working-directory: frontend
        run: npm run test:e2e
        env:
          CI: "1"
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: frontend/playwright-report/
          retention-days: 7
```

`CI=1` のとき `playwright.config.ts` は:
- リトライ 2 回
- ワーカー 2 並列
- GitHub Reporter + HTML
- `forbidOnly: true` （`.only` 残しを防ぐ）

### バックエンド連携 (オプション)

サポートフォームの送信テストは backend `/api/v1/support/tickets` が落ちていても graceful degrade で成功するように作ってある（クライアントが `TK-xxx` をローカル生成）。

実バックエンドと突き合わせて確認する場合:

```bash
docker-compose up -d postgres backend  # backend を localhost:8000 で起動
NEXT_PUBLIC_API_BASE=http://localhost:8000 npm run test:e2e
```

## トラブルシュート

| 症状 | 原因 | 対処 |
|------|------|------|
| `Timeout 30000ms exceeded` | dev サーバー起動遅延 | `playwright.config.ts` の `webServer.timeout` を増やす |
| `RoleGuard` で 403 リダイレクト | `aentro.demo_role` が未セット | `beforeEach` 内の `addInitScript` を確認 |
| ブラウザが見つからない | `playwright install` 未実行 | `npx playwright install --with-deps` |
| ポート 3000 使用中 | 別プロセスが占有 | `E2E_PORT=3001 npm run test:e2e` |

## 拡張方針

- スモークテスト追加先: `e2e/`
- 追加シナリオは pages の data-testid を増やしながら書く（既存のサポートフォームの `data-testid="support-*"` 参照）
- 認証付き API テストは `request.newContext({ extraHTTPHeaders })` でトークン注入

## 既知のリスク

- 顔認証・GPS・WebRTC を使うフローは Playwright デフォルトでは検証不可（permissions API のモックが必要）
- IndexedDB 関連のオフラインテストは現状未カバー
