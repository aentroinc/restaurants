"use client"

import { useMemo } from "react"
import type { SVStore } from "@/lib/sv-api"

interface Props {
  start: { lat: number; lon: number; label?: string }
  stops: SVStore[]
}

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lon - a.lon) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

/**
 * Greedy nearest-neighbor TSP. Good enough for ~10-30 store SV routes.
 */
export function greedyRoute(start: { lat: number; lon: number }, stops: SVStore[]): { ordered: SVStore[]; totalKm: number } {
  const remaining = [...stops]
  const ordered: SVStore[] = []
  let cur = { lat: start.lat, lon: start.lon }
  let total = 0
  while (remaining.length > 0) {
    let bestIdx = 0
    let bestDist = haversineKm(cur, remaining[0])
    for (let i = 1; i < remaining.length; i++) {
      const d = haversineKm(cur, remaining[i])
      if (d < bestDist) { bestIdx = i; bestDist = d }
    }
    const next = remaining.splice(bestIdx, 1)[0]
    ordered.push(next)
    total += bestDist
    cur = { lat: next.lat, lon: next.lon }
  }
  return { ordered, totalKm: total }
}

export function RouteOptimizer({ start, stops }: Props) {
  const { ordered, totalKm } = useMemo(() => greedyRoute(start, stops), [start, stops])

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[11px] text-white/40 uppercase tracking-wider">最適ルート (Greedy TSP)</div>
          <div className="text-[13px] text-white/70 mt-0.5">{start.label || "現在地"} 起点・{ordered.length} 店舗</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-white/40 uppercase">推定総距離</div>
          <div className="text-xl font-mono font-bold text-emerald-400">{totalKm.toFixed(1)} km</div>
        </div>
      </div>
      <ol className="space-y-1.5">
        {ordered.map((s, i) => {
          const prev = i === 0 ? start : { lat: ordered[i - 1].lat, lon: ordered[i - 1].lon }
          const leg = haversineKm(prev, s)
          return (
            <li key={s.id} className="flex items-center gap-3 text-[13px]">
              <span className="shrink-0 w-7 h-7 rounded-full bg-blue-500/15 text-blue-400 flex items-center justify-center font-mono text-xs">{i + 1}</span>
              <span className="flex-1 text-white/80 truncate">{s.name}</span>
              <span className="text-[10px] text-white/40 font-mono">+{leg.toFixed(1)}km</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${s.kpi.health_score < 60 ? "bg-red-500/15 text-red-400" : s.kpi.health_score < 70 ? "bg-amber-500/15 text-amber-400" : "bg-white/[0.04] text-white/50"}`}>
                {s.kpi.health_score}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
