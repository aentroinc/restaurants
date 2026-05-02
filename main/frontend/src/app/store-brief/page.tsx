"use client"

import { useEffect, useState } from "react"
import { ContextHeader } from "@/components/context-header"
import { CheckCircle2, AlertCircle, TrendingUp, Calendar } from "lucide-react"

interface Brief {
  store_name: string
  store_id: string
  business_date: string
  today_kpis: Array<{ name: string; value: string; trend: string; positive: boolean }>
  this_week_actions: Array<{ id: string; title: string; priority: string; from: string; due_date: string }>
  yoy_comparison: { sales_yoy: string; customer_count_yoy: string; avg_ticket_yoy: string }
  weekly_action_completion: { total: number; completed: number; rate: number }
}

export default function StoreBriefPage() {
  const [brief, setBrief] = useState<Brief | null>(null)

  useEffect(() => {
    import("@/lib/mock-data").then((m) => setBrief(m.mockStoreManagerBrief))
  }, [])

  if (!brief) return <div className="p-8 text-white/40">Loading...</div>

  return (
    <div className="flex flex-col h-screen">
      <ContextHeader title={`店長ブリーフ — ${brief.store_name}`} description={`${brief.business_date}・今日と今週の重点`} region="-" />
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Today KPIs */}
        <div>
          <h3 className="text-[12px] font-semibold text-white/60 tracking-wide uppercase mb-3">今日の重点</h3>
          <div className="grid grid-cols-4 gap-3">
            {brief.today_kpis.map((k) => (
              <div key={k.name} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="text-[11px] text-white/50">{k.name}</div>
                <div className="mt-1 text-2xl font-mono text-white/90">{k.value}</div>
                <div className={`mt-1 text-[11px] flex items-center gap-1 ${k.positive ? "text-emerald-400" : "text-amber-400"}`}>
                  {k.positive ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {k.trend}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action progress */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[12px] font-semibold text-white/60 tracking-wide uppercase">今週のアクション</h3>
            <span className="text-[12px] text-white/55">
              {brief.weekly_action_completion.completed}/{brief.weekly_action_completion.total} 完了 ({Math.round(brief.weekly_action_completion.rate * 100)}%)
            </span>
          </div>
          <div className="space-y-2.5">
            {brief.this_week_actions.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded bg-white/[0.02]">
                <input type="checkbox" className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-white/85">{a.title}</div>
                  <div className="text-[10px] text-white/40 mt-0.5 flex items-center gap-2">
                    <span>from: {a.from}</span>
                    <Calendar className="w-2.5 h-2.5" /> {a.due_date}
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded ${a.priority === "high" ? "bg-red-500/10 text-red-400" : a.priority === "medium" ? "bg-amber-500/10 text-amber-400" : "bg-white/[0.04] text-white/40"}`}>
                  {a.priority}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* YoY */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
          <h3 className="text-[12px] font-semibold text-white/60 tracking-wide uppercase mb-3 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" /> 前年比
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded bg-white/[0.03] p-3">
              <div className="text-[10px] text-white/40">売上</div>
              <div className="mt-1 text-[18px] font-mono font-semibold text-emerald-400">{brief.yoy_comparison.sales_yoy}</div>
            </div>
            <div className="rounded bg-white/[0.03] p-3">
              <div className="text-[10px] text-white/40">客数</div>
              <div className="mt-1 text-[18px] font-mono font-semibold text-amber-400">{brief.yoy_comparison.customer_count_yoy}</div>
            </div>
            <div className="rounded bg-white/[0.03] p-3">
              <div className="text-[10px] text-white/40">客単価</div>
              <div className="mt-1 text-[18px] font-mono font-semibold text-emerald-400">{brief.yoy_comparison.avg_ticket_yoy}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
