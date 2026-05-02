# Phase 2 / S2 — Workspace 完遂（+3点 / 1週、03と並列）

## 課題
Phase 1 で `/workspace` ページ + Custom KPI / Cohort / Analysis モデル + DSL + 16API は揃った。残りは：
- **Pivot panel / Cohort comparison panel が表現力不足**（panel 種類少ない、drag-drop なし）
- **CSV/Parquet エクスポート未実装**
- **Meeting Pack 統合未実装**（分析を経営会議資料に貼れない）
- **Custom KPI 昇格 UI 未実装**（API はある）
- **Saved Query の SQL 実行系不在**（spec はあるが実行部分 placeholder）

## ゴール
Foundry の Contour / Quiver に近い水準で、ノーコードで分析→保存→Meeting Pack 反映までフロー完結。

---

## 仕様書

### Panel タイプ強化

現在は line_chart のみ。以下を追加：

| Type | 内容 | ライブラリ |
|------|------|----------|
| `line_chart` | 時系列ライン | recharts |
| `bar_chart` | 棒グラフ（複数系列対応） | recharts |
| `pivot_table` | 行×列×値の Pivot | 内製 + react-grid |
| `cohort_compare` | コホート2つを並列比較 | recharts |
| `metric_card` | 単一値 + 前期比 | カスタム |
| `heatmap` | 店舗×日付の熱マップ | visx |
| `scatter` | 散布図（KPI 相関分析） | recharts |
| `funnel` | ファネル分析 | recharts |

panel spec フォーマット拡張：
```json
{
  "id": "p1",
  "type": "pivot_table",
  "data": {"source": "kpi", "kpi": "gross_margin", "scope": {...}, "period": {...}},
  "rows": ["region", "brand"],
  "columns": ["month"],
  "values": [{"field": "gross_margin", "agg": "avg"}, {"field": "customer_count", "agg": "sum"}],
  "options": {"show_totals": true, "format": {"gross_margin": "pct"}}
}
```

### Drag-drop Canvas

`react-grid-layout` で panel を canvas 上で自由配置：
```tsx
<ResponsiveGridLayout
  layouts={layouts}
  onLayoutChange={(l) => updateAnalysisLayout(l)}
  cols={{lg: 12, md: 8}} rowHeight={60}
  draggableHandle=".panel-header"
>
  {panels.map(p => <PanelRenderer key={p.id} panel={p} />)}
</ResponsiveGridLayout>
```

レイアウトは `Analysis.spec.layout` に保存。

### エクスポート

`POST /api/v1/workspace/analyses/{id}/export?format=csv|parquet|xlsx`

```python
@router.post("/analyses/{id}/export")
async def export_analysis(id, format: str, db, tenant_id):
    analysis = await _get_or_404(...)
    
    # 全 panel を実行 → DataFrame に集約
    dfs = {}
    for panel in analysis.spec["panels"]:
        result = await run_panel(db, tenant_id, panel)
        dfs[panel["id"]] = pd.DataFrame(result["data"])
    
    if format == "csv":
        # 各 panel を別 sheet 風に concatenate
        return StreamingResponse(_to_csv_zip(dfs), media_type="application/zip")
    elif format == "parquet":
        import pyarrow as pa, pyarrow.parquet as pq
        # 1ファイル / panel
        return StreamingResponse(_to_parquet_zip(dfs), ...)
    elif format == "xlsx":
        from openpyxl import Workbook
        wb = Workbook()
        for pid, df in dfs.items():
            ws = wb.create_sheet(pid)
            ...
        return StreamingResponse(...)
```

### Meeting Pack 統合

`app/models/meeting_pack.py` の `BoardMeetingItem` に：
```python
content_type: Mapped[str]  # text | analysis_panel | kpi_card | image
content_ref: Mapped[dict]   # {"analysis_id": "...", "panel_id": "..."}
auto_refresh: Mapped[bool]  # True なら経営会議直前に再実行
```

`/meeting-packs/[id]` でレンダリング時：
- `content_type=analysis_panel` のとき `run_panel()` で実行 → 描画
- `auto_refresh=True` のときは pack 開く都度再実行
- それ以外はキャッシュ

UI：
- workspace で panel の右上「Meeting Pack に追加」ボタン
- どの pack に追加するかを選択モーダル

### Custom KPI 昇格

`POST /api/v1/workspace/custom-kpis/{id}/promote` は API 既存。UI 追加：
- workspace の Custom KPI 一覧で「KPI Registry に昇格」ボタン
- 確認モーダル：「これを公式 KPI として登録しますか？以後ダッシュボード等から参照可能になります」
- 昇格すると `kpi_definitions` テーブルに登録、KPI Engine から参照される

### Saved Query 実行

現状の `SavedQuery` モデル + API が placeholder。以下を実装：
- `query_type=ontology`：ontology_instances を filter_spec で抽出
- `query_type=kpi`：custom_kpi_engine で式を実行
- `query_type=sql`：禁止（v1 では）。表現したいなら ontology query へ

### Cohort 演算

UI で：
- コホート A：「首都圏 + 駅前 + 粗利率<25%」
- コホート B：「首都圏 + 駅前 + 粗利率>=25%」
- 演算：A − B（差集合）、A ∩ C（積集合）など
- 結果は新コホートとして保存可能

API: `POST /api/v1/workspace/cohorts/derive`
```json
{"name": "...", "operation": "diff", "operands": [{"id": "A"}, {"id": "B"}]}
```

---

## 指示書（実装手順）

### Step 1: 依存追加（30分）
```
npm install react-grid-layout @visx/heatmap pandas openpyxl pyarrow
pip install pandas openpyxl pyarrow
```

### Step 2: Panel タイプ8種実装（2日）
1. `frontend/src/components/workspace/panels/`：
   - `LineChartPanel.tsx`
   - `BarChartPanel.tsx`
   - `PivotTablePanel.tsx`
   - `CohortComparePanel.tsx`
   - `MetricCardPanel.tsx`
   - `HeatmapPanel.tsx`
   - `ScatterPanel.tsx`
   - `FunnelPanel.tsx`
2. 各 panel は `spec` を受けて自分で fetch → render
3. spec editor を panel 毎に（form-based、tabs UI）

### Step 3: Drag-drop Canvas（1日）
1. `react-grid-layout` を導入
2. `frontend/src/components/workspace/Canvas.tsx`：
   - layouts state を Analysis.spec.layout に sync
   - drag/resize で saveAnalysis（debounce 1s）
3. panel 追加ボタン → palette → drop → 新規 panel

### Step 4: Backend exec engine（1日）
1. `app/services/workspace/panel_runner.py`：panel spec → DataFrame 風 dict
2. `app/services/workspace/exporter.py`：dict → csv/parquet/xlsx
3. export endpoint 実装
4. Pivot / Cohort / Heatmap 等の集約 SQL 実装

### Step 5: Meeting Pack 統合（1日）
1. `BoardMeetingItem` 拡張 → migration
2. workspace UI に「Meeting Pack に追加」ボタン
3. `frontend/src/app/meeting-packs/[id]/page.tsx` で `analysis_panel` レンダリング
4. auto_refresh 実装

### Step 6: Custom KPI 昇格 UI（半日）
1. workspace の Custom KPI 一覧の各行に「昇格」ボタン
2. 確認モーダル + API 呼出
3. 昇格後は KPI Registry の対象 KPI ページにリダイレクト

### Step 7: Cohort 演算（半日）
1. `cohort_engine.py` に `derive_cohort(operation, operands)` 追加
2. UI: 2つのコホート選択 → 演算選択 → 新規 cohort として保存
3. 集合演算は SQL の `EXCEPT` `INTERSECT` `UNION` で実装

---

## 完了基準

- [ ] 8種の panel が workspace canvas で動作
- [ ] drag-drop で配置変更が DB 永続化される
- [ ] CSV / Parquet / XLSX エクスポートが動く
- [ ] Custom KPI を昇格 → KPI Registry に登録 → 既存ダッシュボードで参照可能
- [ ] workspace の panel を Meeting Pack に追加 → /meeting-packs/{id} で render される
- [ ] auto_refresh の panel が pack を開く都度再実行される
- [ ] Cohort A と B の差集合 / 積集合が計算でき、結果を新規 cohort として保存
- [ ] visibility=private な分析が他ユーザーに見えない（既存の権限再確認）

## 工数見積
- Step 1: 30分
- Step 2: 2日
- Step 3: 1日
- Step 4: 1日
- Step 5: 1日
- Step 6: 半日
- Step 7: 半日
- **合計: 6日（1週）**

## 増点内訳
- 04 ワークスペース：8種panel + drag-drop + export + MeetingPack + 昇格 で **+3**
- = **+3点**

## 注意
- pivot table は行×列が 1万 cell 超えるとブラウザ重い。仮想スクロール必須
- parquet は pyarrow 依存。container サイズに気をつける
- Meeting Pack の auto_refresh は経営会議直前に呼ぶと遅い。事前 warm-up cron を置く
