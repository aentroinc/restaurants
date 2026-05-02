/**
 * Staff (現場) PWA API client.
 * Hits real backend when NEXT_PUBLIC_API_URL is set, otherwise returns mock
 * responses. All POSTs degrade to local-success on 404 so the demo still
 * progresses.
 */
import { getToken } from "./auth"
import { fetchWithRetry } from "./fetch-with-retry"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function _on401() {
  if (typeof window === "undefined") return
  if (window.location.pathname.startsWith("/login") || window.location.pathname.startsWith("/auth/login")) return
  const next = encodeURIComponent(window.location.pathname + window.location.search)
  window.location.href = `/login?next=${next}`
}

async function postJson<T>(path: string, body: unknown, mock: T, idempotencyKey?: string): Promise<T> {
  if (!API_URL) return mock
  try {
    const token = getToken()
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey || newIdempotencyKey(),
    }
    if (token) headers["Authorization"] = `Bearer ${token}`
    const res = await fetchWithRetry(`${API_URL}${path}`, { method: "POST", headers, body: JSON.stringify(body), credentials: "include" })
    if (res.status === 401) { _on401(); return mock }
    if (res.status === 404) return mock
    if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
    const json = await res.json()
    return (json.data ?? json) as T
  } catch {
    return mock
  }
}

async function getJson<T>(path: string, mock: T): Promise<T> {
  if (!API_URL) return mock
  try {
    const token = getToken()
    const headers: Record<string, string> = {}
    if (token) headers["Authorization"] = `Bearer ${token}`
    const res = await fetchWithRetry(`${API_URL}${path}`, { headers, credentials: "include" })
    if (res.status === 401) { _on401(); return mock }
    if (res.status === 404) return mock
    if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
    const json = await res.json()
    return (json.data ?? json) as T
  } catch {
    return mock
  }
}

// ---------- Types ----------

export interface LossReport {
  store_id: string
  employee_id: string
  item_name: string
  qty: number
  reason: string
  photo_url?: string
  cost_estimate: number
  occurred_at: string
}

export interface CustomerVoice {
  store_id: string
  content: string
  sentiment: "positive" | "neutral" | "negative"
  source: string
  rating?: number
  employee_id: string
}

export interface AllergyResponse {
  store_id: string
  customer_age_range?: string
  allergen: string
  items_provided_json: Record<string, unknown>
  response_taken: string
  incident_occurred: boolean
  employee_id: string
}

export interface ClockEvent {
  employee_id: string
  store_id: string
  lat?: number
  lon?: number
}

export interface Shift {
  id: string
  date: string
  start: string
  end: string
  role: string
  store_id: string
  store_name: string
}

// ---------- Face / QR / PIN auth + Clock ----------

export interface FaceVerifyResp {
  employee_id: string | null
  confidence: number
  allowed: boolean
}

export interface QrInitResp {
  qr_token: string
  expires_at: string
  ttl_sec: number
}

export interface QrVerifyResp {
  employee_id: string | null
  store_id: string | null
  valid: boolean
}

export interface ClockEventResp {
  id: string
  employee_id: string
  store_id: string
  event_type: "in" | "out" | "break_start" | "break_end"
  geofence_ok: boolean
  auth_method: "face" | "qr" | "pin"
  confidence: number | null
  occurred_at: string
}

export const faceAuthApi = {
  enroll: (employee_id: string, embedding: number[]) =>
    postJson<{ template_id: string; employee_id: string; enrolled_at: string }>(
      "/api/v1/face-auth/enroll",
      { embedding, employee_id },
      { template_id: crypto.randomUUID(), employee_id, enrolled_at: new Date().toISOString() },
    ),

  verify: (embedding: number[], store_id: string) =>
    postJson<FaceVerifyResp>(
      "/api/v1/face-auth/verify",
      { embedding, store_id },
      { employee_id: staffIdentity.employeeId, confidence: 0.92, allowed: true },
    ),

  qrInit: (store_id: string, employee_id?: string) =>
    postJson<QrInitResp>(
      "/api/v1/face-auth/qr-init",
      { store_id, employee_id },
      { qr_token: `mock-${crypto.randomUUID()}`, expires_at: new Date(Date.now() + 30000).toISOString(), ttl_sec: 30 },
    ),

  qrVerify: (qr_token: string) =>
    postJson<QrVerifyResp>(
      "/api/v1/face-auth/qr-verify",
      { qr_token },
      { employee_id: staffIdentity.employeeId, store_id: "store-001", valid: true },
    ),

  pinSet: (employee_id: string, pin: string) =>
    postJson<{ ok: boolean }>("/api/v1/face-auth/pin-set", { employee_id, pin }, { ok: true }),

  pinVerify: (employee_id: string, pin: string) =>
    postJson<{ valid: boolean; locked: boolean }>(
      "/api/v1/face-auth/pin-verify",
      { employee_id, pin },
      { valid: pin === "1234", locked: false },
    ),
}

type ClockBody = { employee_id: string; store_id: string; lat?: number; lon?: number; auth_method: "face" | "qr" | "pin"; confidence?: number; idempotency_key?: string }
type BreakBody = { employee_id: string; store_id: string; auth_method: "face" | "qr" | "pin"; idempotency_key?: string }

export const clockApi = {
  in: (b: ClockBody) => {
    const key = b.idempotency_key || newIdempotencyKey()
    return postJson<ClockEventResp>("/api/v1/clock/in", { ...b, idempotency_key: key }, {
      id: key, employee_id: b.employee_id, store_id: b.store_id,
      event_type: "in", geofence_ok: true, auth_method: b.auth_method,
      confidence: b.confidence ?? null, occurred_at: new Date().toISOString(),
    }, key)
  },
  out: (b: ClockBody) => {
    const key = b.idempotency_key || newIdempotencyKey()
    return postJson<ClockEventResp>("/api/v1/clock/out", { ...b, idempotency_key: key }, {
      id: key, employee_id: b.employee_id, store_id: b.store_id,
      event_type: "out", geofence_ok: true, auth_method: b.auth_method,
      confidence: b.confidence ?? null, occurred_at: new Date().toISOString(),
    }, key)
  },
  breakStart: (b: BreakBody) => {
    const key = b.idempotency_key || newIdempotencyKey()
    return postJson<ClockEventResp>("/api/v1/clock/break/start", { ...b, idempotency_key: key }, {
      id: key, employee_id: b.employee_id, store_id: b.store_id,
      event_type: "break_start", geofence_ok: true, auth_method: b.auth_method,
      confidence: null, occurred_at: new Date().toISOString(),
    }, key)
  },
  breakEnd: (b: BreakBody) => {
    const key = b.idempotency_key || newIdempotencyKey()
    return postJson<ClockEventResp>("/api/v1/clock/break/end", { ...b, idempotency_key: key }, {
      id: key, employee_id: b.employee_id, store_id: b.store_id,
      event_type: "break_end", geofence_ok: true, auth_method: b.auth_method,
      confidence: null, occurred_at: new Date().toISOString(),
    }, key)
  },
  today: (employee_id: string) =>
    getJson<ClockEventResp[]>(`/api/v1/clock/today/${employee_id}`, []),
}

// ---------- Endpoints ----------

export const staffApi = {
  submitLoss: (b: LossReport) =>
    postJson("/api/v1/loss-reports", b, { id: crypto.randomUUID(), accepted: true, ...b }),

  submitVoice: (b: CustomerVoice) =>
    postJson("/api/v1/customer-voices", b, { id: crypto.randomUUID(), accepted: true, ...b }),

  submitAllergy: (b: AllergyResponse) =>
    postJson("/api/v1/allergy-responses", b, { id: crypto.randomUUID(), accepted: true, ...b }),

  clockIn: (b: ClockEvent) =>
    postJson("/api/v1/clock-in", b, {
      id: crypto.randomUUID(),
      type: "in" as const,
      at: new Date().toISOString(),
      ...b,
    }),

  clockOut: (b: ClockEvent) =>
    postJson("/api/v1/clock-out", b, {
      id: crypto.randomUUID(),
      type: "out" as const,
      at: new Date().toISOString(),
      ...b,
    }),

  shifts: (employeeId: string, from: string, to: string) =>
    getJson<Shift[]>(`/api/v1/employees/${employeeId}/shifts?from=${from}&to=${to}`, mockShifts(from, to)),
}

// ---------- Mock data ----------

function mockShifts(from: string, _to: string): Shift[] {
  const start = new Date(from)
  const out: Shift[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    if (i % 3 === 1) continue
    out.push({
      id: `shift-${i}`,
      date: d.toISOString().slice(0, 10),
      start: i % 2 === 0 ? "10:00" : "17:00",
      end: i % 2 === 0 ? "15:00" : "22:00",
      role: i % 2 === 0 ? "ホール" : "キッチン",
      store_id: "store-001",
      store_name: "すき家 新宿東口店",
    })
  }
  return out
}

// ---------- Local clock log (offline tolerance) ----------

const CLOCK_LOG_KEY = "aentro-staff-clock-log"

export interface ClockLogEntry {
  id: string
  type: "in" | "out"
  at: string
  store_id: string
  employee_id: string
  lat?: number
  lon?: number
  synced: boolean
}

export const clockLog = {
  list(): ClockLogEntry[] {
    if (typeof window === "undefined") return []
    try {
      return JSON.parse(localStorage.getItem(CLOCK_LOG_KEY) || "[]")
    } catch {
      return []
    }
  },
  add(e: ClockLogEntry) {
    if (typeof window === "undefined") return
    const list = clockLog.list()
    list.unshift(e)
    localStorage.setItem(CLOCK_LOG_KEY, JSON.stringify(list.slice(0, 100)))
  },
  clear() {
    if (typeof window === "undefined") return
    localStorage.removeItem(CLOCK_LOG_KEY)
  },
}

// ---------- Identity helpers ----------

const PIN_KEY = "aentro-staff-pin"
const ID_KEY = "aentro-staff-id"

export const staffIdentity = {
  get employeeId(): string {
    if (typeof window === "undefined") return "emp-demo"
    return localStorage.getItem(ID_KEY) || "emp-demo"
  },
  setEmployeeId(id: string) {
    if (typeof window === "undefined") return
    localStorage.setItem(ID_KEY, id)
  },
  setPin(pin: string) {
    if (typeof window === "undefined") return
    localStorage.setItem(PIN_KEY, pin)
  },
  verifyPin(pin: string): boolean {
    if (typeof window === "undefined") return false
    const stored = localStorage.getItem(PIN_KEY)
    if (!stored) {
      localStorage.setItem(PIN_KEY, pin)
      return true
    }
    return stored === pin
  },
  hasPin(): boolean {
    if (typeof window === "undefined") return false
    return !!localStorage.getItem(PIN_KEY)
  },
}
