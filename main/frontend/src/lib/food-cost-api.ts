/**
 * Food cost variance API client.
 *
 * Endpoints:
 *  POST   /api/v1/cost-variance/inventory-count
 *  POST   /api/v1/cost-variance/compute
 *  GET    /api/v1/cost-variance/heatmap?period=&brand_id=
 *  GET    /api/v1/cost-variance/store/{storeId}/details?period=
 *  GET    /api/v1/cost-variance/alerts?severity=high
 *
 * The pages use these helpers directly. When NEXT_PUBLIC_API_URL is unset, the
 * helpers fall back to deterministic local fixtures so the UI demos cleanly
 * without a running backend.
 */
import { getToken } from "./auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

export type RootCauseHint = "waste" | "theft" | "over_portion" | "recipe_drift" | "ok"
export type Severity = "low" | "medium" | "high"

export interface HeatmapStore { id: string; name: string; code: string }
export interface HeatmapIngredient { id: string; name: string }
export interface HeatmapCell {
  store_id: string
  ingredient_id: string
  variance_pct: number
  cost_diff: number
  root_cause_hint: RootCauseHint
  severity: Severity
}
export interface HeatmapData {
  period: string
  stores: HeatmapStore[]
  ingredients: HeatmapIngredient[]
  cells: HeatmapCell[]
}

export interface StoreDetailItem {
  ingredient_id: string
  ingredient_name: string
  unit: string
  qty_theoretical: number
  cost_theoretical: number
  qty_diff: number
  cost_diff: number
  variance_pct: number
  root_cause_hint: RootCauseHint
  severity: Severity
}

export interface StoreDetailData {
  store: { id: string; name: string | null; code: string | null }
  period: string
  total_cost_theoretical: number
  total_cost_diff: number
  items: StoreDetailItem[]
}

export interface VarianceAlert {
  id: string
  store_id: string
  store_name: string
  store_code: string
  ingredient_name: string
  period_date: string
  variance_pct: number
  cost_diff: number
  root_cause_hint: RootCauseHint
  severity: Severity
}

export interface InventoryCountRow {
  store_id: string
  count_date: string
  ingredient_id: string
  qty_actual: number
  unit_cost?: number
  notes?: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) return mockResponse<T>(path, init)
  const token = getToken()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`
  const res = await fetch(`${API_URL}${path}`, {
    headers: { ...headers, ...init?.headers },
    ...init,
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  const json = await res.json()
  if (json.errors && json.errors.length > 0) {
    const msg = Array.isArray(json.errors)
      ? json.errors.map((e: unknown) => (typeof e === "string" ? e : JSON.stringify(e))).join(", ")
      : String(json.errors)
    throw new Error(msg)
  }
  return json.data as T
}

export async function fetchHeatmap(period: string, brandId?: string): Promise<HeatmapData> {
  const qs = new URLSearchParams({ period })
  if (brandId) qs.set("brand_id", brandId)
  return request<HeatmapData>(`/api/v1/cost-variance/heatmap?${qs.toString()}`)
}

export async function fetchStoreDetail(storeId: string, period: string): Promise<StoreDetailData> {
  const qs = new URLSearchParams({ period })
  return request<StoreDetailData>(`/api/v1/cost-variance/store/${storeId}/details?${qs.toString()}`)
}

export async function fetchAlerts(severity: Severity = "high", limit = 50): Promise<VarianceAlert[]> {
  const qs = new URLSearchParams({ severity, limit: String(limit) })
  return request<VarianceAlert[]>(`/api/v1/cost-variance/alerts?${qs.toString()}`)
}

export async function submitInventoryCount(rows: InventoryCountRow[]): Promise<{ inserted: number }> {
  return request<{ inserted: number }>("/api/v1/cost-variance/inventory-count", {
    method: "POST",
    body: JSON.stringify({ rows }),
  })
}

export async function computeVariance(storeId: string, period: string, periodStart?: string) {
  return request<{ theoretical_count: number; variance_count: number }>(
    "/api/v1/cost-variance/compute",
    {
      method: "POST",
      body: JSON.stringify({
        store_id: storeId,
        period,
        period_start: periodStart,
      }),
    },
  )
}

// ---------------------------------------------------------------------------
// local demo fixtures (used only when NEXT_PUBLIC_API_URL is unset)
// ---------------------------------------------------------------------------

const DEMO_STORES: HeatmapStore[] = [
  { id: "s-1", name: "かっぱ寿司 渋谷店", code: "S001" },
  { id: "s-2", name: "かっぱ寿司 新宿東口店", code: "S002" },
  { id: "s-3", name: "食べ放題特化型 池袋店", code: "S003" },
  { id: "s-4", name: "郊外ロードサイド型 横浜西口店", code: "S004" },
  { id: "s-5", name: "都市型 心斎橋店", code: "S005" },
  { id: "s-6", name: "ビッグボーイ 名古屋駅店", code: "S006" },
  { id: "s-7", name: "都市型 福岡天神店", code: "S007" },
  { id: "s-8", name: "ロッテリア 札幌大通店", code: "S008" },
]

const DEMO_INGREDIENTS: HeatmapIngredient[] = [
  { id: "i-beef", name: "牛肉" },
  { id: "i-rice", name: "米" },
  { id: "i-onion", name: "玉ねぎ" },
  { id: "i-egg", name: "卵" },
  { id: "i-cheese", name: "チーズ" },
  { id: "i-tomato", name: "トマト" },
  { id: "i-pasta", name: "パスタ" },
  { id: "i-shrimp", name: "海老" },
]

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

function classify(pct: number): { hint: RootCauseHint; severity: Severity } {
  const abs = Math.abs(pct)
  if (abs < 0.03) return { hint: "ok", severity: "low" }
  if (pct < -0.10) return { hint: "over_portion", severity: abs >= 0.20 ? "high" : "medium" }
  if (pct > 0.15) return { hint: "theft", severity: abs >= 0.25 ? "high" : "medium" }
  if (pct < 0) return { hint: "waste", severity: abs >= 0.07 ? "medium" : "low" }
  return { hint: "recipe_drift", severity: abs >= 0.07 ? "medium" : "low" }
}

function buildDemoCells(): HeatmapCell[] {
  const rand = seededRandom(424242)
  const cells: HeatmapCell[] = []
  for (const s of DEMO_STORES) {
    for (const ing of DEMO_INGREDIENTS) {
      const pct = (rand() - 0.5) * 0.6 // -30%..+30%
      const cost_diff = Math.round((rand() - 0.5) * 60000) // ±60k
      const { hint, severity } = classify(pct)
      cells.push({
        store_id: s.id,
        ingredient_id: ing.id,
        variance_pct: pct,
        cost_diff,
        root_cause_hint: hint,
        severity,
      })
    }
  }
  return cells
}

function mockResponse<T>(path: string, init?: RequestInit): T {
  if (path.startsWith("/api/v1/cost-variance/heatmap")) {
    return {
      period: new URL(`http://x${path}`).searchParams.get("period") || "2026-04-30",
      stores: DEMO_STORES,
      ingredients: DEMO_INGREDIENTS,
      cells: buildDemoCells(),
    } as unknown as T
  }
  if (path.startsWith("/api/v1/cost-variance/alerts")) {
    const cells = buildDemoCells()
      .filter((c) => c.severity === "high")
      .sort((a, b) => Math.abs(b.cost_diff) - Math.abs(a.cost_diff))
      .slice(0, 10)
    const alerts: VarianceAlert[] = cells.map((c, idx) => {
      const store = DEMO_STORES.find((s) => s.id === c.store_id)!
      const ing = DEMO_INGREDIENTS.find((i) => i.id === c.ingredient_id)!
      return {
        id: `a-${idx}`,
        store_id: store.id,
        store_name: store.name,
        store_code: store.code,
        ingredient_name: ing.name,
        period_date: "2026-04-30",
        variance_pct: c.variance_pct,
        cost_diff: c.cost_diff,
        root_cause_hint: c.root_cause_hint,
        severity: c.severity,
      }
    })
    return alerts as unknown as T
  }
  if (path.match(/\/api\/v1\/cost-variance\/store\/[^/]+\/details/)) {
    const storeId = path.split("/")[5]
    const store = DEMO_STORES.find((s) => s.id === storeId) || DEMO_STORES[0]
    const cells = buildDemoCells().filter((c) => c.store_id === store.id)
    const items: StoreDetailItem[] = cells.map((c) => {
      const ing = DEMO_INGREDIENTS.find((i) => i.id === c.ingredient_id)!
      const cost_theoretical = 50000 + Math.round(Math.abs(c.cost_diff) * 1.5)
      return {
        ingredient_id: ing.id,
        ingredient_name: ing.name,
        unit: "g",
        qty_theoretical: 5000,
        cost_theoretical,
        qty_diff: -c.variance_pct * 5000,
        cost_diff: c.cost_diff,
        variance_pct: c.variance_pct,
        root_cause_hint: c.root_cause_hint,
        severity: c.severity,
      }
    })
    items.sort((a, b) => Math.abs(b.cost_diff) - Math.abs(a.cost_diff))
    return {
      store: { id: store.id, name: store.name, code: store.code },
      period: "2026-04-30",
      total_cost_theoretical: items.reduce((s, x) => s + x.cost_theoretical, 0),
      total_cost_diff: items.reduce((s, x) => s + x.cost_diff, 0),
      items,
    } as unknown as T
  }
  if (path.startsWith("/api/v1/cost-variance/compute")) {
    return { theoretical_count: 8, variance_count: 8 } as unknown as T
  }
  if (path.startsWith("/api/v1/cost-variance/inventory-count")) {
    const body = init?.body ? JSON.parse(init.body as string) : { rows: [] }
    return { inserted: body.rows?.length || 0 } as unknown as T
  }
  return {} as T
}

// re-export demo fixtures so the inventory input page can list ingredients
// without requiring a live backend.
export const demoStores = DEMO_STORES
export const demoIngredients = DEMO_INGREDIENTS
