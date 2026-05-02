"use client"

import { useMemo } from "react"
import type { SVStore } from "@/lib/sv-api"

interface Props {
  stores: SVStore[]
  selectedId?: string | null
  onSelect?: (storeId: string) => void
  height?: number
}

/**
 * Lightweight SVG heatmap. Plots each store at its (lat, lon) coordinates
 * normalized into the canvas, with the dot color reflecting health_score.
 * No leaflet dependency required — keeps the PWA fast on tablets.
 */
export function StoreHeatmap({ stores, selectedId, onSelect, height = 360 }: Props) {
  const { points, bounds } = useMemo(() => {
    if (stores.length === 0) {
      return { points: [], bounds: { minLat: 0, maxLat: 1, minLon: 0, maxLon: 1 } }
    }
    const lats = stores.map((s) => s.lat)
    const lons = stores.map((s) => s.lon)
    const minLat = Math.min(...lats), maxLat = Math.max(...lats)
    const minLon = Math.min(...lons), maxLon = Math.max(...lons)
    const padLat = (maxLat - minLat || 0.01) * 0.1
    const padLon = (maxLon - minLon || 0.01) * 0.1
    const b = { minLat: minLat - padLat, maxLat: maxLat + padLat, minLon: minLon - padLon, maxLon: maxLon + padLon }
    const pts = stores.map((s) => ({
      id: s.id,
      name: s.name,
      x: (s.lon - b.minLon) / (b.maxLon - b.minLon),
      y: 1 - (s.lat - b.minLat) / (b.maxLat - b.minLat),
      health: s.kpi.health_score,
    }))
    return { points: pts, bounds: b }
  }, [stores])

  function color(health: number) {
    if (health < 55) return "#ef4444"
    if (health < 70) return "#f59e0b"
    if (health < 80) return "#3b82f6"
    return "#10b981"
  }

  return (
    <div className="relative w-full rounded-lg border border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-white/[0.01] overflow-hidden" style={{ height }}>
      {/* grid backdrop */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <pattern id="sv-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#sv-grid)" />
      </svg>

      {/* heatmap blobs */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {points.map((p) => (
          <circle key={`blob-${p.id}`} cx={p.x * 100} cy={p.y * 100} r={p.health < 60 ? 8 : 5} fill={color(p.health)} fillOpacity={0.18} />
        ))}
      </svg>

      {/* dots */}
      <div className="absolute inset-0">
        {points.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect?.(p.id)}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
            title={`${p.name} (健全度 ${p.health})`}
          >
            <span
              className={`block rounded-full ring-2 transition-all ${selectedId === p.id ? "ring-white" : "ring-white/20"} ${p.health < 60 ? "h-4 w-4 animate-pulse" : "h-3 w-3"}`}
              style={{ backgroundColor: color(p.health) }}
            />
            <span className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 -top-7 whitespace-nowrap px-2 py-0.5 rounded bg-black/80 text-[10px] text-white">
              {p.name}
            </span>
          </button>
        ))}
      </div>

      {/* legend */}
      <div className="absolute bottom-2 right-2 flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/40 text-[10px] text-white/70">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />要注意</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />注意</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />標準</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />良好</span>
      </div>

      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/40 text-[10px] text-white/50">
        {bounds.minLat.toFixed(3)}–{bounds.maxLat.toFixed(3)}°N / {bounds.minLon.toFixed(3)}–{bounds.maxLon.toFixed(3)}°E
      </div>
    </div>
  )
}
