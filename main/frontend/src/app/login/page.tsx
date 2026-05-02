"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Hexagon, Loader2 } from "lucide-react"
import {
  getCurrentUser,
  homePathForRole,
  login,
  loginWithMfa,
} from "@/lib/auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

/** Default OIDC IdP id used by the SSO redirect button. */
const DEFAULT_OIDC_IDP_ID =
  process.env.NEXT_PUBLIC_OIDC_IDP_ID || "google"

export default function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params?.get("next") || ""

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mfaToken, setMfaToken] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function redirectByRole() {
    const me = await getCurrentUser(true)
    if (!me) {
      router.push("/")
      return
    }
    router.push(next || homePathForRole(me.role))
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const r = await login(email, password)
      if (r.mfa_required && r.mfa_token) {
        setMfaToken(r.mfa_token)
        return
      }
      if (!r.ok) {
        setError(r.error || "ログインに失敗しました")
        return
      }
      await redirectByRole()
    } finally {
      setLoading(false)
    }
  }

  async function handleMfa(e: React.FormEvent) {
    e.preventDefault()
    if (!mfaToken) return
    setError("")
    setLoading(true)
    try {
      const r = await loginWithMfa(mfaToken, mfaCode)
      if (!r.ok) {
        setError(r.error || "MFA 認証に失敗しました")
        return
      }
      await redirectByRole()
    } finally {
      setLoading(false)
    }
  }

  function handleOidc() {
    if (!API_URL) {
      setError("OIDC は本番接続でのみ利用できます")
      return
    }
    window.location.href = `${API_URL}/api/v1/sso/oidc/${DEFAULT_OIDC_IDP_ID}/login`
  }

  return (
    <div className="min-h-screen bg-[#060a10] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Hexagon className="w-10 h-10 text-blue-400 mb-3" strokeWidth={1.5} />
          <div className="text-[13px] font-bold tracking-[0.18em] text-blue-400 uppercase">
            AENTRO
          </div>
          <div className="text-[11px] text-white/40 tracking-[0.08em] mt-1">
            ゼンショーグループ 経営OS
          </div>
        </div>

        {!mfaToken ? (
          <form
            onSubmit={handleLogin}
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
                placeholder="manager@zensho.co.jp"
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

            {error && <p className="text-[12px] text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2.5 text-[13px] font-medium text-white transition"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              ログイン
            </button>

            <div className="flex items-center gap-3 pt-1">
              <span className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-[10px] text-white/30 uppercase tracking-wider">or</span>
              <span className="flex-1 h-px bg-white/[0.06]" />
            </div>

            <button
              type="button"
              onClick={handleOidc}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] px-4 py-2.5 text-[13px] font-medium text-white/85 transition"
            >
              <span className="inline-flex w-4 h-4 rounded-sm bg-white items-center justify-center text-[10px] font-bold text-[#4285F4]">G</span>
              Google で続ける
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleMfa}
            className="bg-[#0d1117] border border-white/[0.06] rounded-xl p-6 space-y-5"
          >
            <p className="text-[12px] text-white/70">
              認証アプリの 6 桁コード、またはバックアップコードを入力してください。
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              required
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-[14px] tracking-[0.4em] text-center text-white/90 placeholder-white/20 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition"
              placeholder="000000"
            />
            {error && <p className="text-[12px] text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2.5 text-[13px] font-medium text-white transition"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              認証
            </button>
            <button
              type="button"
              onClick={() => {
                setMfaToken(null)
                setMfaCode("")
                setError("")
              }}
              className="block w-full text-center text-[11px] text-white/40 hover:text-white/70"
            >
              ← メール/パスワードに戻る
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-[10px] text-white/25">
          デモ: manager@zensho.co.jp / demo1234
        </p>
      </div>
    </div>
  )
}
