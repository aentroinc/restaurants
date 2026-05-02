/**
 * Auth client for the 3 PWAs (manager / staff / sv).
 *
 * - Real auth path: JWT lives in an httpOnly `aentro_session` cookie set by
 *   `/api/v1/auth/login_v2`. We never touch the cookie in JS; we just send
 *   `credentials: "include"` on every fetch.
 * - Legacy path: when a `aentro_token` is found in localStorage (old flow),
 *   we still send it as `Bearer` — keeps demo + e2e tests working while we
 *   migrate.
 * - Demo / mock path: when `NEXT_PUBLIC_API_URL` is empty we hand back a
 *   synthetic identity so dev mode doesn't crash on a missing backend.
 */

const TOKEN_KEY = "aentro_token"
const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

export type UserRole = "manager" | "staff" | "sv" | "admin"

export interface AssignedStore {
  id: string
  code: string
  name: string
  brand_id: string
  brand_name: string | null
  role: UserRole
  is_default: boolean
}

export interface CurrentUser {
  user_id: string
  email: string
  name: string
  role: UserRole
  tenant_id: string
  assigned_stores: AssignedStore[]
  current_store_id: string | null
  purpose_token: string | null
}

// ---------- legacy bearer support (kept for non-cookie demo) ----------

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  // With cookie auth we can't introspect httpOnly from JS, so always assume
  // "maybe authenticated" — the real check is `getCurrentUser()` returning a
  // user. The legacy bearer path also passes through here.
  return !!getToken()
}

// ---------- shared fetch helper (cookie + optional bearer) ----------

export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) || {}),
  }
  const bearer = getToken()
  if (bearer) headers["Authorization"] = `Bearer ${bearer}`
  return fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...init,
    headers,
  })
}

// ---------- public API ----------

const MOCK_USER: CurrentUser = {
  user_id: "demo-user",
  email: "manager@zensho.co.jp",
  name: "店長デモ",
  role: "manager",
  tenant_id: "00000000-0000-0000-0000-000000000001",
  assigned_stores: [
    {
      id: "S-1001",
      code: "S-1001",
      name: "すき家 品川店",
      brand_id: "B-001",
      brand_name: "すき家",
      role: "manager",
      is_default: true,
    },
  ],
  current_store_id: "S-1001",
  purpose_token: null,
}

let _userCache: CurrentUser | null = null
let _userPromise: Promise<CurrentUser | null> | null = null

export async function getCurrentUser(force = false): Promise<CurrentUser | null> {
  if (!force && _userCache) return _userCache
  if (!force && _userPromise) return _userPromise

  _userPromise = (async () => {
    if (!API_URL) {
      _userCache = MOCK_USER
      return MOCK_USER
    }
    try {
      const res = await authFetch("/api/v1/auth/me")
      if (res.status === 401) {
        _userCache = null
        return null
      }
      if (!res.ok) {
        _userCache = null
        return null
      }
      const json = await res.json()
      _userCache = json as CurrentUser
      return _userCache
    } catch {
      _userCache = null
      return null
    } finally {
      _userPromise = null
    }
  })()
  return _userPromise
}

export interface LoginResult {
  ok: boolean
  mfa_required?: boolean
  mfa_token?: string
  error?: string
}

export async function login(email: string, password: string): Promise<LoginResult> {
  if (!API_URL) {
    setToken("demo_token")
    _userCache = MOCK_USER
    return { ok: true }
  }
  const res = await fetch(`${API_URL}/api/v1/auth/login_v2`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  if (res.status === 429) return { ok: false, error: "アカウントがロックされています。30分後にお試しください。" }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { ok: false, error: data.detail || "ログインに失敗しました" }
  }
  const data = await res.json()
  if (data.mfa_required) {
    return { ok: false, mfa_required: true, mfa_token: data.mfa_token }
  }
  if (data.access_token) setToken(data.access_token) // bearer fallback
  _userCache = null
  return { ok: true }
}

export async function loginWithMfa(mfaToken: string, code: string): Promise<LoginResult> {
  if (!API_URL) return { ok: true }
  const res = await fetch(`${API_URL}/api/v1/auth/mfa/verify_token`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mfa_token: mfaToken, code }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { ok: false, error: data.detail || "MFA 認証に失敗しました" }
  }
  const data = await res.json()
  if (data.access_token) setToken(data.access_token)
  _userCache = null
  return { ok: true }
}

export async function logout(): Promise<void> {
  if (API_URL) {
    try {
      await fetch(`${API_URL}/api/v1/auth/logout`, { method: "POST", credentials: "include" })
    } catch {
      // ignore
    }
  }
  clearToken()
  _userCache = null
}

export async function switchStore(storeId: string): Promise<{ ok: boolean; error?: string }> {
  if (!API_URL) {
    if (_userCache) {
      _userCache = { ..._userCache, current_store_id: storeId }
    }
    return { ok: true }
  }
  const res = await authFetch("/api/v1/auth/switch-store", {
    method: "POST",
    body: JSON.stringify({ store_id: storeId }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { ok: false, error: data.detail || "店舗切替に失敗しました" }
  }
  const data = await res.json()
  if (data.access_token) setToken(data.access_token)
  _userCache = null
  return { ok: true }
}

export function homePathForRole(role: UserRole | string): string {
  switch (role) {
    case "staff":
      return "/staff"
    case "sv":
      return "/sv"
    case "admin":
      return "/"
    case "manager":
    default:
      return "/manager"
  }
}
