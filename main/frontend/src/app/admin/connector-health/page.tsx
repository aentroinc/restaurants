"use client"

import { useEffect, useState } from "react"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import { CheckCircle2, AlertTriangle, XCircle, Clock, Database, RefreshCw } from "lucide-react"

interface Health {
  data_source_id: string
  name: string
  source_type: string
  status: string
  health_score: number
  health_badge: "good" | "warning" | "critical"
  last_sync_at: string | null
  freshness_hours: number | null
  recent_failures_7d: number
  last_error: string | null
}

const BADGE_STYLE = {
  good: "bg-emerald-500/15 text-emerald-400 border-emerald-400/30",
  warning: "bg-amber-500/15 text-amber-400 border-amber-400/30",
  critical: "bg-red-500/15 text-red-400 border-red-400/30",
}

const BADGE_ICON = {
  good: CheckCircle2,
  warning: AlertTriangle,
  critical: XCircle,
}

export default function ConnectorHealthPage() {
  const [items, setItems] = useState<Health[]>([])

  useEffect(() => {
    fetchAPI<{ data: Health[] } | Health[]>("/api/v1/connector-health").then((d) => {
      const arr = Array.isArray(d) ? d : (d as any).data
      setItems(arr || [])
    }).catch(() => {})
  }, [])

  const total = items.length
  const good = items.filter((i) => i.health_badge === "good").length
  const warn = items.filter((i) => i.health_badge === "warning").length
  const crit = items.filter((i) => i.health_badge === "critical").length

  return (
    <div className="flex flex-col h-screen">
      <ContextHeader title="Connector Health" description="データ取り込みの健全性監視" region="-" />
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[10px] text-white/40 uppercase">接続数</div>
            <div className="mt-1 text-2xl font-mono text-white/85">{total}</div>
          </div>
          <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/[0.06] p-4">
            <div className="text-[10px] text-emerald-400/70 uppercase">正常</div>
            <div className="mt-1 text-2xl font-mono text-emerald-400">{good}</div>
          </div>
          <div className="rounded-lg border border-amber-400/20 bg-amber-500/[0.06] p-4">
            <div className="text-[10px] text-amber-400/70 uppercase">警告</div>
            <div className="mt-1 text-2xl font-mono text-amber-400">{warn}</div>
          </div>
          <div className="rounded-lg border border-red-400/20 bg-red-500/[0.06] p-4">
            <div className="text-[10px] text-red-400/70 uppercase">致命的</div>
            <div className="mt-1 text-2xl font-mono text-red-400">{crit}</div>
          </div>
        </div>

        <div className="space-y-3">
          {items.map((it) => {
            const Icon = BADGE_ICON[it.health_badge]
            return (
              <div key={it.data_source_id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="flex items-start gap-4">
                  <Database className="w-5 h-5 text-white/40 shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-[14px] font-medium text-white/85">{it.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-white/50 font-mono">{it.source_type}</span>
                      <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border ${BADGE_STYLE[it.health_badge]}`}>
                        <Icon className="w-3 h-3" /> {it.health_score}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-4 text-[11px] text-white/55">
                      <div>
                        <div className="text-white/35 text-[10px] uppercase tracking-wider">最終同期</div>
                        <div className="mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {it.freshness_hours !== null ? `${it.freshness_hours.toFixed(1)} 時間前` : "未同期"}
                        </div>
                      </div>
                      <div>
                        <div className="text-white/35 text-[10px] uppercase tracking-wider">直近7日失敗</div>
                        <div className="mt-0.5 font-mono">{it.recent_failures_7d}</div>
                      </div>
                      <div>
                        <div className="text-white/35 text-[10px] uppercase tracking-wider">ステータス</div>
                        <div className="mt-0.5">{it.status}</div>
                      </div>
                    </div>
                    {it.last_error && (
                      <div className="mt-3 text-[11px] text-red-400/80 bg-red-500/[0.05] border border-red-400/20 rounded px-3 py-2">
                        Error: {it.last_error}
                      </div>
                    )}
                  </div>
                  <button className="text-[11px] flex items-center gap-1 px-3 py-1.5 rounded bg-white/[0.04] hover:bg-blue-500/15 hover:text-blue-400 text-white/55">
                    <RefreshCw className="w-3 h-3" /> 今すぐ同期
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
