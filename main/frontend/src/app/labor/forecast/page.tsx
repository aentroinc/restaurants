"use client"

import { useEffect, useMemo, useState } from "react"
import { ContextHeader } from "@/components/context-header"
import { LoadingState, ErrorState } from "@/components/states"
import {
  getForecast, getRequirements,
  type ForecastSlot, type RequirementSlot,
} from "@/lib/labor-api"
import { TrendingUp, Users, Wand2 } from "lucide-react"
import Link from "next/link"

const DEFAULT_STORE_ID = "00000000-0000-0000-0000-000000000010"
const DEFAULT_FROM = "2026-05-04"
const DEFAULT_TO = "2026-05-10"

type Mode = "customers" | "fte"

const HOURS = Array.from({ length: 13 }, (_, i) => i + 10) // 10..22

function fmtSlotKey(iso: string): { date: string; hhmm: string } {
  const d = new Date(iso)
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  return { date, hhmm }
}

function colorFor(value: number, max: number): string {
  if (max <= 0) return "rgba(255,255,255,0.04)"
  const t = Math.min(1, value / max)
  // 青→シアン→緑→黄→赤
  const stops = [
    [12, 24, 60],   // 0
    [29, 78, 216],  // 0.25 blue
    [16, 185, 129], // 0.5 emerald
    [234, 179, 8],  // 0.75 amber
    [239, 68, 68],  // 1 red
  ]
  const idx = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1)))
  const local = t * (stops.length - 1) - idx
  const a = stops[idx], b = stops[idx + 1]
  const r = Math.round(a[0] + (b[0] - a[0]) * local)
  const g = Math.round(a[1] + (b[1] - a[1]) * local)
  const bb = Math.round(a[2] + (b[2] - a[2]) * local)
  return `rgb(${r},${g},${bb})`
}

export default function LaborForecastPage() {
  const [forecast, setForecast] = useState<ForecastSlot[]>([])
  const [requirements, setRequirements] = useState<RequirementSlot[]>([])
  const [mode, setMode] = useState<Mode>("customers")
  const [from, setFrom] = useState(DEFAULT_FROM)
  const [to, setTo] = useState(DEFAULT_TO)
  const [storeId, setStoreId] = useState(DEFAULT_STORE_ID)
  const [hoverInfo, setHoverInfo] = useState<{ date: string; hhmm: string; v: number; raw: ForecastSlot | RequirementSlot } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let aborted = false
    setLoading(true); setError(null)
    Promise.all([
      getForecast(storeId, from, to),
      getRequirements(storeId, from, to),
    ])
      .then(([f, r]) => { if (!aborted) { setForecast(f); setRequirements(r) } })
      .catch((e) => !aborted && setError(e.message || "load failed"))
      .finally(() => !aborted && setLoading(false))
    return () => { aborted = true }
  }, [storeId, from, to])

  const dates = useMemo(() => {
    const set = new Set<string>()
    forecast.forEach((f) => set.add(fmtSlotKey(f.slot_start).date))
    return Array.from(set).sort()
  }, [forecast])

  const slotMap = useMemo(() => {
    const map = new Map<string, { fc: ForecastSlot | null; rq: RequirementSlot | null }>()
    forecast.forEach((f) => {
      const { date, hhmm } = fmtSlotKey(f.slot_start)
      const k = `${date}|${hhmm}`
      const cur = map.get(k) || { fc: null, rq: null }
      cur.fc = f
      map.set(k, cur)
    })
    requirements.forEach((r) => {
      const { date, hhmm } = fmtSlotKey(r.slot_start)
      const k = `${date}|${hhmm}`
      const cur = map.get(k) || { fc: null, rq: null }
      cur.rq = r
      map.set(k, cur)
    })
    return map
  }, [forecast, requirements])

  const maxVal = useMemo(() => {
    let m = 0
    if (mode === "customers") {
      forecast.forEach((f) => { if (f.predicted_customers > m) m = f.predicted_customers })
    } else {
      requirements.forEach((r) => { if (r.required_fte > m) m = r.required_fte })
    }
    return m
  }, [mode, forecast, requirements])

  const totalFTE = useMemo(() => requirements.reduce((s, r) => s + r.required_fte, 0), [requirements])
  const peakCust = useMemo(() => Math.max(0, ...forecast.map((f) => f.predicted_customers)), [forecast])
  const totalCust = useMemo(() => forecast.reduce((s, f) => s + f.predicted_customers, 0), [forecast])

  if (error) return <div className="min-h-full bg-[#0a0e14]"><ContextHeader title="需要予測ヒートマップ" description="30分slot×日次の客数/必要FTE" /><ErrorState message={error} /></div>

  return (
    <div className="min-h-full bg-[#0a0e14] text-white/80">
      <ContextHeader
        title="需要予測ヒートマップ"
        description="POS×天気×イベント×曜日で 30分slot 客数を予測 → 必要FTE を算出"
        actions={
          <Link
            href="/labor/shift-builder"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-md bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30"
          >
            <Wand2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            シフトビルダーへ
          </Link>
        }
      />

      <div className="px-5 py-5 space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[12px] text-white/60">
            店舗ID
            <input
              type="text"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-[280px] px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded text-[11px] font-mono"
            />
          </label>
          <label className="flex items-center gap-2 text-[12px] text-white/60">
            From
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded text-[11px]" />
          </label>
          <label className="flex items-center gap-2 text-[12px] text-white/60">
            To
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded text-[11px]" />
          </label>

          <div className="ml-auto inline-flex rounded-md border border-white/[0.08] overflow-hidden">
            <button
              onClick={() => setMode("customers")}
              className={`px-3 py-1.5 text-[12px] ${mode === "customers" ? "bg-blue-500/20 text-blue-300" : "text-white/50 hover:text-white/80"}`}
            >
              客数
            </button>
            <button
              onClick={() => setMode("fte")}
              className={`px-3 py-1.5 text-[12px] border-l border-white/[0.08] ${mode === "fte" ? "bg-blue-500/20 text-blue-300" : "text-white/50 hover:text-white/80"}`}
            >
              必要FTE
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "総予測客数", value: Math.round(totalCust).toLocaleString(), icon: Users, color: "text-blue-400" },
            { label: "ピーク客数/30分", value: peakCust.toFixed(1), icon: TrendingUp, color: "text-amber-400" },
            { label: "週合計FTE", value: totalFTE.toFixed(1), icon: Users, color: "text-emerald-400" },
            { label: "slot 数", value: forecast.length.toLocaleString(), icon: TrendingUp, color: "text-white/60" },
          ].map((c) => {
            const Icon = c.icon
            return (
              <div key={c.label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${c.color}`} strokeWidth={1.5} />
                  <span className="text-[10px] uppercase tracking-wider text-white/40">{c.label}</span>
                </div>
                <div className={`font-mono tabular-nums text-2xl font-semibold ${c.color}`}>{c.value}</div>
              </div>
            )
          })}
        </div>

        {/* Heatmap */}
        {loading ? <LoadingState /> : (
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 overflow-x-auto">
            <div className="text-[11px] text-white/50 mb-2">
              横: 30分slot (10:00-22:30)　縦: 日　色: {mode === "customers" ? "予測客数" : "必要FTE"}
            </div>
            <table className="text-[10px] font-mono">
              <thead>
                <tr>
                  <th className="px-1 py-1 text-left text-white/40 sticky left-0 bg-[#0a0e14]">日付</th>
                  {HOURS.flatMap((h) => [
                    <th key={`h${h}-0`} className="px-0.5 py-1 text-white/30 w-7">{h}:00</th>,
                    <th key={`h${h}-30`} className="px-0.5 py-1 text-white/20 w-7">{h}:30</th>,
                  ])}
                </tr>
              </thead>
              <tbody>
                {dates.map((date) => (
                  <tr key={date}>
                    <td className="px-1 py-1 text-white/60 sticky left-0 bg-[#0a0e14] whitespace-nowrap">{date.slice(5)}</td>
                    {HOURS.flatMap((h) =>
                      [0, 30].map((m) => {
                        const hhmm = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
                        const k = `${date}|${hhmm}`
                        const cell = slotMap.get(k)
                        const v = cell ? (mode === "customers" ? (cell.fc?.predicted_customers ?? 0) : (cell.rq?.required_fte ?? 0)) : 0
                        const c = colorFor(v, maxVal)
                        return (
                          <td
                            key={k}
                            onMouseEnter={() => cell && setHoverInfo({ date, hhmm, v, raw: (mode === "customers" ? cell.fc : cell.rq) as ForecastSlot | RequirementSlot })}
                            onMouseLeave={() => setHoverInfo(null)}
                            className="w-7 h-7 border border-[#0a0e14] cursor-pointer transition-opacity hover:opacity-80"
                            style={{ backgroundColor: c }}
                            title={`${date} ${hhmm}: ${v.toFixed(1)}`}
                          />
                        )
                      })
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Legend */}
            <div className="mt-3 flex items-center gap-2 text-[10px] text-white/40">
              <span>低</span>
              <div className="h-2 w-32 rounded" style={{
                background: "linear-gradient(to right, rgb(12,24,60), rgb(29,78,216), rgb(16,185,129), rgb(234,179,8), rgb(239,68,68))",
              }} />
              <span>高 (max {maxVal.toFixed(1)})</span>
            </div>
          </div>
        )}

        {/* Hover detail */}
        {hoverInfo && (
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 text-[12px]">
            <div className="text-blue-300 font-mono mb-1">{hoverInfo.date} {hoverInfo.hhmm}</div>
            {mode === "customers" && "predicted_customers" in hoverInfo.raw && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-white/70">
                <div>予測客数: <span className="font-mono text-white/90">{hoverInfo.raw.predicted_customers.toFixed(1)}人</span></div>
                <div>予測売上: <span className="font-mono text-white/90">¥{Math.round(hoverInfo.raw.predicted_sales).toLocaleString()}</span></div>
                <div>信頼度: <span className="font-mono text-white/90">{(hoverInfo.raw.confidence * 100).toFixed(0)}%</span></div>
                <div>天気: <span className="text-white/90">{hoverInfo.raw.factors.weather || "-"}</span></div>
                <div>イベント: <span className="text-white/90">{hoverInfo.raw.factors.event || "-"}</span></div>
                <div>曜日: <span className="font-mono text-white/90">DOW={hoverInfo.raw.factors.dow}</span></div>
              </div>
            )}
            {mode === "fte" && "required_fte" in hoverInfo.raw && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-white/70">
                <div>必要FTE: <span className="font-mono text-white/90">{hoverInfo.raw.required_fte.toFixed(1)}人</span></div>
                <div>時給目安: <span className="font-mono text-white/90">¥{hoverInfo.raw.hourly_wage_yen}</span></div>
                {Object.entries(hoverInfo.raw.role_split).map(([role, v]) => (
                  <div key={role}>{role}: <span className="font-mono text-white/90">{v.toFixed(2)}</span></div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
