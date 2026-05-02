"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Hexagon, Loader2 } from "lucide-react"
import { setToken } from "@/lib/auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

export default function MFAPage() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const mfaToken = sessionStorage.getItem("aentro_mfa_token")
      if (!mfaToken) {
        router.push("/auth/login")
        return
      }

      if (!API_URL) {
        setToken("demo_token")
        sessionStorage.removeItem("aentro_mfa_token")
        router.push("/")
        return
      }

      const res = await fetch(`${API_URL}/api/v1/auth/login/mfa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mfa_token: mfaToken, code }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.detail || "コードが正しくありません")
        return
      }

      const data = await res.json()
      setToken(data.access_token)
      sessionStorage.removeItem("aentro_mfa_token")
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
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#0d1117] border border-white/[0.06] rounded-xl p-6 space-y-5"
        >
          <h2 className="text-[15px] text-white/90 font-medium text-center">
            二段階認証
          </h2>

          <div>
            <label className="block text-[11px] text-white/50 mb-1.5 tracking-wide">
              認証コード（6桁）
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              autoFocus
              maxLength={6}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-center text-[22px] font-mono tracking-[0.3em] text-white/90 placeholder-white/20 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition"
              placeholder="000000"
            />
          </div>

          {error && (
            <p className="text-[12px] text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2.5 text-[13px] font-medium text-white transition"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            確認
          </button>

          <p className="text-center text-[11px] text-white/30">
            <button
              type="button"
              onClick={() => {/* same input works for backup codes */}}
              className="underline hover:text-white/50 transition"
            >
              バックアップコードを使用
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
