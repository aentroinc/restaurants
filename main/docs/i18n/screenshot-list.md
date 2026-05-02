# i18n Visual QA — Screenshot Checklist

5 言語 × 9 画面 = 45 スクリーンショットを目視確認するためのチェックリスト。
レイアウト崩れ・はみ出し・字数オーバーを検出する。

## 対象言語
- ja (日本語) — ベースライン
- en (English)
- vi (Tiếng Việt)
- ne (नेपाली)
- my (မြန်မာ)

## 対象画面 (staff + line-check)

| # | パス | 説明 | 重点チェック |
|---|---|---|---|
| 1 | `/staff` | ホーム | 6 タイル grid のはみ出し、ヘッダ言語切替が見える |
| 2 | `/staff/clock` | 打刻 | "顔をかざして出勤" の長文ボタン折返し |
| 3 | `/staff/auth/face` | 顔認証 | エラー文字 "顔が認識できませんでした" の改行 |
| 4 | `/staff/auth/qr` | QR | スキャナ枠下のオーバーレイ |
| 5 | `/staff/auth/pin` | PIN | キーパッドが他言語でも崩れない |
| 6 | `/staff/loss` | ロス報告 | ステッパー幅、商品サジェスト 3列 |
| 7 | `/staff/voice` | 客声 | 9 タイル絵文字＋ラベル |
| 8 | `/staff/allergy` | アレルギー対応 | 12 アレルゲンのアイコン+ラベル |
| 9 | `/staff/training` | 学習 | ロールタブ横スクロール、認定証 |
| 10 | `/staff/emergency` | 緊急マニュアル⚠️ | 6 シナリオの全ステップが読める |
| 11 | `/staff/emergency?scenario=fire` | 火災詳細 | 119 ボタンが目立つ、ステップ 6 |
| 12 | `/staff/emergency?scenario=anaphylaxis` | アナフィラキシー詳細 | 119 ボタン + EpiPen 文章 |
| 13 | `/staff/settings` | 設定 | 言語スイッチャー (inline variant) が一番上 |
| 14 | `/line-check` | チェックリスト一覧 | テンプレートカード、ヘッダ言語切替 |
| 15 | `/line-check/run/[id]` | チェック実行 | sticky header / footer、温度入力 |

## 言語別 注意点

### vi (ベトナム語)
- 声調記号付き文字 (ạ, ậ, ề) のレンダリング欠け
- "Hướng dẫn" のような長い単語が省略 (...) されないか

### ne (ネパール語)
- デーヴァナーガリー結合文字 (्) の崩れ
- フォントがブラウザ標準で出るか (Web font 不要のはず)
- アレルゲンラベルの折返し (`झिँगे माछा` 等の長語)

### my (ミャンマー語)
- ミャンマー文字の baseline / line-height が他言語より高い
- "အရေးပေါ်လမ်းညွှန်" など長い語の折返し
- 緊急ボタン "119 (မီးသတ်)" の中央揃え

### en
- "Customer voice" などタイル文字のサイズが日本語より長い
- 6 タイル grid の `text-sm font-semibold` が 2行になるか

## 自動チェック（任意）

```bash
# 開発サーバ起動後、Playwright で言語別スクショを生成
NEXT_LOCALE=en npx playwright test e2e/i18n-screens.spec.ts
NEXT_LOCALE=vi npx playwright test e2e/i18n-screens.spec.ts
# ne, my も同様
```

## 翻訳キー欠落チェック

`I18nProvider.findMissingKeys()` を画面コンソールから実行。返り値が
`{ ja: [], en: [], vi: [], ne: [], my: [] }` になるのが正解。

```ts
import { findMissingKeys } from "@/i18n/I18nProvider"
console.log(JSON.stringify(findMissingKeys(), null, 2))
```

## 結果テンプレ

```
[2026-05-02] reviewer = doohyw
ja: ✅
en: ✅
vi: ⚠️ allergy.allergens.shrimp が 2 行に折返し (Tôm/Tép どちらか統一)
ne: ✅ デーヴァナーガリー連結 OK
my: ⚠️ emergency.scenarios.fire.steps[0] が画面端に届く → font 縮小要検討
```
