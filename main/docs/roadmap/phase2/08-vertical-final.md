# Phase 2 / S4 — 業界深掘り完成（+2点 / 1週）

## 課題
Phase 1 で Phase A（労務 + FC + ベンチマーク）と Phase B（レシピ + HACCP）は実装済。残りは **Phase C（商圏分析 + 価格決定）**：
- **商圏 (Trade Area)** 未実装：Huff モデル、競合店、e-Stat 連携
- **PriceDecision** 未実装：弾力性、メニュー工学マトリクス

これが入ると「出店判断」「価格戦略」が AENTRO で完結する。外食チェーンの戦略部門が一番興味を持つ領域。

## ゴール
- 出店候補について Huff モデルで予測来店確率 + 推定初年度売上を算出
- 価格弾力性を過去データから自動計算、メニュー工学マトリクス（売上量 × 利益率）が描ける

---

## 仕様書

### 商圏 / Huff モデル

#### モデル

```python
class TradeArea(Base):
    __tablename__ = "trade_areas"
    id, tenant_id, store_id (fk, unique)
    polygon: Mapped[dict] = JSONB             # GeoJSON polygon
    radius_m: Mapped[int | None]              # 円形商圏の半径（簡易版）
    population_count: Mapped[int]             # 商圏内人口
    daytime_population: Mapped[int]
    households: Mapped[int]
    estimated_market_size_jpy: Mapped[int]    # 商圏内の外食支出推定総額
    last_calculated_at

class CompetitorStore(Base):
    __tablename__ = "competitor_stores"
    id, tenant_id
    name: Mapped[str]                         # マクドナルド渋谷駅前店
    brand_name: Mapped[str]                   # マクドナルド
    business_category: Mapped[str]            # ハンバーガー
    lat, lon
    estimated_revenue_jpy: Mapped[int | None]
    distance_to_nearest_own_m: Mapped[float | None]
    source: Mapped[str]                       # google_places | manual | scrape

class PopulationMesh(Base):
    """e-Stat の3次メッシュ（1km）人口データ"""
    __tablename__ = "population_meshes"
    mesh_code: Mapped[str] = primary_key      # e.g. "5339-45-12"
    lat, lon                                  # メッシュ中心
    population: Mapped[int]
    daytime_population: Mapped[int]
    households: Mapped[int]
    age_distribution: Mapped[dict] = JSONB
    income_class: Mapped[dict] = JSONB
    last_updated
```

#### Huff モデル
店舗 i の魅力度 A_i、距離 d_ij、距離抵抗 β とすると、メッシュ j の住民が店舗 i を選ぶ確率：

```
P_ij = (A_i / d_ij^β) / Σ_k (A_k / d_kj^β)
```

`app/services/huff_model.py`:
```python
async def predict_visit_probability(
    db, tenant_id, candidate_lat, candidate_lon, candidate_attractiveness,
    competitor_decay_beta=2.0, max_radius_km=5.0,
) -> dict:
    # 1. 候補地周辺のメッシュを取得
    meshes = await _meshes_within_radius(db, candidate_lat, candidate_lon, max_radius_km)
    
    # 2. 周辺の自店 + 競合店を取得
    own_stores = await _own_stores_within(db, tenant_id, candidate_lat, candidate_lon, max_radius_km)
    competitors = await _competitors_within(db, tenant_id, candidate_lat, candidate_lon, max_radius_km)
    
    # 3. 各メッシュごとに Huff 確率計算
    total_visits = 0.0
    by_mesh = []
    for m in meshes:
        d_candidate = haversine(candidate_lat, candidate_lon, m.lat, m.lon)
        attractive_sum = candidate_attractiveness / (d_candidate ** competitor_decay_beta)
        for s in own_stores + competitors:
            d_s = haversine(s.lat, s.lon, m.lat, m.lon)
            attractive_sum += s.attractiveness / (d_s ** competitor_decay_beta)
        
        p_candidate = (candidate_attractiveness / (d_candidate ** competitor_decay_beta)) / attractive_sum
        visits = m.daytime_population * p_candidate * VISIT_FREQ_PER_PERSON  # 月次想定
        total_visits += visits
        by_mesh.append({"mesh": m.mesh_code, "prob": p_candidate, "visits": visits})
    
    # 4. 月次売上推定（来店数 × 平均客単価）
    avg_ticket_estimate = await _brand_avg_ticket(db, tenant_id)
    monthly_revenue_estimate = total_visits * avg_ticket_estimate
    
    return {
        "total_monthly_visits": total_visits,
        "monthly_revenue_estimate_jpy": monthly_revenue_estimate,
        "first_year_revenue_estimate_jpy": monthly_revenue_estimate * 12 * 0.7,  # 立ち上がり係数
        "breakeven_months_estimate": _estimate_breakeven(monthly_revenue_estimate, INVESTMENT),
        "cannibalization_pct": _cannibalization(own_stores, by_mesh),  # 自店食い合い率
        "competitive_density": len(competitors),
        "by_mesh": by_mesh,
    }
```

#### e-Stat 取り込み
`app/services/estat_importer.py`:
- e-Stat API（無料、要 appId）でメッシュ統計を取得
- 5337 系（東京）、5236（横浜）等のメッシュコードで分割取得
- 月次バッチで更新（人口統計は変化遅いので年1回でも可）

#### ExpansionCandidate 拡張
既存 `LocationCandidate` モデルに：
```python
huff_score: Mapped[float | None]
predicted_monthly_visits: Mapped[int | None]
predicted_first_year_revenue: Mapped[int | None]
cannibalization_risk_pct: Mapped[float | None]
competitive_density: Mapped[int | None]
estimated_breakeven_months: Mapped[int | None]
```

#### UI
`/expansion` ページに「Huff 予測」タブ追加：
- 候補地点（lat/lon）入力 or 地図クリック
- 商圏ポリゴン + 競合店 + 自店をマップ表示
- 予測結果カード：来店数 / 売上 / 損益分岐月 / 競合密度
- 既存候補一覧に「Huff スコア」カラム

### 価格決定 / メニュー工学

#### モデル

```python
class PriceDecision(Base):
    __tablename__ = "price_decisions"
    id, tenant_id, product_id (fk)
    decided_price: Mapped[int]
    previous_price: Mapped[int]
    effective_from, effective_to: Mapped[date | None]
    rationale: Mapped[str]
    decision_method: Mapped[str]              # data_driven | competitive | cost_plus | manual
    expected_volume_change_pct: Mapped[float]
    expected_revenue_change_pct: Mapped[float]
    actual_volume_change_pct: Mapped[float | None]
    actual_revenue_change_pct: Mapped[float | None]
    decided_by, decided_at

class PriceElasticity(Base):
    """商品ごとの価格弾力性（過去データから算出）"""
    __tablename__ = "price_elasticities"
    id, tenant_id, product_id (fk, unique)
    elasticity: Mapped[float]                 # 価格1%上昇時の数量変化%
    confidence_interval_low, confidence_interval_high
    sample_period_start, sample_period_end
    sample_size: Mapped[int]
    r_squared: Mapped[float]
    calculated_at
```

#### 弾力性計算
`app/services/elasticity_calculator.py`:
```python
async def calculate_elasticity(db, tenant_id, product_id, lookback_days=730):
    """過去2年の価格変更履歴 × 数量変化から弾力性回帰"""
    history = await _load_price_volume_history(db, product_id, lookback_days)
    # log-log 回帰
    log_p = np.log(history.price)
    log_q = np.log(history.quantity)
    
    if len(history) < 30:
        return None  # サンプル不足
    
    slope, intercept, r_value, p_value, std_err = scipy.stats.linregress(log_p, log_q)
    elasticity = slope
    ci_low = elasticity - 1.96 * std_err
    ci_high = elasticity + 1.96 * std_err
    
    return PriceElasticity(
        product_id=product_id, elasticity=elasticity,
        confidence_interval_low=ci_low, confidence_interval_high=ci_high,
        sample_period_start=history.start_date, sample_period_end=history.end_date,
        sample_size=len(history), r_squared=r_value ** 2,
    )
```

#### メニュー工学マトリクス
売上量 × 利益率 の 4象限：
- **Stars**: 高売上 + 高利益率 → 主力
- **Plowhorses**: 高売上 + 低利益率 → 原価改善 or 値上げ余地
- **Puzzles**: 低売上 + 高利益率 → 推奨強化（券売機 / メニュー位置）
- **Dogs**: 低売上 + 低利益率 → 廃止候補

```python
async def menu_engineering_matrix(db, tenant_id, brand_id, period_start, period_end):
    products = await _products_with_stats(db, tenant_id, brand_id, period_start, period_end)
    
    median_sales = np.median([p.sales_count for p in products])
    median_margin = np.median([p.gross_margin_pct for p in products])
    
    for p in products:
        if p.sales_count >= median_sales and p.gross_margin_pct >= median_margin:
            p.quadrant = "star"
        elif p.sales_count >= median_sales:
            p.quadrant = "plowhorse"
        elif p.gross_margin_pct >= median_margin:
            p.quadrant = "puzzle"
        else:
            p.quadrant = "dog"
    return products
```

#### UI
`/campaigns` ページ（既存）に「メニュー工学」タブ追加：
- 4象限マトリクス散布図（visx scatter）
- 商品をクリック → 詳細（売上推移 / 価格履歴 / 弾力性）
- 「価格変更を提案」ボタン → PriceDecision draft 作成

`/products/[id]` 新設（store と同様）：
- 商品基本情報
- 売上 / 数量 / 価格の時系列
- 弾力性スコア
- 共食い分析（cannibalization_partners）
- 価格変更履歴

---

## 指示書（実装手順）

### Step 1: 依存追加（30分）
```
pip install scipy shapely geojson pyestat
npm install @visx/scatter @visx/legend
```

### Step 2: 商圏モデル + e-Stat（2日）
1. TradeArea / CompetitorStore / PopulationMesh モデル + Alembic
2. `app/services/estat_importer.py`：
   - `pyestat` で人口統計取得
   - 主要都市圏のメッシュを初回 fetch
3. `scripts/import_estat.py` で月次/年次 fetch
4. 競合店データは Google Places API で取得（option）or 手動 CSV

### Step 3: Huff エンジン（1.5日）
1. `app/services/huff_model.py` 実装
2. haversine distance + 距離減衰
3. 自店食い合い率の計算
4. brand 別の attractiveness 推定（売上 / 客数 から）

### Step 4: ExpansionCandidate 拡張（半日）
1. LocationCandidate に Huff カラム追加 + Alembic
2. 既存 candidates に Huff バッチ計算
3. /api/v1/expansion endpoints で Huff 結果を返す

### Step 5: 価格弾力性（1日）
1. PriceDecision / PriceElasticity モデル
2. `app/services/elasticity_calculator.py`
3. バッチで全商品の弾力性計算
4. R² < 0.3 は "信頼度低" マーク

### Step 6: メニュー工学（半日）
1. `app/services/menu_engineering.py`
2. 4象限分類
3. /api/v1/campaigns/menu-engineering endpoint

### Step 7: Frontend（2日）
1. `/expansion` の Huff タブ
   - 地図 + 候補地クリック
   - 結果カード
2. `/campaigns` のメニュー工学タブ
   - 散布図
   - 商品 drilldown
3. `/products/[id]` ページ新設
   - 売上時系列 + 価格 + 弾力性

---

## 完了基準

- [ ] e-Stat メッシュデータが PopulationMesh に投入されている（首都圏 + 主要都市圏）
- [ ] /expansion で候補地点を入力 → Huff 予測（来店数 / 売上 / 損益分岐月）が表示
- [ ] 自店食い合い率が計算される
- [ ] 全商品の価格弾力性が計算され、PriceElasticity に保存
- [ ] /campaigns のメニュー工学マトリクス（散布図）が描画される
- [ ] 商品詳細ページ /products/[id] で価格履歴 + 弾力性 + 共食い情報が見える
- [ ] PriceDecision の draft 作成が UI から可能
- [ ] 既存 /expansion で Huff スコア順ソートが可能

## 工数見積
- Step 1: 30分
- Step 2: 2日
- Step 3: 1.5日
- Step 4: 半日
- Step 5: 1日
- Step 6: 半日
- Step 7: 2日
- **合計: 7.5日（≈ 1週）**

## 増点内訳
- 08 業界深掘り：商圏Huff + 価格弾力性 + メニュー工学 で **+2**
- = **+2点**

## 注意
- e-Stat API は無料だが取得制限あり、夜間バッチで分割取得
- Google Places API は有料（$17/1000calls）。競合店データは手動 CSV 投入も可能に
- 弾力性は商品ごとの価格変更履歴がないと計算不能。サンプル不足時は brand カテゴリ平均で代用
- Huff の β（距離減衰）は業態で違う（ファストフード 1.5、ファミレス 2.0、回転寿司 2.5 推奨）
