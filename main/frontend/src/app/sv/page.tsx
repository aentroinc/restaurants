"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { svApi, type SVStore } from "@/lib/sv-api"
import { StoreHeatmap } from "@/components/sv/StoreHeatmap"
import { AlertTriangle, TrendingDown, Calendar, Store as StoreIcon, ChevronRight } from "lucide-react"
import { formatCurrencyCompact, formatPercent } from "@/lib/utils"

export default function SVDashboardPage() {
  const [stores, setStores] = useState<SVStore[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    svApi.listStores().then(setStores).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-white/40">Loading...</div>

  const sorted = [...stores].sort((a, b) => a.kpi.health_score - b.kpi.health_score)
  const top3Critical = sorted.slice(0, 3)
  const totalStores = stores.length
  const criticalCount = stores.filter((s) => s.kpi.health_score < 60).length
  const avgHealth = stores.reduce((sum, s) => sum + s.kpi.health_score, 0) / (stores.length || 1)
  const totalSales = stores.reduce((sum, s) => sum + s.kpi.net_sales, 0)

  // weekly visit progress (mock derive: completed = visited within 7 days)
  const visited7d = stores.filter((s) => s.last_visit_at && (Date.now() - new Date(s.last_visit_at).getTime()) < 7 * 86400_000).length
  const weeklyTarget = Math.min(stores.length, 12)

  const selected = stores.find((s) => s.id === selectedId)

  return (
    <div className="p-5 md:p-6 space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-[20px] font-bold text-white/90">エリアダッシュボード</h1>
          <p className="text-[12px] text-white/40 mt-0.5">担当 {totalStores} 店舗・ヘルススコアと訪問計画の俯瞰</p>
        </div>
        <Link href="/sv/plan" className="px-3 py-1.5 rounded-md bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-[12px] font-semibold flex items-center gap-1.5">
          訪問計画へ <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="担当店舗" value={`${totalStores}`} unit="店" icon={StoreIcon} />
        <Stat label="要注意店舗" value={`${criticalCount}`} unit="店" icon={AlertTriangle} tone="red" />
        <Stat label="平均ヘルススコア" value={avgHealth.toFixed(1)} unit="" icon={TrendingDown} tone={avgHealth < 65 ? "amber" : "emerald"} />
        <Stat label="エリア合計売上" value={formatCurrencyCompact(totalSales)} unit="" icon={Calendar} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Heatmap */}
        <div className="lg:col-span-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-semibold text-white/85">担当店舗マップ・ヘルスヒート</h2>
            <span className="text-[11px] text-white/40">{stores.length} 拠点</span>
          </div>
          <StoreHeatmap stores={stores} selectedId={selectedId} onSelect={setSelectedId} height={400} />
          {selected && (
            <div className="mt-3 px-3 py-2 rounded bg-black/30 border border-white/[0.06] flex items-center gap-3">
              <Link href={`/sv/visit/${selected.id}`} className="flex-1 min-w-0 text-[13px] text-blue-400 hover:underline truncate">
                {selected.name}
              </Link>
              <span className="text-[11px] text-white/50">健全度 {selected.kpi.health_score}</span>
              <span className="text-[11px] text-white/50">FL {formatPercent(selected.kpi.fl_ratio)}</span>
              <Link href={`/sv/visit/${selected.id}`} className="text-[11px] px-2 py-1 rounded bg-blue-500/15 text-blue-400 hover:bg-blue-500/25">訪問する</Link>
            </div>
          )}
        </div>

        {/* Side: top3 + plan progress */}
        <div className="space-y-4">
          <div className="rounded-lg border border-red-400/20 bg-red-500/[0.04] p-4">
            <h3 className="text-[12px] font-semibold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />要注意 TOP 3
            </h3>
            <div className="space-y-2">
              {top3Critical.map((s, i) => (
                <Link key={s.id} href={`/sv/visit/${s.id}`} className="block rounded p-2 -mx-1 hover:bg-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-[11px] font-bold">{i + 1}</span>
                    <span className="flex-1 min-w-0 text-[13px] text-white/85 truncate">{s.name}</span>
                    <span className="text-[11px] font-mono text-red-400">{s.kpi.health_score}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1 ml-8">
                    {s.kpi.issue_types.slice(0, 3).map((iss) => (
                      <span key={iss} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-300">{iss}</span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <h3 className="text-[12px] font-semibold text-white/70 uppercase tracking-wider mb-3">今週の訪問進捗</h3>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-mono font-bold text-emerald-400">{visited7d}</span>
              <span className="text-[12px] text-white/50 mb-1">/ {weeklyTarget} 店</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-400 to-emerald-400" style={{ width: `${Math.min(100, (visited7d / weeklyTarget) * 100)}%` }} />
            </div>
            <p className="mt-2 text-[11px] text-white/40">過去7日に訪問完了した店舗数</p>
          </div>
        </div>
      </div>

      {/* All stores quick table */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-white/85">担当店舗一覧</h2>
          <span className="text-[11px] text-white/40">{stores.length} 店舗</span>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {sorted.map((s) => (
            <Link key={s.id} href={`/sv/visit/${s.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03]">
              <span className={`shrink-0 w-2 h-2 rounded-full ${s.kpi.health_score < 60 ? "bg-red-500" : s.kpi.health_score < 70 ? "bg-amber-500" : s.kpi.health_score < 80 ? "bg-blue-500" : "bg-emerald-500"}`} />
              <span className="flex-1 min-w-0 text-[13px] text-white/85 truncate">{s.name}</span>
              <span className="text-[11px] text-white/40 font-mono w-16 text-right">{formatCurrencyCompact(s.kpi.net_sales)}</span>
              <span className="text-[11px] text-white/40 font-mono w-12 text-right">FL {formatPercent(s.kpi.fl_ratio)}</span>
              <span className="text-[11px] font-mono w-10 text-right">{s.kpi.health_score}</span>
              <span className="text-[10px] text-white/30 w-20 text-right hidden md:inline">{s.last_visit_at ? `前回 ${s.last_visit_at}` : "未訪問"}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, unit, icon: Icon, tone = "default" }: { label: string; value: string; unit: string; icon: any; tone?: "default" | "red" | "amber" | "emerald" }) {
  const cls = tone === "red" ? "text-red-400 border-red-400/20 bg-red-500/[0.04]"
    : tone === "amber" ? "text-amber-400 border-amber-400/20 bg-amber-500/[0.04]"
    : tone === "emerald" ? "text-emerald-400 border-emerald-400/20 bg-emerald-500/[0.04]"
    : "text-white/85 border-white/[0.06] bg-white/[0.02]"
  return (
    <div className={`rounded-lg border p-4 ${cls}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider opacity-70">{label}</span>
        <Icon className="w-3.5 h-3.5 opacity-60" />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-mono font-bold">{value}</span>
        {unit && <span className="text-[12px] opacity-60">{unit}</span>}
      </div>
    </div>
  )
}
