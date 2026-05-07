/**
 * Line Check API client.
 *
 * Wraps `/api/v1/line-check/*`. When NEXT_PUBLIC_API_URL is unset, falls back
 * to mock data so the page is demo-able without a backend running.
 */
import { getToken } from "./auth"
import type { APIResponse } from "./types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

// ---------- Types ----------

export type ScheduleType = "opening" | "4h" | "closing" | "weekly"

export interface ChecklistItem {
  id: string
  order: number
  text: string
  required: boolean
  requires_photo: boolean
  requires_temperature: boolean
  min_temp: number | null
  max_temp: number | null
}

export interface ChecklistTemplate {
  id: string
  name: string
  schedule_type: ScheduleType
  brand_id: string | null
  store_id: string | null
  active: boolean
  items: ChecklistItem[]
}

export interface ChecklistAnswer {
  id: string
  run_id: string
  item_id: string
  value_text: string | null
  value_number: number | null
  photo_url: string | null
  ok: boolean
  comment: string | null
  task_id?: string | null
}

export interface ChecklistRun {
  id: string
  template_id: string
  store_id: string
  employee_id: string | null
  started_at: string | null
  completed_at: string | null
  status: "in_progress" | "completed" | "failed"
  geofence_ok: boolean
  lat: number | null
  lon: number | null
  answers?: ChecklistAnswer[]
}

// ---------- Mock fallback ----------

const MOCK_TEMPLATES: ChecklistTemplate[] = [
  {
    id: "tpl-opening",
    name: "かっぱ寿司 開店チェックリスト",
    schedule_type: "opening",
    brand_id: null,
    store_id: null,
    active: true,
    items: [
      { id: "i1", order: 0, text: "店舗外観・看板の点灯確認", required: true, requires_photo: true, requires_temperature: false, min_temp: null, max_temp: null },
      { id: "i2", order: 1, text: "厨房冷蔵庫の温度（0-5℃）", required: true, requires_photo: true, requires_temperature: true, min_temp: 0, max_temp: 5 },
      { id: "i3", order: 2, text: "牛丼鍋の温度（70-95℃）", required: true, requires_photo: false, requires_temperature: true, min_temp: 70, max_temp: 95 },
      { id: "i4", order: 3, text: "POSレジ起動・釣銭確認", required: true, requires_photo: false, requires_temperature: false, min_temp: null, max_temp: null },
      { id: "i5", order: 4, text: "トイレ清掃チェック", required: true, requires_photo: true, requires_temperature: false, min_temp: null, max_temp: null },
    ],
  },
  {
    id: "tpl-closing",
    name: "かっぱ寿司 閉店チェックリスト",
    schedule_type: "closing",
    brand_id: null,
    store_id: null,
    active: true,
    items: [
      { id: "c1", order: 0, text: "売上日報の入力完了", required: true, requires_photo: false, requires_temperature: false, min_temp: null, max_temp: null },
      { id: "c2", order: 1, text: "ガス元栓の閉鎖確認", required: true, requires_photo: true, requires_temperature: false, min_temp: null, max_temp: null },
      { id: "c3", order: 2, text: "戸締まり確認", required: true, requires_photo: true, requires_temperature: false, min_temp: null, max_temp: null },
    ],
  },
  {
    id: "tpl-4h",
    name: "かっぱ寿司 4h品質チェック",
    schedule_type: "4h",
    brand_id: null,
    store_id: null,
    active: true,
    items: [
      { id: "h1", order: 0, text: "牛丼の温度（70-95℃）", required: true, requires_photo: false, requires_temperature: true, min_temp: 70, max_temp: 95 },
      { id: "h2", order: 1, text: "ライス保温温度（60-75℃）", required: true, requires_photo: false, requires_temperature: true, min_temp: 60, max_temp: 75 },
      { id: "h3", order: 2, text: "テーブル・カウンター清掃", required: true, requires_photo: true, requires_temperature: false, min_temp: null, max_temp: null },
    ],
  },
]

const MOCK_RUNS: ChecklistRun[] = [
  { id: "run-1", template_id: "tpl-opening", store_id: "store-001", employee_id: null, started_at: "2026-05-02T06:00:00+09:00", completed_at: "2026-05-02T06:18:00+09:00", status: "completed", geofence_ok: true, lat: 35.6895, lon: 139.6917 },
  { id: "run-2", template_id: "tpl-4h",      store_id: "store-001", employee_id: null, started_at: "2026-05-02T10:00:00+09:00", completed_at: "2026-05-02T10:08:00+09:00", status: "completed", geofence_ok: true, lat: 35.6895, lon: 139.6917 },
  { id: "run-3", template_id: "tpl-4h",      store_id: "store-001", employee_id: null, started_at: "2026-05-02T14:00:00+09:00", completed_at: null,                       status: "in_progress",   geofence_ok: true, lat: 35.6895, lon: 139.6917 },
]

// ---------- Fetcher ----------

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) {
    return mock<T>(path, init)
  }
  const headers: Record<string, string> = init?.body && !(init.body instanceof FormData)
    ? { "Content-Type": "application/json" }
    : {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const r = await fetch(`${API_URL}${path}`, { ...init, headers: { ...headers, ...(init?.headers || {}) } })
  if (!r.ok) throw new Error(`API ${r.status} ${path}`)
  const json: APIResponse<T> = await r.json()
  if (json.errors && json.errors.length) throw new Error(JSON.stringify(json.errors))
  return json.data as T
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mock<T>(path: string, init?: RequestInit): T {
  if (path.startsWith("/api/v1/line-check/templates") && (!init?.method || init.method === "GET")) {
    return MOCK_TEMPLATES as any
  }
  if (path.startsWith("/api/v1/line-check/runs") && path.endsWith("/complete")) {
    return { id: path.split("/")[5], status: "completed" } as any
  }
  if (path.match(/\/runs\/[^/]+\/answers$/)) {
    return { id: "ans-mock", ok: true, task_id: null } as any
  }
  if (path === "/api/v1/line-check/runs" && init?.method === "POST") {
    return { id: "run-new", status: "in_progress", geofence_ok: true, started_at: new Date().toISOString(), completed_at: null, template_id: "tpl-opening", store_id: "store-001", employee_id: null, lat: null, lon: null } as any
  }
  if (path.startsWith("/api/v1/line-check/runs")) {
    return MOCK_RUNS as any
  }
  if (path === "/api/v1/line-check/photos") {
    return { photo_url: "/mock/photo.jpg", size: 1024 } as any
  }
  return null as any
}

// ---------- Public API ----------

export const lineCheckApi = {
  listTemplates: (scheduleType?: ScheduleType) =>
    call<ChecklistTemplate[]>(
      `/api/v1/line-check/templates${scheduleType ? `?schedule_type=${scheduleType}` : ""}`,
    ),

  createTemplate: (body: Partial<ChecklistTemplate>) =>
    call<ChecklistTemplate>("/api/v1/line-check/templates", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  startRun: (body: { template_id: string; store_id: string; employee_id?: string; lat?: number; lon?: number }) =>
    call<ChecklistRun>("/api/v1/line-check/runs", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getRun: (runId: string) =>
    call<ChecklistRun>(`/api/v1/line-check/runs/${runId}`),

  submitAnswer: (runId: string, body: {
    item_id: string
    value_text?: string | null
    value_number?: number | null
    photo_url?: string | null
    comment?: string | null
  }) =>
    call<ChecklistAnswer>(`/api/v1/line-check/runs/${runId}/answers`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  completeRun: (runId: string) =>
    call<ChecklistRun>(`/api/v1/line-check/runs/${runId}/complete`, { method: "POST" }),

  listRuns: (params: { store_id?: string; date?: string } = {}) => {
    const sp = new URLSearchParams()
    if (params.store_id) sp.set("store_id", params.store_id)
    if (params.date) sp.set("date", params.date)
    const qs = sp.toString()
    return call<ChecklistRun[]>(`/api/v1/line-check/runs${qs ? `?${qs}` : ""}`)
  },

  uploadPhoto: async (file: Blob, runId?: string) => {
    if (!API_URL) {
      // Mock: store a data URL inline.
      return new Promise<{ photo_url: string; size: number }>((resolve) => {
        const fr = new FileReader()
        fr.onload = () => resolve({ photo_url: String(fr.result), size: file.size })
        fr.readAsDataURL(file)
      })
    }
    const fd = new FormData()
    fd.append("file", file, "photo.jpg")
    if (runId) fd.append("run_id", runId)
    const token = getToken()
    const r = await fetch(`${API_URL}/api/v1/line-check/photos`, {
      method: "POST",
      body: fd,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (!r.ok) throw new Error(`upload ${r.status}`)
    const j: APIResponse<{ photo_url: string; size: number }> = await r.json()
    return j.data!
  },
}
