# 08 — 業界深掘り（外食特化資産）（+7点）

## 課題
現状の models は「店舗 / 売上 / 在庫 / 従業員」の標準SaaS的な薄さ。外食を本気でやるなら **レシピBOM・原価・シフト法令・QSC・保健所/HACCP・FC会計** まで踏み込む必要がある。これらは Foundry の汎用性では絶対に勝てない領域。**ここで勝つから "外食専用 Palantir" を名乗れる**。

## ゴール
8つのドメインアセットを構築：
1. レシピ / BOM / 原価
2. 商品ライフサイクル / 価格決定
3. 労務（シフト + 法令対応）
4. QSC（品質・サービス・清潔）
5. 保健所 / HACCP / アレルゲン
6. FC ロイヤリティ会計
7. 営業エリア / 商圏 / ハフモデル
8. 業態ごとの業界ベンチマーク

各ドメインは **業界ガイドライン準拠 + 標準テンプレ + KPI セット** をまとめて提供。

---

## 仕様書

### 1. レシピ / BOM / 原価

```python
class Ingredient(Base):
    __tablename__ = "ingredients"
    id, tenant_id
    name                                  # 牛バラ肉、玉ねぎ等
    unit: Mapped[str]                     # g, ml, 個
    supplier_id (fk)
    standard_cost_per_unit                # 基準原価
    allergen_codes: Mapped[list]          # 食品表示法準拠の28品目
    storage_temperature: Mapped[str]      # 常温/冷蔵/冷凍
    shelf_life_days

class Recipe(Base):
    __tablename__ = "recipes"
    id, tenant_id
    product_id (fk)
    version
    yield_quantity                        # 1レシピで何人前
    cooking_time_minutes
    instructions: Mapped[str | None]
    status: Mapped[str]                   # active | testing | retired
    valid_from, valid_to

class RecipeBOM(Base):
    """レシピ ↔ 食材 の N-to-N"""
    __tablename__ = "recipe_bom"
    recipe_id, ingredient_id
    quantity, unit
    notes

class IngredientPriceHistory(Base):
    __tablename__ = "ingredient_price_history"
    id, tenant_id, ingredient_id
    supplier_id
    unit_price
    effective_date
    source: Mapped[str]                   # contract | spot | seasonal_forecast
```

KPI:
- `theoretical_food_cost`: BOM × 価格 × 売上数量
- `actual_vs_theoretical_variance`: 実原価 − 理論原価
- `recipe_margin`: (price − food_cost) / price
- `ingredient_volatility`: 原材料価格の月次変動係数

### 2. 商品ライフサイクル / 価格決定

```python
class Product(Base):  # 既存を拡張
    # 既存フィールド
    product_id, tenant_id, brand_id, name
    # 追加
    category: Mapped[str]                 # 主菜 / 副菜 / セット / 季節限定
    lifecycle_stage: Mapped[str]          # introduction | growth | maturity | decline
    introduced_at, retired_at
    target_price
    target_food_cost_ratio
    cannibalization_partners: list[str]   # 共食い分析用
    
class PriceDecision(Base):
    __tablename__ = "price_decisions"
    id, tenant_id, product_id
    decided_price
    effective_from, effective_to
    rationale: Mapped[str]
    expected_volume_change                # 値上げ時の想定数量減
    expected_revenue_change
    actual_volume_change                  # 計測済み
    actual_revenue_change
    decision_method: Mapped[str]          # data_driven | competitive | cost_plus
```

KPI:
- `price_elasticity`: 弾力性係数
- `menu_engineering_quadrant`: Boston matrix (売上量 × 利益率)
- `cannibalization_index`: 新商品投入時の既存商品売上影響

### 3. 労務（シフト + 法令）

```python
class ShiftPattern(Base):
    __tablename__ = "shift_patterns"
    id, tenant_id, store_id
    name                                  # 通常日 / ピーク日 / 閑散日
    weekday_pattern: Mapped[dict]         # 曜日 × 時間帯 × 必要人数
    role_requirements: Mapped[dict]       # 調理 1名 / レジ 2名 等

class Shift(Base):
    __tablename__ = "shifts"
    id, tenant_id, store_id, employee_id
    start_at, end_at
    role
    actual_start_at, actual_end_at        # 打刻実績
    break_minutes
    overtime_hours
    night_hours                           # 22:00-5:00
    legal_violations: Mapped[list]        # ["weekly_40h_exceeded", "rest_interval_short"]

class LaborLawProfile(Base):
    """日本労働基準法ベース、業態固有のルール"""
    __tablename__ = "labor_law_profiles"
    id, tenant_id
    weekly_max_hours: int                 # 40
    daily_max_hours: int                  # 8 (36協定で延長可)
    night_premium_rate: float             # 1.25
    overtime_premium_rate: float          # 1.25 (60h超は1.5)
    rest_min_minutes_per_6h: int          # 45
    rest_min_minutes_per_8h: int          # 60
    rest_interval_min_hours: int          # 11 (努力義務)
    minor_under_18_no_night: bool         # true
```

`app/services/labor_compliance.py`:
- シフト作成時に違反検知
- 違反は `legal_violations` に記録
- 月次集計で 36協定違反件数をレポート
- 最低賃金チェック（都道府県別）

### 4. QSC（品質・サービス・清潔）

```python
class QSCAudit(Base):
    __tablename__ = "qsc_audits"
    id, tenant_id, store_id
    auditor_user_id
    audit_date
    quality_score: float                  # 0-100
    service_score: float
    cleanliness_score: float
    overall_score: float
    template_id (fk)
    answers: Mapped[dict]                 # 各質問の回答
    photos: Mapped[list[str]]             # S3 keys
    notes

class QSCTemplate(Base):
    __tablename__ = "qsc_templates"
    id, tenant_id
    name
    version
    sections: Mapped[list]                # [{name, weight, items: [...]}]
```

KPI:
- `qsc_score`: Q/S/C の重み付き平均
- `qsc_consistency`: 店舗間のスコア標準偏差
- `qsc_correlation_to_sales`: QSCスコアと売上の相関

### 5. 保健所 / HACCP / アレルゲン

```python
class HygieneInspection(Base):
    __tablename__ = "hygiene_inspections"
    id, tenant_id, store_id
    inspection_date
    inspector_type: Mapped[str]           # health_office | internal | franchisor
    findings: Mapped[list]
    severity: Mapped[str]
    corrective_actions_due_date
    status: Mapped[str]                   # open | corrected | closed
    documents: Mapped[list[str]]

class HACCPMonitoring(Base):
    """HACCP 義務化 (2021年6月〜) 対応"""
    __tablename__ = "haccp_monitoring"
    id, tenant_id, store_id
    monitoring_date_time
    ccp_id                                # critical control point
    measured_value                        # 例: 温度 65℃
    threshold_min, threshold_max
    is_compliant
    deviation_action: Mapped[str | None]

class CCPDefinition(Base):
    __tablename__ = "ccp_definitions"
    id, tenant_id
    name                                  # 「揚げ物中心温度」「冷蔵庫温度」
    threshold_min, threshold_max
    monitoring_frequency                  # daily / hourly / per_batch
    monitoring_method
    
class AllergenMatrix(Base):
    """商品 × アレルゲン28品目"""
    __tablename__ = "allergen_matrix"
    product_id, tenant_id
    allergen_code                         # 28品目（特定原材料7 + 推奨21）
    presence: Mapped[str]                 # contains | trace | none
    cross_contamination_risk: bool
```

KPI:
- `haccp_compliance_rate`: 月次 monitoring 件数 / 想定件数
- `hygiene_findings_open`: 未対応指摘事項
- `allergen_data_completeness`: 商品×アレルゲン マトリクスの記入率

### 6. FC（フランチャイズ）会計

```python
class FranchiseAgreement(Base):
    __tablename__ = "franchise_agreements"
    id, tenant_id
    franchisee_company_id
    store_id
    agreement_type: Mapped[str]           # direct | franchise | subleasing
    effective_from, effective_to
    royalty_structure: Mapped[dict]       # {"type": "revenue_pct", "rate": 0.05} 等
    advertising_fund_rate
    territory_rights: Mapped[dict | None]
    minimum_revenue_guarantee

class FranchiseRoyaltyCalc(Base):
    __tablename__ = "franchise_royalty_calcs"
    id, tenant_id, agreement_id, store_id
    period_year, period_month
    gross_revenue
    royalty_base                          # 売上 - 控除
    royalty_amount
    advertising_amount
    net_payable
    status: Mapped[str]                   # draft | invoiced | paid
    invoice_id
```

`app/services/royalty_engine.py`:
- 月次自動計算
- 多様な royalty 構造に対応（売上%/利益%/固定/段階）
- 直営店との P/L 分離

KPI:
- `royalty_revenue_per_brand`
- `franchisee_health_score`
- `territory_overlap_index`

### 7. 営業エリア / 商圏

```python
class TradeArea(Base):
    """店舗の商圏（ポリゴン）"""
    __tablename__ = "trade_areas"
    id, tenant_id, store_id
    polygon: Mapped[dict]                 # GeoJSON
    radius_m: int | None                  # 円形商圏の場合
    population_count: int
    daytime_population: int
    households: int
    estimated_market_size_jpy: int

class CompetitorStore(Base):
    __tablename__ = "competitor_stores"
    id, tenant_id
    name
    brand                                 # マクドナルド、すき家 等
    category
    lat, lon
    estimated_revenue
    distance_to_nearest_own: float        # m

class ExpansionCandidate(Base):  # 既存拡張
    # 既存
    # 追加
    huff_score: float                     # ハフモデル予測
    cannibalization_risk: float           # 自店舗との共食い
    competitive_density: int              # 半径500m内の競合数
    expected_first_year_revenue
    expected_breakeven_months
```

`app/services/huff_model.py`:
- 商圏ポリゴンと住居メッシュから予測来店確率
- e-Stat の国勢調査データ取り込み（バッチで）

### 8. 業界ベンチマーク

```python
class IndustryBenchmark(Base):
    __tablename__ = "industry_benchmarks"
    id
    business_category: Mapped[str]        # 牛丼 | とんかつ | カレー | 寿司 | ファミレス
    metric_name                           # food_cost_ratio | labor_ratio | rent_ratio
    period_year, period_month | None
    p25, p50, p75, p90
    sample_size
    source                                # 日本フードサービス協会 / 内製集計
```

`app/seed/industry_benchmarks.py`:
- 公開統計（フードサービス協会、農水省、東商）から初期セット投入
- 顧客データを匿名化して集計に追加（opt-in）

---

## 指示書（実装手順）

### Phase A: 即効ドメイン（FC会計 + シフト法令）— 4週間
**理由**: 顧客の経営課題に直結、既存データで実装できる

#### Step A1: シフト法令 (1.5週)
1. `app/models/labor.py` 拡張
2. `app/services/labor_compliance.py`：違反検知エンジン
3. シフト作成 API に validation hook
4. `/admin/labor-compliance` ダッシュボード

#### Step A2: FC ロイヤリティ (2週)
1. franchise_agreements / franchise_royalty_calcs モデル
2. `app/services/royalty_engine.py`
3. 月次バッチ：APScheduler に追加
4. `/franchise-accounting` ページ

#### Step A3: 業界ベンチマーク (0.5週)
1. industry_benchmarks テーブル + seed
2. KPI ダッシュボードに「業界比較」モード
3. peer_comparator.py を改修

### Phase B: 競争優位ドメイン（レシピBOM + HACCP）— 4週間

#### Step B1: レシピBOM (2週)
1. ingredients / recipes / recipe_bom / ingredient_price_history
2. `app/services/recipe_costing.py`：理論原価エンジン
3. CSV インポート（顧客の既存レシピ表）
4. `/recipes` 管理ページ
5. KPI: 理論vs実原価差異

#### Step B2: HACCP / アレルゲン (2週)
1. haccp_monitoring / ccp_definitions / allergen_matrix
2. モバイル UI（スマホで温度入力）
3. アレルゲン搭載で商品ページに表示
4. `/haccp` 管理ページ

### Phase C: 戦略ドメイン（商圏 + QSC + Price）— 4週間

#### Step C1: QSC (1.5週)
1. qsc_audits / qsc_templates
2. iPad 想定の audit 入力 UI
3. 写真アップロード（S3）
4. `/qsc` ダッシュボード

#### Step C2: 商圏 / Huff (1.5週)
1. trade_areas / competitor_stores
2. `app/services/huff_model.py`
3. e-Stat メッシュデータ取り込みスクリプト
4. `/expansion` ページに Huff 予測タブ

#### Step C3: Price Decision (1週)
1. price_decisions モデル
2. 弾力性計算（過去データから）
3. メニュー工学マトリクス UI

---

## 完了基準

### Phase A
- [x] AI Analyst から労務法令違反サマリを取得できる
- [ ] シフト作成時に労基違反が自動検知 → アラート表示
- [ ] 月次でFC契約30件分のロイヤリティ計算が自動完走
- [ ] 業界ベンチマーク 5指標で peer comparison が出る

### Phase B
- [x] AI Analyst から商品別の理論原価/粗利外れ値を取得できる
- [x] AI Analyst からHACCP monitoring compliance を取得できる
- [ ] 100レシピ以上の BOM が登録済み、理論原価が日次計算される
- [ ] HACCP daily monitoring が iPad で5秒以内に1記録
- [ ] アレルゲン28品目マトリクスが全商品で完成

### Phase C
- [x] AI Analyst からQSC audit score サマリを取得できる
- [ ] QSC audit が iPad で完走、自動スコア化、写真添付
- [ ] 出店候補の Huff 予測が国勢調査データに基づき算出
- [ ] 価格弾力性が過去2年データから自動計算

## 2026-05-02 実装メモ
- `app/services/ai/tools.py`: 外食ドメインの既存モデルを AI tool surface に接続。商品粗利、労務法令、QSC、HACCPを自然言語質問から参照できる形にした

## 工数見積
- Phase A: 4週間（1人）
- Phase B: 4週間（1人）
- Phase C: 4週間（1人）
- **合計: 12週間（1人）/ 並列なら 6週間（2人）**

## 注意
- すべて 01 動的オントロジーが完成してから着手すれば、ハードコードせず ontology 拡張として実装可能
- e-Stat API は無料だが取得制限あり、夜間バッチで日次取得
- HACCP / アレルゲンは法的リスクが大きい。**「参考情報」明記**で免責。最終責任は事業者
- 業界ベンチマーク seed の数値は架空でも初期は OK だが、本番では出典明記必須
