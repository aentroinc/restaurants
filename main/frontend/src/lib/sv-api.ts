/**
 * SV (Supervisor) PWA API client.
 *
 * Wraps the in-progress backend endpoints (competitor-scans, sv-visits, tasks,
 * employees) with mock fallbacks so the SV PWA can run end-to-end before the
 * backend is wired up.
 */

import { fetchAPI } from "./api"
import { mockStores, mockSVMissionPlan } from "./mock-data"
import type { StoreWithKPI } from "./types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/** POST には必ず Idempotency-Key を付与してリクエストを構築。*/
function withIdempotencyKey(options?: RequestInit): RequestInit {
  if (!options || (options.method || "GET").toUpperCase() !== "POST") return options || {}
  const headers = new Headers(options.headers || {})
  if (!headers.has("Idempotency-Key")) {
    headers.set("Idempotency-Key", newIdempotencyKey())
  }
  return { ...options, headers }
}

// ----- types -----

export interface SVStore extends StoreWithKPI {
  lat: number
  lon: number
  last_visit_at: string | null
  next_recommended_visit_at: string | null
}

export interface SVVisit {
  id: string
  store_id: string
  store_name: string
  sv_user_id: string
  visited_at: string
  status: "planned" | "in_progress" | "done"
  qsc_score: number | null
  notes: string | null
  photos: string[]
  tasks_issued: number
}

export interface CompetitorScan {
  id?: string
  sv_user_id: string
  competitor_name: string
  competitor_address: string
  lat: number
  lon: number
  observations_text: string
  menu_observations_json: { name: string; price: number }[]
  photos_json: string[]
  visited_at: string
  area_id?: string | null
}

export interface ImprovementTask {
  id: string
  store_id: string
  store_name: string
  title: string
  description: string
  type: "improvement"
  priority: "high" | "medium" | "low"
  status: "open" | "in_progress" | "done" | "overdue"
  due_date: string
  issued_by: string
  issued_at: string
  progress_pct: number
}

export interface AreaKPISnapshot {
  area_id: string
  area_name: string
  total_sales: number
  sales_yoy: number
  avg_labor_cost_rate: number
  avg_qsc_score: number
  avg_review_score: number
  store_ranking: { store_id: string; store_name: string; health_score: number; sales: number }[]
  monthly_trend: { month: string; sales: number; labor_cost_rate: number; qsc: number }[]
}

export interface ManagerCoachingRecord {
  manager_id: string
  manager_name: string
  store_id: string
  store_name: string
  ojt_progress_pct: number
  growth_score: number
  last_meeting_at: string | null
  recent_notes: { date: string; topic: string; note: string }[]
}

// ----- helpers -----

function safeFetch<T>(path: string, fallback: T, options?: RequestInit): Promise<T> {
  if (!API_URL) return Promise.resolve(fallback)
  return fetchAPI<T>(path, withIdempotencyKey(options)).catch(() => fallback)
}

// ----- store enrichment (mock geo + visit dates) -----

const TOKYO_BASE = { lat: 35.681, lon: 139.767 }

function deterministicGeo(seed: string): { lat: number; lon: number } {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const dLat = ((h % 1000) / 1000 - 0.5) * 0.6
  const dLon = (((h >> 10) % 1000) / 1000 - 0.5) * 0.6
  return { lat: TOKYO_BASE.lat + dLat, lon: TOKYO_BASE.lon + dLon }
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export const svApi = {
  async listStores(areaId?: string): Promise<SVStore[]> {
    const fallback: SVStore[] = mockStores.map((s, i) => ({
      ...s,
      ...deterministicGeo(s.id),
      last_visit_at: i % 5 === 0 ? null : daysAgo((i + 1) * 4),
      next_recommended_visit_at: daysFromNow(((i * 3) % 14) - 2),
    }))
    const path = areaId ? `/api/v1/stores?area_id=${areaId}` : "/api/v1/stores"
    const raw = await safeFetch<{ stores: StoreWithKPI[] } | StoreWithKPI[]>(path, { stores: mockStores })
    const list = Array.isArray(raw) ? raw : raw.stores || mockStores
    return list.map((s, i) => ({
      ...s,
      ...deterministicGeo(s.id),
      last_visit_at: fallback[i % fallback.length].last_visit_at,
      next_recommended_visit_at: fallback[i % fallback.length].next_recommended_visit_at,
    }))
  },

  async listVisits(): Promise<SVVisit[]> {
    const fallback: SVVisit[] = mockStores.slice(0, 6).map((s, i) => ({
      id: `visit-${i + 1}`,
      store_id: s.id,
      store_name: s.name,
      sv_user_id: "sv-001",
      visited_at: daysAgo(i * 3),
      status: i < 2 ? "done" : i < 4 ? "in_progress" : "planned",
      qsc_score: i < 2 ? 78 + i * 4 : null,
      notes: i < 2 ? "ピーク時の人員配置に課題。シフト見直しを指示。" : null,
      photos: [],
      tasks_issued: i < 2 ? 2 : 0,
    }))
    return safeFetch<SVVisit[]>("/api/v1/sv-visits", fallback)
  },

  async createVisit(payload: Partial<SVVisit>): Promise<SVVisit> {
    const local: SVVisit = {
      id: `visit-${Date.now()}`,
      store_id: payload.store_id || "",
      store_name: payload.store_name || "",
      sv_user_id: payload.sv_user_id || "sv-001",
      visited_at: payload.visited_at || new Date().toISOString(),
      status: payload.status || "in_progress",
      qsc_score: payload.qsc_score ?? null,
      notes: payload.notes ?? null,
      photos: payload.photos || [],
      tasks_issued: payload.tasks_issued || 0,
    }
    return safeFetch<SVVisit>("/api/v1/sv-visits", local, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  async createCompetitorScan(payload: CompetitorScan): Promise<CompetitorScan> {
    return safeFetch<CompetitorScan>("/api/v1/competitor-scans", { ...payload, id: `comp-${Date.now()}` }, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  async listCompetitorScans(): Promise<CompetitorScan[]> {
    const fallback: CompetitorScan[] = [
      {
        id: "comp-001",
        sv_user_id: "sv-001",
        competitor_name: "吉野家 渋谷センター街店",
        competitor_address: "東京都渋谷区宇田川町",
        lat: 35.660, lon: 139.698,
        observations_text: "深夜帯の客数が増加傾向。新メニュー『黒胡椒牛丼』展開中。",
        menu_observations_json: [
          { name: "牛丼 並", price: 468 },
          { name: "黒胡椒牛丼", price: 598 },
        ],
        photos_json: [],
        visited_at: daysAgo(3),
      },
      {
        id: "comp-002",
        sv_user_id: "sv-001",
        competitor_name: "松屋 新宿西口店",
        competitor_address: "東京都新宿区西新宿",
        lat: 35.692, lon: 139.700,
        observations_text: "セルフレジ導入済。回転率が良い。テーブル数 32。",
        menu_observations_json: [
          { name: "牛めし", price: 430 },
          { name: "プレミアム牛めし", price: 550 },
        ],
        photos_json: [],
        visited_at: daysAgo(7),
      },
    ]
    return safeFetch<CompetitorScan[]>("/api/v1/competitor-scans", fallback)
  },

  async listImprovementTasks(svUserId = "sv-001"): Promise<ImprovementTask[]> {
    const fallback: ImprovementTask[] = mockStores.slice(0, 8).map((s, i) => ({
      id: `task-${i + 1}`,
      store_id: s.id,
      store_name: s.name,
      title: ["シフト最適化", "原価削減レビュー", "QSCチェックリスト導入", "値引きルール再徹底", "新人育成計画"][i % 5],
      description: "SV訪問時に発行された改善タスク",
      type: "improvement",
      priority: i < 3 ? "high" : i < 6 ? "medium" : "low",
      status: i < 2 ? "done" : i === 2 ? "overdue" : i < 5 ? "in_progress" : "open",
      due_date: daysFromNow(((i * 2) % 14) - 5),
      issued_by: svUserId,
      issued_at: daysAgo(i * 2 + 1),
      progress_pct: i < 2 ? 100 : i === 2 ? 30 : 50 + ((i * 13) % 40),
    }))
    return safeFetch<ImprovementTask[]>(`/api/v1/tasks?type=improvement&issued_by=${svUserId}`, fallback)
  },

  async createImprovementTask(payload: Partial<ImprovementTask>): Promise<ImprovementTask> {
    const local: ImprovementTask = {
      id: `task-${Date.now()}`,
      store_id: payload.store_id || "",
      store_name: payload.store_name || "",
      title: payload.title || "",
      description: payload.description || "",
      type: "improvement",
      priority: payload.priority || "medium",
      status: "open",
      due_date: payload.due_date || daysFromNow(7),
      issued_by: payload.issued_by || "sv-001",
      issued_at: new Date().toISOString().slice(0, 10),
      progress_pct: 0,
    }
    return safeFetch<ImprovementTask>("/api/v1/tasks", local, {
      method: "POST",
      body: JSON.stringify({ ...payload, type: "improvement" }),
    })
  },

  async getAreaKPI(areaId = "default"): Promise<AreaKPISnapshot> {
    const fallback: AreaKPISnapshot = {
      area_id: areaId,
      area_name: "首都圏 第3エリア",
      total_sales: 168_400_000,
      sales_yoy: 3.4,
      avg_labor_cost_rate: 28.4,
      avg_qsc_score: 82.1,
      avg_review_score: 3.9,
      store_ranking: mockStores.slice(0, 10).map((s) => ({
        store_id: s.id, store_name: s.name, health_score: s.kpi.health_score, sales: s.kpi.net_sales,
      })),
      monthly_trend: ["2025-12", "2026-01", "2026-02", "2026-03", "2026-04"].map((m, i) => ({
        month: m,
        sales: 150_000_000 + i * 4_500_000,
        labor_cost_rate: 30 - i * 0.4,
        qsc: 78 + i * 1.0,
      })),
    }
    return safeFetch<AreaKPISnapshot>(`/api/v1/executive/area/${areaId}`, fallback)
  },

  async listManagerCoaching(): Promise<ManagerCoachingRecord[]> {
    const fallback: ManagerCoachingRecord[] = mockStores.slice(0, 8).map((s, i) => ({
      manager_id: `mgr-${i + 1}`,
      manager_name: s.manager_name,
      store_id: s.id,
      store_name: s.name,
      ojt_progress_pct: 40 + ((i * 17) % 60),
      growth_score: 50 + ((i * 13) % 50),
      last_meeting_at: daysAgo((i + 1) * 7),
      recent_notes: [
        { date: daysAgo((i + 1) * 7), topic: "シフト管理", note: "新人スタッフへの教育計画を週次で更新するよう指導" },
        { date: daysAgo((i + 1) * 14), topic: "原価管理", note: "発注タイミングと棚卸の連携をルール化" },
      ],
    }))
    return safeFetch<ManagerCoachingRecord[]>("/api/v1/employees?role=manager", fallback)
  },

  async getWeeklyPlan() {
    return mockSVMissionPlan
  },
}
