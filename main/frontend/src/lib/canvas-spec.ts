// Canvas Spec types — Foundry Workshop / Quiver 相当
// Analysis.spec に保存される JSON 構造

export type TileType =
  | "kpi"
  | "chart"
  | "table"
  | "markdown"
  | "filter"
  | "pivot"
  | "object"

// Object-driven binding — タイルを Ontology の Object Type / Instance に紐付ける。
// type: ObjectType の api_name または id (例: "store", "ot-store")
// instanceId: 特定の Object インスタンス ID（未指定なら ObjectType レベル / 集計）
// filter: 任意フィルタ（プロパティ → 値）
export interface ObjectBinding {
  type: string
  instanceId?: string
  filter?: Record<string, unknown>
  // KPI / Chart / Table タイル用に「どのプロパティをデータソースにするか」
  property?: string
}

export type ChartKind = "line" | "bar" | "pie"

export interface GridItem {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
}

export interface BaseTile {
  id: string
  type: TileType
  title: string
  // Optional Object binding — ある場合は Ontology Object に bind されてデータが自動表示される
  objectBinding?: ObjectBinding
}

// Object-driven Tile — ObjectType のプロパティ / outgoing links / actions を全部出す
export interface ObjectTile extends BaseTile {
  type: "object"
  objectBinding: ObjectBinding
  // 表示モード: "summary"（プロパティのみ）/ "full"（プロパティ＋リンク＋アクション）
  view?: "summary" | "full"
}

export interface KpiTile extends BaseTile {
  type: "kpi"
  kpi: string
  comparePrev?: boolean
  showSparkline?: boolean
  color?: string
}

export interface ChartTile extends BaseTile {
  type: "chart"
  chartKind: ChartKind
  kpi: string
  groupBy?: "brand" | "region" | "month" | "store"
  color?: string
}

export interface TableTile extends BaseTile {
  type: "table"
  kpis: string[]
  groupBy?: "store" | "brand" | "region"
}

export interface MarkdownTile extends BaseTile {
  type: "markdown"
  body: string
}

export interface FilterTile extends BaseTile {
  type: "filter"
  period?: { from?: string; to?: string }
  brand?: string
  region?: string
}

export interface PivotTile extends BaseTile {
  type: "pivot"
  kpi: string
  rows: "brand" | "region" | "store"
  cols: "month" | "quarter"
}

export type Tile =
  | KpiTile
  | ChartTile
  | TableTile
  | MarkdownTile
  | FilterTile
  | PivotTile
  | ObjectTile

export interface SharedFilter {
  period?: { from?: string; to?: string }
  brand?: string
  region?: string
}

export interface CanvasSpec {
  version: 1
  layout: GridItem[]
  tiles: Tile[]
  filters: SharedFilter
}

export function makeEmptySpec(): CanvasSpec {
  return { version: 1, layout: [], tiles: [], filters: {} }
}

export function genTileId(prefix = "t"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

export const KPI_OPTIONS: { value: string; label: string; unit: string }[] = [
  { value: "net_sales", label: "売上高", unit: "円" },
  { value: "cogs_rate", label: "原価率", unit: "%" },
  { value: "labor_cost_rate", label: "人件費率", unit: "%" },
  { value: "fl_ratio", label: "FL比率", unit: "%" },
  { value: "health_score", label: "健全度スコア", unit: "点" },
  { value: "avg_ticket", label: "客単価", unit: "円" },
  { value: "operating_profit_rate", label: "営業利益率", unit: "%" },
  { value: "gross_profit_rate", label: "粗利率", unit: "%" },
  { value: "sales_per_labor_hour", label: "人時売上高", unit: "円" },
  { value: "improvement_opportunity", label: "改善機会額", unit: "円" },
]

export function kpiLabel(value: string): string {
  return KPI_OPTIONS.find((k) => k.value === value)?.label ?? value
}

export function kpiUnit(value: string): string {
  return KPI_OPTIONS.find((k) => k.value === value)?.unit ?? ""
}
