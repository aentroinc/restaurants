# Runbook — PWA Deploy (staff / manager / sv)

## Pre-flight
- [ ] Production domain serves over **HTTPS** (HSTS preferred). PWAs do not install on `http://`.
- [ ] `Content-Type: application/manifest+json` for `/manifest-{role}.json` (set by `next.config.js > headers()`).
- [ ] `/sw.js` returns `Cache-Control: no-cache` and `Service-Worker-Allowed: /` (configured).
- [ ] `/offline.html` reachable (200) and is in the SW pre-cache list.
- [ ] Each app icon (`/icons/aentro-{role}.svg`) returns 200.
- [ ] Run `npm run lighthouse` against staging — PWA & Accessibility ≥ 90.

## Permissions / Capabilities
| Feature | Browser API | Surface |
|---|---|---|
| カメラ撮影 (写真記録) | `navigator.mediaDevices.getUserMedia` | `manager/waste`, `manager/complaint`, `manager/equipment`, `staff/loss` |
| 位置情報 (GPS打刻) | `navigator.geolocation` | `staff/clock`, `sv/visit` |
| プッシュ通知 (任意) | `Notification` + `PushManager` | 改善宿題リマインド (sv), シフト承認 (manager) |
| ファイル/写真選択 | `<input type=file capture>` | 各記録フォーム |

> 各 API は **HTTPS + ユーザー操作起点** が必須。初回ダイアログでブロックされた場合の再付与導線は OS 設定 > Safari/Chrome > サイト権限から。

## Install 手順 (役割別)
### iOS Safari (iPad / iPhone)
1. 対象アプリ (`https://example.com/staff` / `/manager` / `/sv`) を Safari で開く
2. 共有ボタン → 「ホーム画面に追加」
3. 名前は manifest の `short_name` (`AENTRO 現場` 等) を確認して保存

### Android Chrome
1. 対象アプリを Chrome で開く
2. ページ内 `InstallPrompt` バナーが出たら「追加」を押下
3. 出ない場合: メニュー → 「アプリをインストール」 / 「ホーム画面に追加」

### デスクトップ Chrome / Edge
1. URL バー右の install アイコン (⊕) → インストール
2. 独立ウィンドウで起動。`scope` が一致しないルートに移動するとブラウザ UI に戻る点に注意

## ロールアウト
- [ ] Service Worker version (`VERSION` in `public/sw.js`) を bump (例: `aentro-pwa-v3` → `v4`)。
- [ ] CDN キャッシュを `/sw.js` `/manifest-*.json` `/icons/*` についてパージ。
- [ ] 既存ユーザのアプリは次回起動時に新 SW を取得し `skipWaiting` で即時切替 (実装済)。
- [ ] Sentry release tag を `NEXT_PUBLIC_SENTRY_RELEASE` で同期。

## ロールバック
1. 旧 SW バージョンを `public/sw.js` に戻して再デプロイ。
2. クライアント側で残留する場合は `chrome://serviceworker-internals` または DevTools → Application → Service Workers → Unregister を案内。

## Sentry env
| Key | Required | Note |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | Yes (有効化したい場合) | 未設定なら Sentry は no-op |
| `NEXT_PUBLIC_SENTRY_ENV` | optional | `production` / `staging` |
| `NEXT_PUBLIC_SENTRY_RELEASE` | optional | git sha 推奨 |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | optional | default 0.1 |
| `SENTRY_DSN` | Yes (server-side) | 同 DSN を共有可 |
| `SENTRY_ORG` / `SENTRY_PROJECT` | optional | Source map upload に必要 |
| `SENTRY_AUTH_TOKEN` | CI のみ | source map upload |

## 監査チェック (本番)
- [ ] DevTools → Application → Manifest: 3 manifest が読み込めて icons プレビューが表示される
- [ ] Service Worker: `aentro-pwa-vN` がアクティブ
- [ ] Lighthouse mobile preset: PWA ≥ 90, Accessibility ≥ 95
- [ ] オフライン化 → ナビゲーションで `/offline.html` または cached page にフォールバック
- [ ] Sentry に test exception が届く (`Sentry.captureException(new Error("ping"))`)

## 既知の制約
- iOS Safari < 17 は manifest icons の `image/svg+xml` を一部無視する。アイコンが粗く見える場合は将来 PNG ラスタを並置 (192/512/1024) する。
- iOS は `beforeinstallprompt` を発火しないため `<InstallPrompt>` バナーは Android/Chromium のみ。iOS は手動の共有→ホーム画面で誘導する案内 UI を別途用意することを検討。
