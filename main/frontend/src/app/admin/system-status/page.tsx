"use client"

import { useState, useCallback } from "react"
import { ContextHeader } from "@/components/context-header"
import { Button } from "@/components/ui/button"
import { RefreshCw, CheckCircle2, XCircle, Circle } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

const ENDPOINTS = [
  { path: "/health", label: "ヘルスチェック" },
  { path: "/api/v1/executive/summary", label: "経営サマリー" },
  { path: "/api/v1/stores/ranking", label: "店舗ランキング" },
  { path: "/api/v1/kpi-definitions", label: "KPI定義" },
  { path: "/api/v1/ontology/object-types", label: "オントロジー" },
  { path: "/api/v1/vertical/recipes", label: "レシピ" },
  { path: "/api/v1/connectors/available", label: "コネクタ" },
  { path: "/api/v1/rbac/roles", label: "ロール" },
  { path: "/api/v1/audit/logs", label: "監査ログ" },
  { path: "/api/v1/workspace/analyses", label: "ワークスペース" },
]

type EndpointStatus = "idle" | "loading" | "ok" | "error"

interface EndpointResult {
  status: EndpointStatus
  statusCode?: number
  latency?: number
  error?: string
  checkedAt?: string
}

export default function SystemStatusPage() {
  const [results, setResults] = useState<Record<string, EndpointResult>>(
    Object.fromEntries(ENDPOINTS.map((e) => [e.path, { status: "idle" as const }]))
  )
  const [checking, setChecking] = useState(false)

  const checkEndpoint = useCallback(async (path: string) => {
    if (!API_URL) {
      setResults((prev) => ({
        ...prev,
        [path]: { status: "error", error: "NEXT_PUBLIC_API_URL 未設定", checkedAt: new Date().toLocaleTimeString("ja-JP") },
      }))
      return
    }

    setResults((prev) => ({ ...prev, [path]: { status: "loading" } }))
    const start = performance.now()

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("aentro_token") : null
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (token) headers["Authorization"] = `Bearer ${token}`

      const res = await fetch(`${API_URL}${path}`, { headers, signal: AbortSignal.timeout(10000) })
      const latency = Math.round(performance.now() - start)

      if (res.ok) {
        setResults((prev) => ({
          ...prev,
          [path]: { status: "ok", statusCode: res.status, latency, checkedAt: new Date().toLocaleTimeString("ja-JP") },
        }))
      } else {
        setResults((prev) => ({
          ...prev,
          [path]: { status: "error", statusCode: res.status, latency, error: `HTTP ${res.status}`, checkedAt: new Date().toLocaleTimeString("ja-JP") },
        }))
      }
    } catch (e: any) {
      const latency = Math.round(performance.now() - start)
      setResults((prev) => ({
        ...prev,
        [path]: { status: "error", latency, error: e.message || "接続失敗", checkedAt: new Date().toLocaleTimeString("ja-JP") },
      }))
    }
  }, [])

  const checkAll = useCallback(async () => {
    setChecking(true)
    await Promise.allSettled(ENDPOINTS.map((e) => checkEndpoint(e.path)))
    setChecking(false)
  }, [checkEndpoint])

  const okCount = Object.values(results).filter((r) => r.status === "ok").length
  const errorCount = Object.values(results).filter((r) => r.status === "error").length
  const idleCount = Object.values(results).filter((r) => r.status === "idle").length

  return (
    <div className="min-h-full bg-[#0a0e14] text-white/80 flex flex-col">
      <ContextHeader title="システム状態" description="APIエンドポイントの接続状況" />

      <div className="px-5 py-5 space-y-5">
        {/* Summary + action */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-[12px]">
            {!API_URL && (
              <span className="text-amber-400 bg-amber-400/10 px-3 py-1 rounded text-[11px]">
                NEXT_PUBLIC_API_URL 未設定（スタンドアロンモード）
              </span>
            )}
            {API_URL && (
              <span className="text-white/40 font-mono text-[11px]">{API_URL}</span>
            )}
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-3 h-3" />{okCount}</span>
              <span className="flex items-center gap-1 text-red-400"><XCircle className="w-3 h-3" />{errorCount}</span>
              <span className="flex items-center gap-1 text-white/30"><Circle className="w-3 h-3" />{idleCount}</span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={checkAll}
            disabled={checking}
            className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-400/20 text-[12px] h-8"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${checking ? "animate-spin" : ""}`} />
            全チェック実行
          </Button>
        </div>

        {/* Endpoint list */}
        <div className="rounded-lg border border-white/[0.06] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium w-8">状態</th>
                <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">エンドポイント</th>
                <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">パス</th>
                <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">ステータス</th>
                <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">レイテンシ</th>
                <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">確認日時</th>
                <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {ENDPOINTS.map((ep) => {
                const r = results[ep.path]
                return (
                  <tr key={ep.path} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      {r.status === "ok" && <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400" />}
                      {r.status === "error" && <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400" />}
                      {r.status === "loading" && <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />}
                      {r.status === "idle" && <span className="inline-block w-2.5 h-2.5 rounded-full bg-white/20" />}
                    </td>
                    <td className="px-4 py-3 text-white/80">{ep.label}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-white/50">{ep.path}</td>
                    <td className="px-4 py-3">
                      {r.statusCode && (
                        <span className={`text-[11px] font-mono ${r.statusCode < 400 ? "text-emerald-400" : "text-red-400"}`}>{r.statusCode}</span>
                      )}
                      {r.error && !r.statusCode && (
                        <span className="text-[11px] text-red-400">{r.error}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-white/50">
                      {r.latency !== undefined ? `${r.latency}ms` : "-"}
                    </td>
                    <td className="px-4 py-3 text-white/30 text-[11px] font-mono">{r.checkedAt || "-"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => checkEndpoint(ep.path)}
                        className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        テスト
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
