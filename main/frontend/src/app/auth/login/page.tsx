"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Hexagon, Loader2 } from "lucide-react"
import { setToken } from "@/lib/auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (!API_URL) {
        // Demo mode: skip API, just redirect
        setToken("demo_token")
        router.push("/")
        return
      }

      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (res.status === 429) {
        setError("アカウントがロックされています。30分後にお試しください。")
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.detail || "ログインに失敗しました")
        return
      }

      const data = await res.json()

      if (data.mfa_required) {
        // Store mfa_token in sessionStorage for MFA page
        sessionStorage.setItem("aentro_mfa_token", data.mfa_token)
        router.push("/auth/mfa")
        return
      }

      setToken(data.access_token)
      router.push("/")
    } catch {
      setError("サーバーに接続できません")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#060a10] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Hexagon className="w-10 h-10 text-blue-400 mb-3" strokeWidth={1.5} />
          <div className="text-[13px] font-bold tracking-[0.18em] text-blue-400 uppercase">
            AENTRO
          </div>
          <div className="text-[11px] text-white/40 tracking-[0.08em] mt-1">
            ゼンショーグループ 経営OS
          </div>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#0d1117] border border-white/[0.06] rounded-xl p-6 space-y-5"
        >
          <div>
            <label className="block text-[11px] text-white/50 mb-1.5 tracking-wide">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-[13px] text-white/90 placeholder-white/20 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition"
              placeholder="admin@aentro.jp"
            />
          </div>

          <div>
            <label className="block text-[11px] text-white/50 mb-1.5 tracking-wide">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-[13px] text-white/90 placeholder-white/20 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-[12px] text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2.5 text-[13px] font-medium text-white transition"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            ログイン
          </button>
        </form>

        {/* Demo hint */}
        <p className="mt-4 text-center text-[10px] text-white/25">
          デモ: admin@aentro.jp / demo
        </p>
      </div>
    </div>
  )
}
