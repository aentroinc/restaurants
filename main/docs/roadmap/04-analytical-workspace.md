# 04 — 分析ワークスペース（+8点）

## 課題
Foundry の本質的な価値の一つは **Code Workbook / Contour / Quiver**：アナリストが SQL/Python/UIで自由にデータ探索→保存→共有できる空間。main にはこれが完全に欠けている。各ページは "決め打ちダッシュボード" のみ。

## ゴール
- ノーコードでコホート分析・Pivot・時系列比較ができる
- カスタムKPI builder で「式 + 集約軸 + フィルタ」を保存・共有
- 分析結果は ontology を介してパイプライン化（再利用 / 派生）
- Parquet / CSV エクスポート
- 分析を Meeting Pack に貼れる

---

## 仕様書

### コア概念

| 概念 | 説明 | Foundry対応 |
|------|------|-----------|
| Dataset | クエリ済みデータセット（テーブル / KPI / 派生） | Foundry Dataset |
| Analysis | 1つの分析セッション。複数 panel を持つ | Contour |
| Panel | チャート1枚 / Pivot 1個 | Contour Path |
| Custom KPI | ユーザー定義 KPI（式 + 集約 + フィルタ） | Quiver |
| Cohort | 条件で抽出した instance 群 | Object Set |
| Saved Query | 保存されたデータ問い合わせ | Code Workbook output |

### データモデル

```python
class Analysis(Base):
    __tablename__ = "analyses"
    id, tenant_id
    name, description
    owner_user_id
    visibility: Mapped[str]            # private | tenant | role:{role}
    spec: Mapped[dict] = mapped_column(JSONB)  # panels, filters, layout
    created_at, updated_at

class CustomKPI(Base):
    __tablename__ = "custom_kpis"
    id, tenant_id
    api_name: Mapped[str]
    display_name
    formula: Mapped[str]               # e.g. "sum(sales) / count(distinct customer_id)"
    target_object_type: Mapped[str]    # e.g. "Store"
    aggregation_axis: Mapped[list]     # ["region", "month"]
    filters: Mapped[dict | None]
    unit: Mapped[str | None]
    created_by, version, status

class Cohort(Base):
    __tablename__ = "cohorts"
    id, tenant_id
    name
    object_type: Mapped[str]
    filter_spec: Mapped[dict]          # ontology query
    snapshot_at: Mapped[datetime | None]   # 固定時点コホート用
    created_by

class SavedQuery(Base):
    __tablename__ = "saved_queries"
    id, tenant_id
    name
    query_type: Mapped[str]            # ontology | sql | kpi
    query: Mapped[dict]                # spec
    last_run_at, row_count
```

### 分析 spec フォーマット

```json
{
  "name": "首都圏駅前店 粗利率分析",
  "panels": [
    {
      "id": "p1",
      "type": "line_chart",
      "data": {
        "kpi": "gross_margin",
        "scope": {"region": "首都圏", "location_type": "駅前"},
        "period": {"from": "2025-01-01", "to": "2026-04-30", "granularity": "monthly"},
        "group_by": "brand"
      },
      "encoding": {"x": "month", "y": "gross_margin", "color": "brand"}
    },
    {
      "id": "p2",
      "type": "pivot_table",
      "data": {...},
      "rows": ["brand"], "columns": ["month"], "values": ["gross_margin", "customer_count"]
    },
    {
      "id": "p3",
      "type": "cohort",
      "cohort_id": "...",
      "metric": "avg_ticket"
    }
  ],
  "filters_global": {"period": {...}, "tenant_brand_ids": [...]}
}
```

### Custom KPI Formula DSL

簡易 DSL：
- 集約関数: `sum`, `avg`, `count`, `count_distinct`, `min`, `max`, `percentile(p)`
- 演算: `+ - * /`
- フィールド参照: `{property_name}` または `{ObjectType.property}`
- 条件: `if(cond, then, else)`
- ウィンドウ: `lag(field, n)`, `lead(field, n)`, `mom`, `yoy`

例:
```
gross_margin = ({sales} - {cogs}) / {sales}
mom_growth = ({sales} - lag({sales}, 1)) / lag({sales}, 1)
labor_efficiency = {sales} / {labor_hours}
```

パーサ：`lark` or `pyparsing` で AST → SQLAlchemy expression 変換

### API

```
GET    /api/v1/analyses
POST   /api/v1/analyses
GET    /api/v1/analyses/{id}
PUT    /api/v1/analyses/{id}
DELETE /api/v1/analyses/{id}
POST   /api/v1/analyses/{id}/run                # 実行 → 結果 JSON
POST   /api/v1/analyses/{id}/export?format=csv|parquet|xlsx
POST   /api/v1/analyses/{id}/share

GET    /api/v1/custom-kpis
POST   /api/v1/custom-kpis
PUT    /api/v1/custom-kpis/{id}
POST   /api/v1/custom-kpis/{id}/preview          # 式を試し計算
POST   /api/v1/custom-kpis/{id}/promote          # KPI Registry に昇格

GET    /api/v1/cohorts
POST   /api/v1/cohorts
GET    /api/v1/cohorts/{id}/instances
POST   /api/v1/cohorts/{id}/snapshot

GET    /api/v1/saved-queries
POST   /api/v1/saved-queries
POST   /api/v1/saved-queries/{id}/run
```

### UI 構成

新規ページ `/workspace`:
```
┌─ 左 panel ─────────────┬─ 中央 canvas ──────────┬─ 右 panel ──┐
│ 📁 マイ分析            │  [+ panel追加]          │ プロパティ  │
│ 📁 共有分析            │  ┌──────┐ ┌──────┐    │ panel編集  │
│ 📁 Custom KPI          │  │ 折線 │ │Pivot │    │ data spec  │
│ 📁 コホート            │  └──────┘ └──────┘    │ encoding  │
│ 📁 保存クエリ          │  ┌──────────────┐     │ filters   │
│                         │  │  コホート比較 │     │           │
│ + 新規                  │  └──────────────┘     │           │
└─────────────────────────┴─────────────────────────┴───────────┘
```

- Canvas は drag-drop（react-grid-layout）
- 各 panel は data spec → fetch → recharts/visx で描画
- 「Meeting Pack に追加」ボタンで `/meeting-packs/[id]` の構成要素になる

### コホートビルダ
- ontology object type を選ぶ
- フィルタを積む（property / link 経由）
- 「現在のスナップショット」or 「動的（毎回再計算）」
- コホート同士の演算: 和集合 / 差集合 / 積集合

---

## 指示書（実装手順）

### Step 1: 依存と基盤
1. frontend に `react-grid-layout`, `recharts`（既にあるかも）, `visx` 追加
2. backend に `lark` 追加（DSL parser）
3. `lark` の文法ファイル: `app/services/dsl/grammar.lark`

### Step 2: モデル + マイグレーション
1. analyses, custom_kpis, cohorts, saved_queries テーブル
2. ownership / visibility のための permission middleware

### Step 3: Custom KPI エンジン
1. `app/services/dsl/parser.py`：DSL → AST
2. `app/services/dsl/compiler.py`：AST → SQLAlchemy Core expression
3. `app/services/custom_kpi_engine.py`：実行 + キャッシュ
4. preview API は最大1000行に制限

### Step 4: コホートエンジン
1. `app/services/cohort_engine.py`：filter_spec → SQL
2. ontology の link を辿るクエリ（再帰CTE）
3. snapshot は materialized view として保存

### Step 5: Analysis 実行エンジン
1. `app/services/analysis_runner.py`：spec を panel ごとに実行
2. 結果は cached（spec hash + 1日 TTL）
3. export は parquet (pyarrow) / csv / xlsx (openpyxl)

### Step 6: API
1. `app/api/v1/analyses.py`, `custom_kpis.py`, `cohorts.py`, `saved_queries.py`
2. visibility check middleware
3. rate limit: 1分10リクエスト / user

### Step 7: UI
1. `frontend/src/app/workspace/page.tsx` 新設
2. `frontend/src/components/workspace/`：
   - `Canvas.tsx`（grid layout）
   - `PanelChart.tsx`（line/bar/pie）
   - `PanelPivot.tsx`
   - `PanelCohort.tsx`
   - `DataSpecEditor.tsx`
   - `CustomKPIBuilder.tsx`（式エディタ + プレビュー）
   - `CohortBuilder.tsx`
3. `frontend/src/lib/api/workspace.ts`：API client

### Step 8: Meeting Pack 統合
1. Analysis を Meeting Pack に貼れる API
2. `/meeting-packs/[id]` で analysis の panel を埋め込み表示
3. 自動更新オプション（毎週月曜の最新値で再生成）

### Step 9: KPI 昇格パス
1. Custom KPI で実用化した式を `/api/v1/custom-kpis/{id}/promote` で `kpi_definitions` (registry) に昇格
2. 昇格後は他のダッシュボード / AI Analyst からも参照可能

---

## 完了基準
- [x] /workspace で分析ビューを作成・保存できる
- [x] Custom KPI builder で `({net_sales} - {cogs}) / {customer_count}` を入力 → preview を実行できる
- [x] コホート「駅前 + 人件費率>35%」を作成 → instances API で抽出できる
- [x] 保存クエリを登録 → run API を実行できる
- [ ] Analysis を CSV/Parquet エクスポートできる
- [ ] Meeting Pack に Analysis panel が埋め込める
- [ ] visibility=private の分析が他ユーザーに見えない
- [ ] Custom KPI を KPI Registry に昇格 → 既存ダッシュボードで使える

## 2026-05-02 実装メモ
- `frontend/src/app/workspace/page.tsx`: コホート、カスタムKPI、保存クエリ、分析ビュー保存のUIを追加
- `frontend/src/lib/api.ts` / `mock-data.ts`: Workspace APIのmock fallbackを追加し、バックエンド未起動でも画面操作を確認できるようにした

## 工数見積
- Step 1-3 (DSL): 6日
- Step 4 (cohort): 4日
- Step 5-6 (runner + API): 5日
- Step 7 (UI): 8日
- Step 8-9: 3日
- **合計: 約 5週間（1人）**

## 注意
- DSL の表現力を上げすぎると壊れやすい。**v1 は集約 + 四則 + lag/lead だけ**。SQL 生 injection は禁止
- パフォーマンス: panel 多数 + 大規模データだと厳しい。pre-aggregation table と materialized view を併用
