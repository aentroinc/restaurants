"use client"

import { useEffect, useState, useMemo } from "react"
import { ContextHeader } from "@/components/context-header"
import { LoadingState, ErrorState, EmptyState } from "@/components/states"
import { fetchAPI } from "@/lib/api"

interface AccessLog {
  id: string
  timestamp: string
  user: string
  method: string
  path: string
  result: "allow" | "deny"
  ip: string
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-blue-500/15 text-blue-400",
  POST: "bg-green-500/15 text-green-400",
  PUT: "bg-yellow-500/15 text-yellow-400",
  DELETE: "bg-red-500/15 text-red-400",
}

const PAGE_SIZE = 10

export default function AccessLogsPage() {
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [methodFilter, setMethodFilter] = useState("all")
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchAPI<AccessLog[]>("/api/v1/audit/logs")
      .then(setLogs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (methodFilter === "all") return logs
    return logs.filter((l) => l.method === methodFilter)
  }, [methodFilter, logs])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (loading) return <div className="p-6"><ContextHeader title="アクセスログ" description="監査・操作ログの検索と export" /><LoadingState /></div>
  if (error) return <div className="p-6"><ContextHeader title="アクセスログ" description="監査・操作ログの検索と export" /><ErrorState message={error} /></div>
  if (!logs.length) return <div className="p-6"><ContextHeader title="アクセスログ" description="監査・操作ログの検索と export" /><EmptyState /></div>

  return (
    <div className="p-6 space-y-6">
      <ContextHeader title="アクセスログ" description="監査・操作ログの検索と export" />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={methodFilter}
          onChange={(e) => { setMethodFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/70 outline-none"
        >
          <option value="all">全メソッド</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      {/* Table */}
      <div className="border border-white/[0.06] rounded-xl overflow-hidden">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="text-left px-4 py-2.5 text-white/40 font-medium">日時</th>
              <th className="text-left px-4 py-2.5 text-white/40 font-medium">ユーザー</th>
              <th className="text-left px-4 py-2.5 text-white/40 font-medium">メソッド</th>
              <th className="text-left px-4 py-2.5 text-white/40 font-medium">パス</th>
              <th className="text-left px-4 py-2.5 text-white/40 font-medium">結果</th>
              <th className="text-left px-4 py-2.5 text-white/40 font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((log) => (
              <tr key={log.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="px-4 py-2 text-white/60 font-mono tabular-nums">{log.timestamp}</td>
                <td className="px-4 py-2 text-white/70">{log.user}</td>
                <td className="px-4 py-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${METHOD_COLORS[log.method] || "bg-white/10 text-white/50"}`}>
                    {log.method}
                  </span>
                </td>
                <td className="px-4 py-2 text-white/50 font-mono">{log.path}</td>
                <td className="px-4 py-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                    log.result === "allow" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                  }`}>
                    {log.result}
                  </span>
                </td>
                <td className="px-4 py-2 text-white/40 font-mono">{log.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-[11px] text-white/40">
        <span>{filtered.length}件中 {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)}件</span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded border border-white/[0.08] hover:bg-white/[0.04] disabled:opacity-30"
          >
            前へ
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 rounded border border-white/[0.08] hover:bg-white/[0.04] disabled:opacity-30"
          >
            次へ
          </button>
        </div>
      </div>
    </div>
  )
}
