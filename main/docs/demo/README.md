# Zensho 商談デモ - 環境準備チェックリスト

> このディレクトリ: 30 分商談を **3 つの E2E シナリオ** で見せきるためのデモ運用書一式。

## ファイル一覧

| ファイル | 用途 |
|---|---|
| `00-zensho-pitch-storyboard.md` | 30分商談ストーリーボード (場面1-6) |
| `01-walkthrough-line-check.md` | シナリオ① 現場チェック (3-5min) |
| `02-walkthrough-shift-optimizer.md` | シナリオ② シフト最適化 (4-5min) |
| `03-walkthrough-incident-response.md` | シナリオ③ 危機対応 (4-5min) |
| `04-screencast-script.md` | 動画録画用台本 (3本) |
| `05-zensho-specific-talking-points.md` | Zensho が刺さるトピック集 |
| `README.md` | これ |

---

## 商談 24 時間前: 環境準備チェックリスト

### A. インフラ起動

- [ ] `docker --version` が出る (>= 24)
- [ ] `docker compose ps` で db / api / web 全部 healthy
- [ ] `make demo-up` 完了 (初回 ~5 分)
- [ ] `curl http://localhost:8000/health` → `{"status":"ok"}`
- [ ] `curl http://localhost:3000/` → 200

### B. データ確認

- [ ] `make demo-seed` 出力に "DONE" あり
- [ ] DB に ZD- 店舗 80 件: `psql -c "SELECT COUNT(*) FROM stores WHERE code LIKE 'ZD-%';"`
- [ ] 期待件数:
  - stores: 80
  - employees: 200
  - daily_sales: ~7,200 (80 × 90 - 休業日)
  - hourly_sales: ~150,000+
  - sv_visits: 160-320
  - reviews: 200
  - incidents: 8
  - haccp_monitoring: ~7,200 (80 × 30 × 3 CCP)

### C. 画面動作確認

| 画面 | 確認内容 |
|---|---|
| `/zensho-executive` | マップに 80 ピン / ブランド比較タブ動く |
| `/incidents` | 8 件 [DEMO] 表示 / 該当クリック詳細 |
| `/ai-analyst` | デモプロンプトで 30 秒以内に応答 |
| `/labor` | ストア選択 → AI 推奨ボタン動く |
| `/sv-missions` | モバイル幅で表示崩れなし |
| `/meeting-packs` | 既存 pack 1 件表示 |
| `/admin/lineage` | グラフ描画 |
| `/admin/roles` | 列レベル権限 UI |

### D. アカウント

| Email | Pass | Role | 用途 |
|---|---|---|---|
| `exec_demo@aentro.io` | `Aentro!2026` | exec | 経営ダッシュボード |
| `manager_demo@aentro.io` | `Aentro!2026` | manager | シフト |
| `sv_demo@aentro.io` | `Aentro!2026` | sv | モバイル |
| `admin_demo@aentro.io` | `Aentro!2026` | admin | 権限・lineage |

### E. ブラウザ準備

- [ ] Chrome シークレット 1 / Safari 1 (バックアップ)
- [ ] DevTools 閉じる
- [ ] 拡張機能 OFF
- [ ] 解像度: 1920 × 1080 か 1440 × 900
- [ ] 通知 OFF
- [ ] Slack / メール OFF

### F. 物理準備

- [ ] HDMI 変換ケーブル
- [ ] 電源コード予備
- [ ] iPad (モバイルデモ用)
- [ ] WiFi / テザリング両方
- [ ] PDF 印刷版資料 5 部

---

## 起動順 (商談直前)

```bash
# 1. インフラ
make demo-up   # 初回のみ。2回目以降は make up で OK
make demo-seed  # データ更新したいとき

# 2. 動作確認
open http://localhost:3000/zensho-executive

# 3. ログイン: exec_demo@aentro.io / Aentro!2026

# 4. 各シナリオ画面を新タブで事前ロード:
open http://localhost:3000/incidents
open http://localhost:3000/ai-analyst
open http://localhost:3000/labor
open http://localhost:3000/sv-missions
open http://localhost:3000/meeting-packs
open http://localhost:3000/admin/lineage
open http://localhost:3000/admin/roles
```

---

## トラブルシュート

### 症状別

| 症状 | 対処 |
|---|---|
| `make demo-seed` でエラー | `docker compose logs api` 確認、不足 migration なら `make migrate` |
| ZD-* 店舗が出ない | 既存 `demo` テナントが無い → `make seed` 先に実行 |
| AI 応答が出ない / 遅い | `/api/ai/health` チェック、`OPENAI_API_KEY` を `.env` に確認 |
| マップピンが出ない | seed の lat/lng が空 → `make demo-reset` |
| シフト画面で AI 推奨ボタンなし | feature flag `LABOR_AI=true` を `.env` に |
| meeting-pack 生成が止まる | 既存生成済みパックを使う / `/meeting-packs/[既存ID]` |
| docker compose が遅い | `--profile minimal` を使う or db メモリ増 |

### よくある質問

**Q. 1 万店舗のスケール大丈夫？**
> 「現在 80 店舗ですが、本番は **store_id × business_date のパーティション** で 1 万店舗 × 5 年でもサブ秒応答。Postgres + TimescaleDB ハイブリッド」

**Q. オンプレ / クラウドどちらでも？**
> 「両方。AWS / GCP / Azure 全対応。**ゼンショー様の AWS Tokyo** にデプロイ可能」

**Q. POS 連携の費用は？**
> 「主要 POS (Square, スマレジ, ぐるなび, NEC等) は **既存コネクタ** あり。標準 8 週間内、追加費用なし」

---

## デモ実行 5 行ハウツー

```
1. make demo-up                                 # 環境起動 (初回のみ ~5分)
2. open http://localhost:3000                   # ログイン: exec_demo@aentro.io / Aentro!2026
3. /zensho-executive で全国俯瞰 → 赤ピンクリック
4. /incidents → AI Analyst → /tasks 自動発行を見せる
5. /labor で AI シフト最適化 / /admin/roles で FC 権限分離
```

---

## メンテナンス

- データを毎回クリーンに: `make demo-reset` (ZD-* だけ消して再生成)
- DB を完全初期化: `make reset` (全データ消える、注意)
- スクショ撮り直し: `docs/demo/*.md` 内 `[SS差込: ...]` マーカー検索 → 該当画面でキャプチャ → `docs/demo/screenshots/` に保存
