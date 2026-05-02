# S-G — 業界深掘り仕上げ（+2点 / 2日）

## 現状
- レシピBOM / 労務 / QSC / HACCP / FC / ベンチマーク: モデル+API+seed+UI済み
- TradeArea / CompetitorStore / PopulationMesh / PriceDecision / PriceElasticity: モデル+seed済み
- **Huff予測がUIから呼べない**: APIはあるがフロントの `/expansion` に未配線
- **メニュー工学マトリクスがUIにない**: APIはあるが `/campaigns` に未配線
- **商品詳細ページがない**: 価格履歴/弾力性/共食いを見るページがない
- **レシピ原価計算がフロントに反映されていない**: APIのサマリをUIで見せていない

## ゴール
出店候補のHuff予測結果 + メニュー工学の4象限マトリクス + 商品詳細ページが全てUIで動く。

---

## 実装手順

### Step 1: /expansion に Huff予測タブ追加（3時間）

`frontend/src/app/expansion/page.tsx` を修正:

既存のページにタブ追加「Huff 商圏予測」:
- 入力フォーム:
  - 緯度 / 経度（数値入力。デフォルト: 35.6285, 139.7387 = 品川港南）
  - ブランド選択（select: すき家/はま寿司/ココス/なか卯/ジョリーパスタ）
  - 魅力度（1.0デフォルト、slider 0.5〜2.0）
  - 距離減衰β（2.0デフォルト）
  - 最大半径km（5.0デフォルト）
- 「予測実行」ボタン → `POST /api/v1/vertical/trade-areas/predict-huff`
- 結果表示:
  - 月間来店予測数
  - 月間売上推定額（¥表示）
  - 初年度売上推定額
  - 損益分岐月数
  - 自店食い合い率（%）
  - 周辺競合店数
  - 各メトリクスはカード形式で色分け（良=green, 要注意=amber, 危険=red）

### Step 2: /campaigns にメニュー工学タブ追加（3時間）

`frontend/src/app/campaigns/page.tsx` を修正:

タブ追加「メニュー工学」:
- ブランド選択 + 期間選択
- 「分析実行」ボタン → `GET /api/v1/vertical/pricing/menu-engineering?brand_id=...&period_start=...&period_end=...`
- 結果: 4象限散布図（recharts ScatterChart）
  - X軸: 売上数量（log scale可）
  - Y軸: 粗利率（%）
  - 4象限:
    - 右上(Star ⭐): 高売上+高利益 → 緑
    - 左上(Puzzle 🧩): 低売上+高利益 → 青
    - 右下(Plowhorse 🐴): 高売上+低利益 → 黄
    - 左下(Dog 🐕): 低売上+低利益 → 赤
  - 各ドットにホバーで商品名+数値表示
  - 中央線を破線で表示（median_sales, median_margin）
- 散布図の下: 象限別商品テーブル
  - Star: 主力商品一覧
  - Puzzle: 推奨強化候補
  - Plowhorse: 原価改善候補
  - Dog: 廃止検討候補

### Step 3: 商品詳細ページ（3時間）

`frontend/src/app/products/[id]/page.tsx` 新設:

ContextHeader: 商品名 + ブランドバッジ + カテゴリ

KPIカード行:
- 売価
- 理論原価
- 原価率
- 月間販売数
- 弾力性係数（あれば）

セクション1: 売上・数量推移チャート（recharts LineChart、過去12ヶ月）

セクション2: 価格弾力性
- 弾力性係数（数値 + confidence interval）
- 弾力性の解釈テキスト:
  - |ε| < 0.5: 非弾力的（値上げ余地あり）
  - 0.5 ≤ |ε| < 1.0: 中程度
  - |ε| ≥ 1.0: 弾力的（値上げ注意）
- データソース: `GET /api/v1/vertical/pricing/elasticities`

セクション3: 価格変更履歴テーブル
- 変更日, 旧価格, 新価格, 理由, 決定方法, 予測影響, 実績影響
- データソース: `GET /api/v1/vertical/pricing/decisions?product_id={id}`

セクション4: レシピ・BOM（この商品にレシピがあれば）
- 食材名, 数量, 単位, 単価, 小計
- 合計 = 理論原価
- データソース: `GET /api/v1/vertical/recipes/{recipe_id}`

### Step 4: サイドバーに商品リンク追加（15分）

sidebar.tsx に追加不要（商品詳細は他ページからのドリルダウンで到達）。
ただし、recipes ページの商品名クリック → `/products/{id}` へのリンクを追加。

### Step 5: recipes ページの原価サマリ強化（1時間）

`frontend/src/app/recipes/page.tsx` 修正:
- トップのサマリカードに `GET /api/v1/vertical/recipe-costing/summary` の結果を表示:
  - 全体理論原価率
  - 実績原価率（PLから）
  - 乖離額（年間推定）
- レシピ一覧の「理論原価」列をAPIデータから表示（現在はmock）
- 商品名クリック → `/products/{product_id}` にリンク

### Step 6: mock data + API fallback追加（1時間）

新ページ用のmockデータを `src/lib/mock-data.ts` に追加:
- mockHuffResult: Huff予測結果サンプル
- mockMenuEngineering: 4象限分類された商品15件
- mockProductDetail: 商品詳細1件（すき家牛丼並盛）
- mockPriceElasticity: 弾力性5件

`src/lib/api.ts` に対応するfallbackルート追加。

---

## 完了基準
- [ ] /expansion の「Huff商圏予測」タブで座標入力 → 予測結果6項目が表示
- [ ] /campaigns の「メニュー工学」タブで散布図が描画、4象限に色分け
- [ ] /products/[id] で商品詳細（価格/弾力性/価格履歴/BOM）が表示
- [ ] recipes ページの原価サマリカードに理論vs実績の乖離が表示
- [ ] 商品名クリックで /products/[id] に遷移
- [ ] 全ページがmockフォールバックで動作（API接続なしでも表示）
