# S3 — ワークスペース本格化（+6点 / 3日）

## 現状 → ゴール
4種panel + 基本UI → **10種panel + drag-dropキャンバス + pivot仮想スクロール + SQLライクエリビルダ + 全結果キャッシュ**

Foundry ContourとQuiverの「実用的なサブセット」を実装する。

---

## Step 1: Panel タイプを10種に（4時間）

既存4種（bar_chart, pivot_table, metric_card, scatter）に6種追加:

| # | Type | 用途 | ライブラリ |
|---|------|------|-----------|
| 5 | `line_chart` | 時系列推移 | recharts LineChart |
| 6 | `stacked_bar` | 構成比較（PL waterfall等） | recharts StackedBarChart |
| 7 | `pie_chart` | 構成比（ブランド売上比等） | recharts PieChart |
| 8 | `heatmap` | 店舗×曜日の売上密度 | CSS Grid + 色グラデーション |
| 9 | `waterfall` | PL滝グラフ（売上→原価→人件費→利益） | recharts BarChart (stacked) |
| 10 | `table` | 生データテーブル（ソート・フィルタ付） | shadcn Table |

各パネルコンポーネント:
```
frontend/src/components/workspace/panels/
├── LinePanel.tsx
├── StackedBarPanel.tsx
├── PiePanel.tsx
├── HeatmapPanel.tsx
├── WaterfallPanel.tsx
└── TablePanel.tsx
```

パネル追加ダイアログ:
- 10種をカード形式で選択（アイコン + 名前 + 説明）
- 選択後 → KPI / スコープ / group_by 設定

## Step 2: Drag-drop キャンバス（3時間）

`react-grid-layout` を使用:

```bash
cd frontend && npm install react-grid-layout @types/react-grid-layout
```

`frontend/src/components/workspace/Canvas.tsx`:
```tsx
import { Responsive, WidthProvider } from "react-grid-layout";
const ResponsiveGrid = WidthProvider(Responsive);

interface CanvasProps {
  panels: PanelSpec[];
  layouts: ReactGridLayout.Layouts;
  onLayoutChange: (layouts: ReactGridLayout.Layouts) => void;
  onPanelDelete: (panelId: string) => void;
}

export function Canvas({ panels, layouts, onLayoutChange, onPanelDelete }: CanvasProps) {
  return (
    <ResponsiveGrid
      layouts={layouts}
      onLayoutChange={(_, allLayouts) => onLayoutChange(allLayouts)}
      cols={{ lg: 12, md: 8, sm: 4 }}
      rowHeight={80}
      draggableHandle=".panel-drag-handle"
      isResizable
    >
      {panels.map(panel => (
        <div key={panel.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="panel-drag-handle flex items-center justify-between px-3 py-2 border-b border-white/[0.06] cursor-move">
            <span className="text-sm font-medium text-white/70">{panel.title}</span>
            <div className="flex gap-1">
              <button onClick={() => {/* 会議パック追加 */}} className="...">📎</button>
              <button onClick={() => onPanelDelete(panel.id)} className="...">✕</button>
            </div>
          </div>
          <div className="p-3">
            <PanelRenderer panel={panel} />
          </div>
        </div>
      ))}
    </ResponsiveGrid>
  );
}
```

`/workspace` の分析詳細ビューでCanvasを使用。レイアウト変更はAnalysis.spec.layoutに保存。

## Step 3: Pivot仮想スクロール（2時間）

大きいpivot（100行×12列）でブラウザが重くならないように:

```tsx
// PivotPanel.tsx
import { useRef, useState, useEffect } from "react";

const ROW_HEIGHT = 36;
const VISIBLE_ROWS = 20;

function VirtualizedPivot({ rows, columns, values }) {
  const [scrollTop, setScrollTop] = useState(0);
  const startIdx = Math.floor(scrollTop / ROW_HEIGHT);
  const endIdx = Math.min(startIdx + VISIBLE_ROWS + 2, rows.length);
  const visibleRows = rows.slice(startIdx, endIdx);
  
  return (
    <div 
      className="overflow-y-auto max-h-[600px]" 
      onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: rows.length * ROW_HEIGHT }}>
        <table style={{ transform: `translateY(${startIdx * ROW_HEIGHT}px)` }}>
          <thead>...</thead>
          <tbody>
            {visibleRows.map(row => <tr key={row.id}>...</tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

## Step 4: クエリビルダUI（2時間）

SavedQuery の `query_type=kpi` を視覚的に構築:

`frontend/src/components/workspace/QueryBuilder.tsx`:
```
┌─────────────────────────────────────────┐
│ KPI: [cogs_rate ▼]                      │
│ 集約: [avg ▼]                           │
│ グループ: [brand ▼] [month ▼]           │
│ フィルタ:                               │
│   [region ▼] [= ▼] [首都圏 ▼] [+]     │
│   [brand ▼]  [= ▼] [すき家 ▼]  [×]    │
│ 期間: [2025-04-01] 〜 [2026-04-30]      │
│                                          │
│ [プレビュー]  [保存]  [CSVダウンロード]  │
└─────────────────────────────────────────┘
```

プレビュー結果は下部にテーブル + チャートで表示。

## Step 5: バックエンドpanel実行エンジン強化（3時間）

`backend/app/services/workspace/panel_runner.py` 新設:

```python
async def run_panel(db, tenant_id, panel_spec: dict) -> dict:
    """Panel specを実行して結果データを返す。"""
    panel_type = panel_spec["type"]
    
    if panel_type in ("line_chart", "bar_chart", "stacked_bar"):
        return await _run_timeseries(db, tenant_id, panel_spec)
    elif panel_type == "pivot_table":
        return await _run_pivot(db, tenant_id, panel_spec)
    elif panel_type == "metric_card":
        return await _run_metric(db, tenant_id, panel_spec)
    elif panel_type in ("scatter", "heatmap"):
        return await _run_scatter(db, tenant_id, panel_spec)
    elif panel_type == "pie_chart":
        return await _run_pie(db, tenant_id, panel_spec)
    elif panel_type == "waterfall":
        return await _run_waterfall(db, tenant_id, panel_spec)
    elif panel_type == "table":
        return await _run_table(db, tenant_id, panel_spec)

async def _run_timeseries(db, tenant_id, spec):
    """時系列データ取得。group_byに応じてブランド別/エリア別等。"""
    kpi = spec["kpi"]
    group_by = spec.get("group_by", "brand")
    period = spec.get("period", {})
    
    # StoreDailyKPIからgroup_by別の月次集計
    q = select(
        func.date_trunc('month', StoreDailyKPI.business_date).label("month"),
        # group_by列
        func.avg(getattr(StoreDailyKPI, kpi)).label("value"),
    ).where(StoreDailyKPI.tenant_id == tenant_id)
    # ... period filter, group_by join
    
    return {"series": [...], "labels": [...]}

async def _run_pivot(db, tenant_id, spec):
    """行×列のクロス集計。"""
    # rows/columns/values specに基づいて動的SQL構築
    
async def _run_waterfall(db, tenant_id, spec):
    """PL滝グラフ用。売上→原価→人件費→家賃→その他→営業利益。"""
    # StorePLから最新月のPLを取得
```

API:
```python
@router.post("/analyses/{id}/run")
async def run_analysis(id, db, tenant_id):
    """分析の全panelを実行して結果を返す。"""
    analysis = await _get_or_404(db, id, tenant_id)
    results = {}
    for panel in analysis.spec.get("panels", []):
        results[panel["id"]] = await run_panel(db, tenant_id, panel)
    return APIResponse(data=results)
```

## Step 6: エクスポート強化（1時間）

CSV + XLSX 対応:

```python
@router.post("/analyses/{id}/export")
async def export_analysis(id, format: str = Query("csv"), db, tenant_id):
    analysis = await _get_or_404(db, id, tenant_id)
    results = {}
    for panel in analysis.spec.get("panels", []):
        results[panel["id"]] = await run_panel(db, tenant_id, panel)
    
    if format == "csv":
        output = io.StringIO()
        for panel_id, data in results.items():
            output.write(f"# {panel_id}\n")
            if "series" in data:
                writer = csv.writer(output)
                writer.writerow(["label"] + [s["name"] for s in data["series"]])
                for i, label in enumerate(data["labels"]):
                    writer.writerow([label] + [s["data"][i] for s in data["series"]])
            output.write("\n")
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8-sig")),  # BOM付きUTF-8（Excel対応）
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=analysis_{id}.csv"}
        )
```

## Step 7: 結果キャッシュ（1時間）

Panel実行結果をRedisなしで簡易キャッシュ:

```python
from functools import lru_cache
from hashlib import md5
import json

_panel_cache: dict[str, tuple[float, dict]] = {}
CACHE_TTL = 300  # 5分

def _cache_key(tenant_id, panel_spec):
    return md5(json.dumps({"t": tenant_id, "p": panel_spec}, sort_keys=True).encode()).hexdigest()

async def run_panel_cached(db, tenant_id, panel_spec):
    key = _cache_key(tenant_id, panel_spec)
    now = time.time()
    if key in _panel_cache:
        cached_at, data = _panel_cache[key]
        if now - cached_at < CACHE_TTL:
            return data
    data = await run_panel(db, tenant_id, panel_spec)
    _panel_cache[key] = (now, data)
    return data
```

---

## 完了基準

- [ ] 10種のpanelが全てワークスペースで動作
- [ ] drag-dropでパネル配置変更 → DB保存 → リロードで復元
- [ ] pivot 100行×12列が仮想スクロールでスムーズ
- [ ] クエリビルダでKPI/集約/フィルタを選択 → プレビュー → 保存
- [ ] CSV/XLSXエクスポートが動作（BOM付きUTF-8でExcel対応）
- [ ] Panel実行結果が5分キャッシュされる
- [ ] バックエンドの `/analyses/{id}/run` でpanel実行が全種動作
- [ ] 「会議パックに追加」がpanelごとに動作
