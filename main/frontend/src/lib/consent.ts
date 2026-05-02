/**
 * Consent management client.
 *
 * - getRequiredConsents: returns templates that the current user has NOT yet
 *   granted. UI calls this on PWA boot and forces ConsentDialog if non-empty.
 * - grant / withdraw / requestDeletion: thin wrappers on the consent API.
 *
 * Mock fallback: when NEXT_PUBLIC_API_URL is empty (demo mode) we keep an
 * in-memory granted set + localStorage flag so the dialog only shows once.
 */
import { authFetch } from "./auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""
const LOCAL_KEY = "aentro.consent.granted_v1"

export interface ConsentTemplate {
  id: string
  code: string
  version: number
  title: string
  body_md: string
  required_fields: string[]
}

export interface ConsentRecord {
  id: string
  template_id: string
  template_code: string
  template_version: number
  granted_at: string
  withdrawn_at: string | null
  scope: Record<string, boolean>
}

export interface DeletionRequest {
  id: string
  user_id: string
  requested_by: string
  requested_at: string
  scope: "all" | "face" | "personal" | "training"
  status: "pending" | "processing" | "done" | "rejected"
  processed_at: string | null
  deletion_log: Record<string, unknown> | null
  note: string | null
}

const MOCK_TEMPLATES: ConsentTemplate[] = [
  {
    id: "tmpl-face",
    code: "face",
    version: 1,
    title: "顔認証データの取得・利用について",
    body_md:
      "# 顔認証データの取り扱い\n\n出退勤打刻のため、あなたの顔特徴量を取得・保管します。顔写真そのものは保存しません。",
    required_fields: ["face"],
  },
  {
    id: "tmpl-gps",
    code: "gps",
    version: 1,
    title: "位置情報（GPS）の取得について",
    body_md:
      "# 位置情報の取り扱い\n\n打刻時に店舗ジオフェンス内にいることを確認するため、緯度経度を取得します。常時取得はしません。",
    required_fields: ["gps"],
  },
  {
    id: "tmpl-clock",
    code: "clock_retention",
    version: 1,
    title: "打刻記録の保管について",
    body_md:
      "# 打刻記録（出勤簿）の保管\n\n労働基準法 109 条に基づき、出退勤・休憩記録を3年間保管します。",
    required_fields: ["clock_retention"],
  },
  {
    id: "tmpl-interview",
    code: "interview",
    version: 1,
    title: "面談・評価記録の保管について",
    body_md:
      "# 面談・評価記録\n\n店長・SVとの面談メモ、評価スコア、AI要約を保管します。テナント外部への学習提供は行いません。",
    required_fields: ["interview"],
  },
]

function readMockGranted(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(arr)
  } catch {
    return new Set()
  }
}

function writeMockGranted(set: Set<string>): void {
  if (typeof window === "undefined") return
  localStorage.setItem(LOCAL_KEY, JSON.stringify(Array.from(set)))
}

export async function getRequiredConsents(): Promise<ConsentTemplate[]> {
  if (!API_URL) {
    const granted = readMockGranted()
    return MOCK_TEMPLATES.filter((t) => !granted.has(t.code))
  }
  try {
    const res = await authFetch("/api/v1/consent/required")
    if (!res.ok) return []
    const json = await res.json()
    return (json.data || []) as ConsentTemplate[]
  } catch {
    return []
  }
}

export async function grantConsent(templateId: string, scope: Record<string, boolean>): Promise<boolean> {
  if (!API_URL) {
    const granted = readMockGranted()
    const tmpl = MOCK_TEMPLATES.find((t) => t.id === templateId)
    if (tmpl) granted.add(tmpl.code)
    Object.entries(scope).forEach(([k, v]) => {
      if (v) granted.add(k)
    })
    writeMockGranted(granted)
    return true
  }
  const res = await authFetch("/api/v1/consent/grant", {
    method: "POST",
    body: JSON.stringify({ template_id: templateId, scope }),
  })
  return res.ok
}

export async function withdrawConsent(recordId: string): Promise<boolean> {
  if (!API_URL) {
    return true
  }
  const res = await authFetch("/api/v1/consent/withdraw", {
    method: "POST",
    body: JSON.stringify({ record_id: recordId }),
  })
  return res.ok
}

export async function listMyConsents(): Promise<ConsentRecord[]> {
  if (!API_URL) {
    const granted = readMockGranted()
    return Array.from(granted).map((code, i) => ({
      id: `mock-${i}`,
      template_id: `tmpl-${code}`,
      template_code: code,
      template_version: 1,
      granted_at: new Date().toISOString(),
      withdrawn_at: null,
      scope: { [code]: true },
    }))
  }
  const res = await authFetch("/api/v1/consent/my-consents")
  if (!res.ok) return []
  const json = await res.json()
  return (json.data || []) as ConsentRecord[]
}

export async function requestDataDeletion(
  scope: "all" | "face" | "personal" | "training",
  note?: string,
): Promise<DeletionRequest | null> {
  if (!API_URL) {
    return {
      id: `mock-${Date.now()}`,
      user_id: "demo",
      requested_by: "demo",
      requested_at: new Date().toISOString(),
      scope,
      status: "pending",
      processed_at: null,
      deletion_log: null,
      note: note ?? null,
    }
  }
  const res = await authFetch("/api/v1/consent/deletion-request", {
    method: "POST",
    body: JSON.stringify({ scope, note }),
  })
  if (!res.ok) return null
  const json = await res.json()
  return json.data as DeletionRequest
}

export async function listDeletionRequests(): Promise<DeletionRequest[]> {
  if (!API_URL) return []
  const res = await authFetch("/api/v1/consent/deletion-requests")
  if (!res.ok) return []
  const json = await res.json()
  return (json.data || []) as DeletionRequest[]
}

export async function processDeletionRequest(id: string): Promise<DeletionRequest | null> {
  if (!API_URL) return null
  const res = await authFetch(`/api/v1/consent/deletion-requests/${id}/process`, {
    method: "POST",
  })
  if (!res.ok) return null
  const json = await res.json()
  return json.data as DeletionRequest
}

export async function rejectDeletionRequest(id: string): Promise<DeletionRequest | null> {
  if (!API_URL) return null
  const res = await authFetch(`/api/v1/consent/deletion-requests/${id}/reject`, {
    method: "POST",
  })
  if (!res.ok) return null
  const json = await res.json()
  return json.data as DeletionRequest
}
