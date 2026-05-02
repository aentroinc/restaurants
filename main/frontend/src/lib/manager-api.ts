/**
 * Manager PWA API client.
 *
 * Single source of truth for the 店長 app: daily reports, waste logs,
 * complaints, equipment issues, shift drafts, exec KPIs, tasks.
 *
 * - When NEXT_PUBLIC_API_URL is set: hits the real backend.
 * - When unset OR the backend returns 404: returns deterministic mock data
 *   so the UI is always usable in dev / offline demos.
 */

import { getToken } from "./auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

export type Channel = "in_store" | "phone" | "online" | "sns" | "other"
export type Severity = "low" | "medium" | "high"
export type EquipmentCategory =
  | "kitchen"
  | "fryer"
  | "freezer"
  | "refrigerator"
  | "pos"
  | "hvac"
  | "plumbing"
  | "electrical"
  | "other"

export interface DailyReportPayload {
  store_id: string
  date: string
  sales_summary_text: string
  weather: string
  special_events_text: string
  notes?: string
  predicted_customers_tomorrow?: number
}

export interface WasteLogPayload {
  store_id: string
  date: string
  product_id?: string
  product_name?: string
  qty: number
  unit: string
  reason: string
  cost_estimate: number
  photo_url?: string
}

export interface ComplaintPayload {
  store_id: string
  date: string
  customer_age_range?: string
  channel: Channel
  severity: Severity
  content: string
  response_taken: string
}

export interface EquipmentIssuePayload {
  store_id: string
  equipment_name: string
  equipment_category: EquipmentCategory
  severity: Severity
  description: string
  photo_url?: string
  repair_requested: boolean
}

export interface ManagerHomeKPI {
  store_id: string
  today_sales_yen: number
  today_sales_pace_pct: number       // vs forecast
  customers_today: number
  customers_forecast: number
  sales_per_labor_hour: number       // 人時売上
  open_tasks: number
  urgent_tasks: number
  shift_filled: number
  shift_required: number
  shift_unfilled: number
}

export interface ManagerTask {
  id: string
  title: string
  due_date: string
  severity: Severity
  status: "open" | "in_progress" | "done"
  assignee_name?: string
}

export interface WasteListItem {
  id: string
  date: string
  product_name: string
  qty: number
  unit: string
  reason: string
  cost_estimate: number
}

export interface EquipmentIssueRecord {
  id: string
  date: string
  equipment_name: string
  equipment_category: EquipmentCategory
  severity: Severity
  status: "reported" | "in_progress" | "fixed"
  description: string
}

export interface ShiftDraftSlim {
  id: string
  store_id: string
  week_start: string
  status: "draft" | "published"
  fill_rate_pct: number
  cost_estimate_yen: number
  unfilled_slots: number
}

export interface StaffEvaluationDraft {
  id: string
  staff_id: string
  staff_name: string
  role: string
  last_review_date: string
  notes: string
  rating?: number
}

interface APIWrap<T> {
  data?: T
  errors?: { detail?: string }[]
}

async function call<T>(path: string, init?: RequestInit, mock?: () => T): Promise<T> {
  if (!API_URL) {
    if (mock) return mock()
    throw new Error(`No API URL and no mock for ${path}`)
  }
  try {
    const token = getToken()
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (token) headers["Authorization"] = `Bearer ${token}`
    const res = await fetch(`${API_URL}${path}`, {
      headers: { ...headers, ...(init?.headers || {}) },
      ...init,
    })
    if (res.status === 404 && mock) return mock()
    if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
    const json = (await res.json()) as APIWrap<T>
    if (json.errors && json.errors.length) {
      throw new Error(json.errors.map((e) => e.detail || "error").join(", "))
    }
    return (json.data ?? (json as unknown as T)) as T
  } catch (err) {
    if (mock) return mock()
    throw err
  }
}

// =====================================================================
// Submissions
// =====================================================================

export const managerApi = {
  postDailyReport(payload: DailyReportPayload) {
    return call<{ id: string }>(
      "/api/v1/daily-reports",
      { method: "POST", body: JSON.stringify(payload) },
      () => ({ id: `dr-mock-${Date.now()}` })
    )
  },

  postWasteLog(payload: WasteLogPayload) {
    return call<{ id: string }>(
      "/api/v1/waste-logs",
      { method: "POST", body: JSON.stringify(payload) },
      () => ({ id: `wl-mock-${Date.now()}` })
    )
  },

  postComplaint(payload: ComplaintPayload) {
    return call<{ id: string }>(
      "/api/v1/complaints",
      { method: "POST", body: JSON.stringify(payload) },
      () => ({ id: `cp-mock-${Date.now()}` })
    )
  },

  postEquipmentIssue(payload: EquipmentIssuePayload) {
    return call<{ id: string }>(
      "/api/v1/equipment-issues",
      { method: "POST", body: JSON.stringify(payload) },
      () => ({ id: `eq-mock-${Date.now()}` })
    )
  },

  // ---------- Reads ----------

  getHomeKPI(storeId: string) {
    return call<ManagerHomeKPI>(
      `/api/v1/executive/store/${storeId}`,
      undefined,
      () => mockHomeKPI(storeId)
    )
  },

  getTasks(storeId: string, assigneeId?: string) {
    const qs = new URLSearchParams({ store_id: storeId })
    if (assigneeId) qs.set("assignee_id", assigneeId)
    return call<ManagerTask[]>(
      `/api/v1/tasks?${qs.toString()}`,
      undefined,
      () => mockTasks()
    )
  },

  listWasteLast7Days(storeId: string) {
    return call<WasteListItem[]>(
      `/api/v1/waste-logs?store_id=${storeId}&days=7`,
      undefined,
      () => mockWasteList()
    )
  },

  listEquipmentIssues(storeId: string) {
    return call<EquipmentIssueRecord[]>(
      `/api/v1/equipment-issues?store_id=${storeId}`,
      undefined,
      () => mockEquipmentList()
    )
  },

  getShiftDraft(draftId: string) {
    return call<ShiftDraftSlim>(
      `/api/v1/labor/shifts/drafts/${draftId}`,
      undefined,
      () => mockShiftDraft(draftId)
    )
  },

  publishShiftDraft(draftId: string) {
    return call<ShiftDraftSlim>(
      `/api/v1/labor/shifts/drafts/${draftId}/publish`,
      { method: "POST" },
      () => ({ ...mockShiftDraft(draftId), status: "published" })
    )
  },

  listStaffEvaluations(storeId: string) {
    return call<StaffEvaluationDraft[]>(
      `/api/v1/staff/evaluations?store_id=${storeId}`,
      undefined,
      () => mockEvaluations()
    )
  },

  saveStaffEvaluation(payload: { staff_id: string; notes: string; rating?: number }) {
    return call<{ id: string }>(
      "/api/v1/staff/evaluations",
      { method: "POST", body: JSON.stringify(payload) },
      () => ({ id: `ev-mock-${Date.now()}` })
    )
  },
}

// =====================================================================
// Mock fallbacks (deterministic-ish)
// =====================================================================

function mockHomeKPI(storeId: string): ManagerHomeKPI {
  return {
    store_id: storeId,
    today_sales_yen: 482_000,
    today_sales_pace_pct: 4.8,
    customers_today: 612,
    customers_forecast: 580,
    sales_per_labor_hour: 6_240,
    open_tasks: 7,
    urgent_tasks: 2,
    shift_filled: 11,
    shift_required: 12,
    shift_unfilled: 1,
  }
}

function mockTasks(): ManagerTask[] {
  return [
    { id: "t1", title: "冷蔵庫の温度確認 (HACCP)", due_date: "本日 14:00", severity: "high", status: "open" },
    { id: "t2", title: "新人スタッフ田中さんのOJT記録", due_date: "本日 18:00", severity: "medium", status: "open" },
    { id: "t3", title: "週次清掃チェックリスト", due_date: "明日 10:00", severity: "low", status: "in_progress" },
    { id: "t4", title: "棚卸し（米・乾物）", due_date: "本日 22:00", severity: "high", status: "open" },
    { id: "t5", title: "POS精算誤差の調査", due_date: "本日 23:00", severity: "medium", status: "open" },
    { id: "t6", title: "設備点検（フライヤー油交換）", due_date: "明日 09:00", severity: "low", status: "open" },
    { id: "t7", title: "駐車場清掃", due_date: "本日 21:00", severity: "low", status: "open" },
  ]
}

function mockWasteList(): WasteListItem[] {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return [
    { id: "w1", date: fmt(today), product_name: "ごはん（盛り）", qty: 4, unit: "杯", reason: "売れ残り", cost_estimate: 320 },
    { id: "w2", date: fmt(new Date(today.getTime() - 86400e3)), product_name: "ねぎとろ", qty: 0.6, unit: "kg", reason: "賞味期限切れ", cost_estimate: 1480 },
    { id: "w3", date: fmt(new Date(today.getTime() - 86400e3 * 2)), product_name: "サラダ用レタス", qty: 1, unit: "玉", reason: "鮮度低下", cost_estimate: 220 },
    { id: "w4", date: fmt(new Date(today.getTime() - 86400e3 * 3)), product_name: "牛肉（並盛用）", qty: 0.4, unit: "kg", reason: "オーダーミス", cost_estimate: 1620 },
    { id: "w5", date: fmt(new Date(today.getTime() - 86400e3 * 5)), product_name: "味噌汁", qty: 8, unit: "杯", reason: "売れ残り", cost_estimate: 480 },
  ]
}

function mockEquipmentList(): EquipmentIssueRecord[] {
  return [
    { id: "eq1", date: "2026-04-30", equipment_name: "メインフライヤー", equipment_category: "fryer", severity: "high", status: "in_progress", description: "温度上昇に時間がかかる、サーモスタット異常の可能性。" },
    { id: "eq2", date: "2026-04-28", equipment_name: "POSレジ #2", equipment_category: "pos", severity: "medium", status: "fixed", description: "レシート印字かすれ。ヘッド清掃で復旧。" },
    { id: "eq3", date: "2026-04-25", equipment_name: "冷蔵庫 (バックヤード)", equipment_category: "refrigerator", severity: "medium", status: "reported", description: "ドアパッキン劣化。" },
  ]
}

function mockShiftDraft(draftId: string): ShiftDraftSlim {
  return {
    id: draftId,
    store_id: "00000000-0000-0000-0000-000000000010",
    week_start: "2026-05-04",
    status: "draft",
    fill_rate_pct: 92,
    cost_estimate_yen: 612_400,
    unfilled_slots: 3,
  }
}

function mockEvaluations(): StaffEvaluationDraft[] {
  return [
    { id: "ev1", staff_id: "s-001", staff_name: "田中 一郎", role: "ホール", last_review_date: "2026-04-01", notes: "" },
    { id: "ev2", staff_id: "s-002", staff_name: "佐藤 美咲", role: "キッチン", last_review_date: "2026-04-08", notes: "提供スピードが向上。", rating: 4 },
    { id: "ev3", staff_id: "s-003", staff_name: "鈴木 健太", role: "レジ", last_review_date: "2026-03-25", notes: "" },
    { id: "ev4", staff_id: "s-004", staff_name: "高橋 さくら", role: "ホール", last_review_date: "2026-04-15", notes: "丁寧な接客で常連客から評価。", rating: 5 },
    { id: "ev5", staff_id: "s-005", staff_name: "渡辺 大輔", role: "キッチン", last_review_date: "2026-03-30", notes: "" },
  ]
}
