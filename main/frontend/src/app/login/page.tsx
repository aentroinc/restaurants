"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { setToken, setUser } from "@/lib/auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("admin@aentro.jp")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!API_URL) {
      // demo mode without backend: synthesize token
      setError("API_URL is not configured. Demo mode does not require login.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.detail || `HTTP ${r.status}`)
      }
      const body = (await r.json()) as { access_token: string }
      setToken(body.access_token)

      const meR = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${body.access_token}` },
      })
      if (meR.ok) {
        const me = await meR.json()
        setUser(me)
      }
      router.push("/")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold mb-1">AENTRO ログイン</h1>
        <p className="text-xs text-slate-500 mb-6">
          外食チェーン経営 OS にサインインします
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-700">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "サインイン中..." : "サインイン"}
          </button>
        </form>
        <p className="mt-4 text-[10px] text-slate-400">
          DEMO: admin@aentro.jp / sv@aentro.jp / manager@aentro.jp はパスワード不要
        </p>
      </div>
    </div>
  )
}
