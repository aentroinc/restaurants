/**
 * Labor forecasting & shift drafting API client.
 * 30分slot 客数予測 → 必要FTE → シフトドラフト → 公開
 */
import { getToken } from "./auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

export interface ForecastSlot {
  slot_start: string
  predicted_customers: number
  predicted_sales: number
  confidence: number
  factors: {
    weather?: string
    weather_coeff?: number
    event?: string
    event_coeff?: number
    dow?: number
    trend_coeff?: number
    lunar?: number
    hist_samples?: number
  }
}

export interface RequirementSlot {
  slot_start: string
  required_fte: number
  role_split: { [role: string]: number }
  hourly_wage_yen: number
}

export interface ShiftAssignment {
  employee_id: string | null
  employee_name: string
  role: string
}

export interface ShiftDraftSlot {
  slot_start: string
  required_fte: number
  role_split: { [role: string]: number }
  assignments: ShiftAssignment[]
}

export interface ShiftDraftSummary {
  store_id: string
  week_start: string
  total_slots: number
  total_assignments: number
  unfilled_slots: number
  fill_rate_pct: number
  cost_estimate_yen: number
  employee_summary: {
    employee_id: string
    name: string
    scheduled_hours: number
    days_worked: number
    role_distribution: { [role: string]: number }
    warnings: string[]
  }[]
}

export interface ShiftDraft {
  id: string
  store_id: string
  week_start: string
  status: "draft" | "published"
  cost_estimate: number
  draft_json: {
    slots: ShiftDraftSlot[]
    summary: ShiftDraftSummary
  }
  created_at: string
  updated_at: string
  published_at: string | null
}

interface APIResponse<T> {
  data?: T
  meta?: Record<string, unknown>
  errors?: { detail?: string }[]
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) {
    return mockHandler<T>(path, init)
  }
  const token = getToken()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`
  const res = await fetch(`${API_URL}${path}`, {
    headers: { ...headers, ...(init?.headers || {}) },
    ...init,
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  const json: APIResponse<T> = await res.json()
  if (json.errors && json.errors.length) {
    throw new Error(json.errors.map((e) => e.detail || "error").join(", "))
  }
  return json.data as T
}

export function getForecast(storeId: string, from: string, to: string) {
  return call<ForecastSlot[]>(
    `/api/v1/labor/forecast?store_id=${storeId}&from=${from}&to=${to}`
  )
}

export function getRequirements(storeId: string, from: string, to: string) {
  return call<RequirementSlot[]>(
    `/api/v1/labor/requirements?store_id=${storeId}&from=${from}&to=${to}`
  )
}

export function createShiftDraft(storeId: string, weekStart: string, brandName?: string) {
  return call<ShiftDraft>("/api/v1/labor/shifts/draft", {
    method: "POST",
    body: JSON.stringify({ store_id: storeId, week_start: weekStart, brand_name: brandName }),
  })
}

export function getShiftDraft(draftId: string) {
  return call<ShiftDraft>(`/api/v1/labor/shifts/drafts/${draftId}`)
}

export function updateShiftDraft(draftId: string, draftJson: ShiftDraft["draft_json"]) {
  return call<ShiftDraft>(`/api/v1/labor/shifts/drafts/${draftId}`, {
    method: "PUT",
    body: JSON.stringify({ draft_json: draftJson }),
  })
}

export function publishShiftDraft(draftId: string) {
  return call<ShiftDraft>(`/api/v1/labor/shifts/drafts/${draftId}/publish`, {
    method: "POST",
  })
}

export function listShiftDrafts(storeId?: string, status?: string) {
  const qs = new URLSearchParams()
  if (storeId) qs.set("store_id", storeId)
  if (status) qs.set("status", status)
  return call<ShiftDraft[]>(`/api/v1/labor/shifts/drafts?${qs.toString()}`)
}

/* ----------------- mock fallback (NEXT_PUBLIC_API_URL未設定時) ----------------- */

function mockHandler<T>(path: string, init?: RequestInit): T {
  if (path.startsWith("/api/v1/labor/forecast")) {
    return mockForecast() as T
  }
  if (path.startsWith("/api/v1/labor/requirements")) {
    return mockRequirements() as T
  }
  if (path === "/api/v1/labor/shifts/draft" && init?.method === "POST") {
    return mockDraft() as T
  }
  if (path.match(/\/api\/v1\/labor\/shifts\/drafts\/[^/]+\/publish$/)) {
    const d = mockDraft()
    d.status = "published"
    d.published_at = new Date().toISOString()
    return d as T
  }
  if (path.match(/\/api\/v1\/labor\/shifts\/drafts\/[^/]+$/)) {
    return mockDraft() as T
  }
  if (path.startsWith("/api/v1/labor/shifts/drafts")) {
    return [mockDraft()] as T
  }
  return [] as T
}

function mockForecast(): ForecastSlot[] {
  const out: ForecastSlot[] = []
  for (let d = 0; d < 7; d++) {
    const dt = new Date(2026, 4, 4 + d) // 5/4 (Mon)
    for (let h = 10; h <= 22; h++) {
      for (const m of [0, 30]) {
        const slot = new Date(dt)
        slot.setHours(h, m, 0, 0)
        const isPeak = (h >= 11 && h < 14) || (h >= 18 && h < 21)
        const base = isPeak ? 22 + Math.random() * 14 : 6 + Math.random() * 8
        const isWeekend = d >= 5 ? 1.15 : 1.0
        const cust = base * isWeekend
        out.push({
          slot_start: slot.toISOString(),
          predicted_customers: Math.round(cust * 10) / 10,
          predicted_sales: Math.round(cust * 700),
          confidence: 0.75 + Math.random() * 0.15,
          factors: {
            weather: ["sunny", "cloudy", "rainy"][d % 3],
            event: d >= 5 ? "holiday" : "none",
            dow: (dt.getDay() + 6) % 7,
            trend_coeff: 1.02,
          },
        })
      }
    }
  }
  return out
}

function mockRequirements(): RequirementSlot[] {
  return mockForecast().map((f) => {
    const fte = Math.max(1.5, Math.ceil((f.predicted_customers / 10) * 2) / 2)
    return {
      slot_start: f.slot_start,
      required_fte: fte,
      role_split: {
        "ホール": Math.round(fte * 0.40 * 100) / 100,
        "キッチン": Math.round(fte * 0.45 * 100) / 100,
        "レジ": Math.round(fte * 0.15 * 100) / 100,
      },
      hourly_wage_yen: 1180,
    }
  })
}

function mockDraft(): ShiftDraft {
  const reqs = mockRequirements()
  const employees = [
    "田中", "佐藤", "鈴木", "高橋", "渡辺", "伊藤", "山本", "中村",
  ]
  const roles = ["ホール", "キッチン", "レジ"]
  const slots: ShiftDraftSlot[] = reqs.map((r, idx) => {
    const need: { [k: string]: number } = {
      "ホール": Math.ceil(r.role_split["ホール"] || 0),
      "キッチン": Math.ceil(r.role_split["キッチン"] || 0),
      "レジ": Math.ceil(r.role_split["レジ"] || 0),
    }
    const assignments: ShiftAssignment[] = []
    let pickIdx = idx
    for (const role of roles) {
      const n = need[role] || 0
      for (let i = 0; i < n; i++) {
        const empIdx = (pickIdx + i) % employees.length
        assignments.push({
          employee_id: `emp-${empIdx}`,
          employee_name: employees[empIdx],
          role,
        })
        pickIdx++
      }
    }
    return {
      slot_start: r.slot_start,
      required_fte: r.required_fte,
      role_split: r.role_split,
      assignments,
    }
  })
  const totalAssign = slots.reduce((s, x) => s + x.assignments.length, 0)
  const cost = Math.round(totalAssign * 0.5 * 1180)
  return {
    id: "draft-mock-001",
    store_id: "00000000-0000-0000-0000-000000000010",
    week_start: "2026-05-04",
    status: "draft",
    cost_estimate: cost,
    draft_json: {
      slots,
      summary: {
        store_id: "00000000-0000-0000-0000-000000000010",
        week_start: "2026-05-04",
        total_slots: slots.length,
        total_assignments: totalAssign,
        unfilled_slots: 0,
        fill_rate_pct: 100,
        cost_estimate_yen: cost,
        employee_summary: employees.map((name, i) => ({
          employee_id: `emp-${i}`,
          name,
          scheduled_hours: Math.round((Math.random() * 18 + 18) * 10) / 10,
          days_worked: Math.min(5, Math.ceil(Math.random() * 6)),
          role_distribution: { "ホール": 5, "キッチン": 3, "レジ": 2 },
          warnings: [],
        })),
      },
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    published_at: null,
  }
}
