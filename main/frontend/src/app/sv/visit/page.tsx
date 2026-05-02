"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { svApi, type SVStore, type SVVisit } from "@/lib/sv-api"
import { MapPin, ChevronRight, CheckCircle2, Clock } from "lucide-react"

export default function SVVisitListPage() {
  const [stores, setStores] = useState<SVStore[]>([])
  const [visits, setVisits] = useState<SVVisit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([svApi.listStores(), svApi.listVisits()])
      .then(([s, v]) => { setStores(s); setVisits(v) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-white/40">Loading...</div>

  const recent = visits.slice().sort((a, b) => b.visited_at.localeCompare(a.visited_at)).slice(0, 6)
  const planned = stores.slice().sort((a, b) => a.kpi.health_score - b.kpi.health_score).slice(0, 8)

  return (
    <div className="p-5 md:p-6 space-y-5">
      <div>
        <h1 className="text-[20px] font-bold text-white/90">訪問実行</h1>
        <p className="text-[12px] text-white/40 mt-0.5">訪問する店舗を選んで開始。チェックリスト・写真・改善発行までその場で完結</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <h2 className="text-[14px] font-semibold text-white/85">本日の訪問予定</h2>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {planned.map((s) => (
              <Link key={s.id} href={`/sv/visit/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03]">
                <MapPin className="w-4 h-4 text-white/40 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-white/85 truncate">{s.name}</div>
                  <div className="text-[10px] text-white/40 mt-0.5">前回 {s.last_visit_at || "未訪問"}・健全度 {s.kpi.health_score}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40" />
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h2 className="text-[14px] font-semibold text-white/85">最近の訪問記録</h2>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {recent.map((v) => (
              <div key={v.id} className="px-4 py-3 flex items-center gap-3">
                <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono ${v.status === "done" ? "bg-emerald-500/15 text-emerald-400" : v.status === "in_progress" ? "bg-amber-500/15 text-amber-400" : "bg-white/[0.04] text-white/50"}`}>
                  {v.status === "done" ? "完了" : v.status === "in_progress" ? "進行中" : "予定"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-white/85 truncate">{v.store_name}</div>
                  <div className="text-[10px] text-white/40 mt-0.5 truncate">{v.visited_at.slice(0, 10)}・QSC {v.qsc_score ?? "-"}・改善 {v.tasks_issued} 件発行</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
