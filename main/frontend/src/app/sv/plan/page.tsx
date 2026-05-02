"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { svApi, type SVStore } from "@/lib/sv-api"
import { RouteOptimizer } from "@/components/sv/RouteOptimizer"
import { StoreHeatmap } from "@/components/sv/StoreHeatmap"
import { Calendar, MapPin, ChevronRight, Plus, Check } from "lucide-react"

const TOKYO = { lat: 35.681, lon: 139.767, label: "東京駅 (現在地)" }

function recommendedDate(lastVisit: string | null, healthScore: number): { recommended: string; daysFromNow: number } {
  const target = healthScore < 60 ? 3 : healthScore < 70 ? 7 : healthScore < 80 ? 14 : 21
  const base = lastVisit ? new Date(lastVisit) : new Date(Date.now() - target * 86400_000)
  const rec = new Date(base.getTime() + target * 86400_000)
  const days = Math.round((rec.getTime() - Date.now()) / 86400_000)
  return { recommended: rec.toISOString().slice(0, 10), daysFromNow: days }
}

export default function SVPlanPage() {
  const [stores, setStores] = useState<SVStore[]>([])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [schedule, setSchedule] = useState<Record<string, { date: string; time: string }>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    svApi.listStores().then((s) => {
      setStores(s)
      // auto-pick worst 5 by default
      setPicked(new Set([...s].sort((a, b) => a.kpi.health_score - b.kpi.health_score).slice(0, 5).map((x) => x.id)))
    }).finally(() => setLoading(false))
  }, [])

  const ranked = useMemo(() => [...stores].sort((a, b) => a.kpi.health_score - b.kpi.health_score), [stores])
  const pickedStores = useMemo(() => stores.filter((s) => picked.has(s.id)), [stores, picked])

  function togglePick(id: string) {
    const next = new Set(picked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setPicked(next)
  }

  function setSched(id: string, patch: Partial<{ date: string; time: string }>) {
    setSchedule({ ...schedule, [id]: { date: patch.date ?? schedule[id]?.date ?? "", time: patch.time ?? schedule[id]?.time ?? "" } })
  }

  if (loading) return <div className="p-8 text-white/40">Loading...</div>

  return (
    <div className="p-5 md:p-6 space-y-5">
      <div>
        <h1 className="text-[20px] font-bold text-white/90">訪問計画</h1>
        <p className="text-[12px] text-white/40 mt-0.5">今週訪問する店舗を選択し、最短ルート・スケジュールを確定</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map */}
        <div className="lg:col-span-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-semibold text-white/85">担当エリアマップ</h2>
            <span className="text-[11px] text-white/40">選択中 {picked.size} 店</span>
          </div>
          <StoreHeatmap stores={pickedStores.length ? pickedStores : stores} height={360} />
        </div>

        {/* Route */}
        <div>
          {pickedStores.length > 0 ? (
            <RouteOptimizer start={TOKYO} stops={pickedStores} />
          ) : (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-[12px] text-white/40">
              訪問する店舗を選択するとルートが表示されます
            </div>
          )}
        </div>
      </div>

      {/* Store list with recommended dates */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-white/85">店舗候補（推奨訪問日）</h2>
          <span className="text-[11px] text-white/40">健全度の低い順</span>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {ranked.map((s) => {
            const rec = recommendedDate(s.last_visit_at, s.kpi.health_score)
            const isPicked = picked.has(s.id)
            const sch = schedule[s.id] || { date: rec.recommended, time: "10:00" }
            return (
              <div key={s.id} className={`px-4 py-3 flex flex-wrap items-center gap-3 ${isPicked ? "bg-blue-500/[0.04]" : ""}`}>
                <button
                  onClick={() => togglePick(s.id)}
                  className={`shrink-0 w-7 h-7 rounded border-2 flex items-center justify-center transition ${isPicked ? "bg-blue-500 border-blue-500" : "border-white/20 hover:border-white/40"}`}
                >
                  {isPicked && <Check className="w-4 h-4 text-white" />}
                </button>
                <span className={`shrink-0 w-2 h-2 rounded-full ${s.kpi.health_score < 60 ? "bg-red-500" : s.kpi.health_score < 70 ? "bg-amber-500" : "bg-blue-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-white/85 truncate">{s.name}</div>
                  <div className="text-[10px] text-white/40 mt-0.5 flex flex-wrap gap-2">
                    <span>健全度 {s.kpi.health_score}</span>
                    <span>前回 {s.last_visit_at || "未訪問"}</span>
                    <span className={rec.daysFromNow < 0 ? "text-red-400" : "text-emerald-400/80"}>
                      推奨 {rec.recommended} ({rec.daysFromNow >= 0 ? `+${rec.daysFromNow}` : rec.daysFromNow}日)
                    </span>
                  </div>
                </div>
                {isPicked && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={sch.date}
                      onChange={(e) => setSched(s.id, { date: e.target.value })}
                      className="px-2 py-1 rounded bg-black/30 border border-white/[0.06] text-[11px] text-white/80"
                    />
                    <input
                      type="time"
                      value={sch.time}
                      onChange={(e) => setSched(s.id, { time: e.target.value })}
                      className="px-2 py-1 rounded bg-black/30 border border-white/[0.06] text-[11px] text-white/80 w-24"
                    />
                  </div>
                )}
                <Link
                  href={`/sv/visit/${s.id}`}
                  className="shrink-0 px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-[11px] text-white/70 flex items-center gap-1"
                >
                  訪問 <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
