"use client"

import { useState, useMemo } from "react"
import { ContextHeader } from "@/components/context-header"

interface AccessLog {
  id: string
  timestamp: string
  user: string
  method: string
  path: string
  result: "allow" | "deny"
  ip: string
}

const mockAccessLogs: AccessLog[] = [
  { id: "1", timestamp: "2026-04-30 14:32:10", user: "admin@aentro.jp", method: "GET", path: "/api/v1/executive/summary", result: "allow", ip: "10.0.1.12" },
  { id: "2", timestamp: "2026-04-30 14:31:55", user: "sv@aentro.jp", method: "GET", path: "/api/v1/stores/ranking", result: "allow", ip: "10.0.1.15" },
  { id: "3", timestamp: "2026-04-30 14:30:22", user: "unknown@test.jp", method: "POST", path: "/api/v1/auth/login", result: "deny", ip: "192.168.1.100" },
  { id: "4", timestamp: "2026-04-30 14:28:01", user: "manager@aentro.jp", method: "PUT", path: "/api/v1/tasks/t-001", result: "allow", ip: "10.0.1.20" },
  { id: "5", timestamp: "2026-04-30 14:25:44", user: "admin@aentro.jp", method: "DELETE", path: "/api/v1/writeback/requests/wr-003", result: "allow", ip: "10.0.1.12" },
  { id: "6", timestamp: "2026-04-30 14:20:10", user: "sv@aentro.jp", method: "GET", path: "/api/v1/sv/missions", result: "allow", ip: "10.0.1.15" },
  { id: "7", timestamp: "2026-04-30 14:18:33", user: "viewer@aentro.jp", method: "GET", path: "/api/v1/stores/ranking", result: "allow", ip: "10.0.1.30" },
  { id: "8", timestamp: "2026-04-30 14:15:02", user: "viewer@aentro.jp", method: "POST", path: "/api/v1/rbac/users/u-001/roles", result: "deny", ip: "10.0.1.30" },
  { id: "9", timestamp: "2026-04-30 14:10:50", user: "admin@aentro.jp", method: "POST", path: "/api/v1/ai/query", result: "allow", ip: "10.0.1.12" },
  { id: "10", timestamp: "2026-04-30 14:05:11", user: "manager@aentro.jp", method: "GET", path: "/api/v1/vertical/labor/shifts", result: "allow", ip: "10.0.1.20" },
]

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-blue-500/15 text-blue-400",
  POST: "bg-green-500/15 text-green-400",
  PUT: "bg-yellow-500/15 text-yellow-400",
  DELETE: "bg-red-500/15 text-red-400",
}

const PAGE_SIZE = 10

export default function AccessLogsPage() {
  const [methodFilter, setMethodFilter] = useState("all")
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    if (methodFilter === "all") return mockAccessLogs
    return mockAccessLogs.filter((l) => l.method === methodFilter)
  }, [methodFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="p-6 space-y-6">
      <ContextHeader title="アクセスログ" />

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
