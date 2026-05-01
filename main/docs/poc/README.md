# PoC ドキュメント一式

`main/` プロダクト（FastAPI + PostgreSQL + Next.js のマルチテナント外食オペプラットフォーム）を顧客 PoC に投入するための対顧客向けドキュメントパッケージ。

## ドキュメント構成

| # | ファイル | 役割 | 想定読者 | ステータス |
|---|---|---|---|---|
| 00 | [パッケージ索引](./00-package-index.md) | 全 8 仕様書群の役割と利用順 | 自社チーム | 📝 ドラフト |
| 01 | [Customer Data Request Pack](./01-customer-data-request-pack.md) | PoC 開始時に顧客から受領するデータの定義書（10 CSV テンプレート） | 顧客側 IT / 経営企画 / 経理 / 商品部 | 📝 ドラフト |
| 02 | [8-Week PoC Operating Playbook](./02-eight-week-poc-operating-playbook.md) | キックオフから Executive Readout までの週次運用台本 | 自社 PM・顧客 PoC オーナー / Executive Sponsor | 📝 ドラフト |
| 03 | [Enterprise Security & Data Handling Brief](./03-enterprise-security-data-handling-brief.md) | データ取扱・アクセス制御・AI 利用・監査・障害対応の説明書 | 顧客側 情シス / 法務 / 経営陣 | 📝 ドラフト |

ステータス凡例: 📥 受領待ち / 📝 ドラフト / 🔍 レビュー中 / ✅ 確定

## レビュー手順

1. **読む**: 上の表のリンクから順に読む（`00 → 01 → 03 → 02` の順がおすすめ）
2. **チェック**: [REVIEW.md](./REVIEW.md) のチェックリストで各ドキュメントを評価
3. **実装ギャップ確認**: [GAP_ANALYSIS.md](./GAP_ANALYSIS.md)（自動生成）でドキュメント記述と現コードベースの差分を確認
4. **コメント残す**: ドキュメント内に `<!-- REVIEW: コメント内容 -->` を挿入、または同階層に `<doc>.review.md` を置く
5. **マージ**: ステータスを ✅ に更新、コミット

## ローカルプレビュー

```bash
make docs         # PoC docs ディレクトリの内容を一覧
make docs-read    # ターミナルで読む（要 glow: brew install glow）
make docs-serve   # ブラウザで読む（要 grip: pip install grip）
```

## 関連

- プロダクト本体: [`../../backend/`](../../backend/), [`../../frontend/`](../../frontend/)
- データコントラクト: [`../data_contracts/`](../data_contracts/)
- 兄弟プロジェクト（LP / モック）: `../../../{kanjo,lite,pro,standard,matsuya}/`
