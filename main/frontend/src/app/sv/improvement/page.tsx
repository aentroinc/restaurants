"use client"

import { useEffect, useMemo, useState } from "react"
import { svApi, type ImprovementTask } from "@/lib/sv-api"
import { CheckCircle2, AlertTriangle, Clock, Filter } from "lucide-react"

export default function SVImprovementPage() {
  const [tasks, setTasks] = useState<ImprovementTask[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "open" | "in_progress" | "overdue" | "done">("all")

  useEffect(() => {
    svApi.listImprovementTasks().then(setTasks).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => filter === "all" ? tasks : tasks.filter((t) => t.status === filter), [tasks, filter])
  const stats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((t) => t.status === "done").length
    const overdue = tasks.filter((t) => t.status === "overdue").length
    const inProgress = tasks.filter((t) => t.status === "in_progress").length
    return { total, done, overdue, inProgress, completionRate: total > 0 ? done / total : 0 }
  }, [tasks])

  if (loading) return <div className="p-8 text-white/40">Loading...</div>

  return (
    <div className="p-5 md:p-6 space-y-5">
      <div>
        <h1 className="text-[20px] font-bold text-white/90">改善宿題</h1>
        <p className="text-[12px] text-white/40 mt-0.5">あなたが訪問時に発行した改善タスクの進捗</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="総タスク" value={`${stats.total}`} icon={CheckCircle2} />
        <Card label="完了" value={`${stats.done}`} icon={CheckCircle2} tone="emerald" />
        <Card label="進行中" value={`${stats.inProgress}`} icon={Clock} tone="blue" />
        <Card label="期日超過" value={`${stats.overdue}`} icon={AlertTriangle} tone="red" />
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] text-white/60">完了率</span>
          <span className="text-[14px] font-mono font-bold text-emerald-400">{(stats.completionRate * 100).toFixed(1)}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-400 to-emerald-400" style={{ width: `${stats.completionRate * 100}%` }} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-white/40" />
        {(["all", "open", "in_progress", "overdue", "done"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${filter === k ? "bg-white/[0.1] text-white" : "bg-white/[0.04] text-white/55 hover:bg-white/[0.06]"}`}
          >
            {k === "all" ? "全て" : k === "open" ? "未着手" : k === "in_progress" ? "進行中" : k === "overdue" ? "期日超過" : "完了"}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
        <div className="divide-y divide-white/[0.04]">
          {filtered.map((t) => (
            <div key={t.id} className="px-4 py-3 flex items-center gap-3 flex-wrap">
              <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-mono ${
                t.status === "done" ? "bg-emerald-500/15 text-emerald-400"
                : t.status === "overdue" ? "bg-red-500/15 text-red-400"
                : t.status === "in_progress" ? "bg-blue-500/15 text-blue-400"
                : "bg-white/[0.04] text-white/60"
              }`}>
                {t.status === "done" ? "完了" : t.status === "overdue" ? "超過" : t.status === "in_progress" ? "進行中" : "未着手"}
              </span>
              <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] ${t.priority === "high" ? "bg-red-500/10 text-red-400" : t.priority === "medium" ? "bg-amber-500/10 text-amber-400" : "bg-white/[0.04] text-white/50"}`}>
                {t.priority === "high" ? "高" : t.priority === "medium" ? "中" : "低"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-white/85 truncate">{t.title}</div>
                <div className="text-[10px] text-white/40 mt-0.5 flex flex-wrap gap-2">
                  <span>{t.store_name}</span>
                  <span>発行 {t.issued_at}</span>
                  <span className={t.status === "overdue" ? "text-red-400" : ""}>期日 {t.due_date}</span>
                </div>
              </div>
              <div className="w-32 shrink-0">
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className={`h-full ${t.progress_pct === 100 ? "bg-emerald-400" : "bg-blue-400"}`} style={{ width: `${t.progress_pct}%` }} />
                </div>
                <span className="text-[10px] text-white/40 font-mono">{t.progress_pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Card({ label, value, icon: Icon, tone = "default" }: { label: string; value: string; icon: any; tone?: "default" | "emerald" | "blue" | "red" }) {
  const cls = tone === "emerald" ? "border-emerald-400/20 bg-emerald-500/[0.04] text-emerald-400"
    : tone === "blue" ? "border-blue-400/20 bg-blue-500/[0.04] text-blue-400"
    : tone === "red" ? "border-red-400/20 bg-red-500/[0.04] text-red-400"
    : "border-white/[0.06] bg-white/[0.02] text-white/85"
  return (
    <div className={`rounded-lg border p-4 ${cls}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider opacity-70">{label}</span>
        <Icon className="w-3.5 h-3.5 opacity-60" />
      </div>
      <span className="text-2xl font-mono font-bold">{value}</span>
    </div>
  )
}
