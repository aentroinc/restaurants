"use client"

import { useEffect, useState } from "react"
import { svApi, type AreaKPISnapshot } from "@/lib/sv-api"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { TrendingUp, TrendingDown, Trophy } from "lucide-react"
import { formatCurrencyCompact, formatPercent } from "@/lib/utils"

export default function SVKpiPage() {
  const [snap, setSnap] = useState<AreaKPISnapshot | null>(null)

  useEffect(() => {
    svApi.getAreaKPI().then(setSnap)
  }, [])

  if (!snap) return <div className="p-8 text-white/40">Loading...</div>

  const ranked = [...snap.store_ranking].sort((a, b) => b.health_score - a.health_score)

  return (
    <div className="p-5 md:p-6 space-y-5">
      <div>
        <h1 className="text-[20px] font-bold text-white/90">エリアKPI</h1>
        <p className="text-[12px] text-white/40 mt-0.5">{snap.area_name}・売上・人件費・QSC・レビュー</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="エリア合計売上" value={formatCurrencyCompact(snap.total_sales)} trend={snap.sales_yoy} unit="" />
        <KPICard label="平均人件費率" value={formatPercent(snap.avg_labor_cost_rate)} trend={-0.6} unit="" inverse />
        <KPICard label="平均 QSC スコア" value={snap.avg_qsc_score.toFixed(1)} trend={1.4} unit="点" />
        <KPICard label="平均レビュースコア" value={snap.avg_review_score.toFixed(2)} trend={0.1} unit="/5" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
          <h2 className="text-[14px] font-semibold text-white/85 mb-3">月次売上推移</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={snap.monthly_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={11} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
              <Tooltip contentStyle={{ background: "#0c1017", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11 }} />
              <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
          <h2 className="text-[14px] font-semibold text-white/85 mb-3">QSC × 人件費率推移</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={snap.monthly_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={11} />
              <YAxis yAxisId="left" stroke="rgba(255,255,255,0.4)" fontSize={11} />
              <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.4)" fontSize={11} />
              <Tooltip contentStyle={{ background: "#0c1017", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11 }} />
              <Line yAxisId="left" type="monotone" dataKey="qsc" name="QSC" stroke="#10b981" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="labor_cost_rate" name="人件費率" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <h2 className="text-[14px] font-semibold text-white/85 mb-3 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />店舗ランキング (健全度)
        </h2>
        <ResponsiveContainer width="100%" height={Math.max(220, ranked.length * 28)}>
          <BarChart data={ranked} layout="vertical" margin={{ left: 80 }}>
            <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={11} domain={[0, 100]} />
            <YAxis dataKey="store_name" type="category" stroke="rgba(255,255,255,0.6)" fontSize={10} width={140} />
            <Tooltip contentStyle={{ background: "#0c1017", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11 }} />
            <Bar dataKey="health_score" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function KPICard({ label, value, trend, unit, inverse }: { label: string; value: string; trend: number; unit: string; inverse?: boolean }) {
  const positive = inverse ? trend < 0 : trend > 0
  const Trend = positive ? TrendingUp : TrendingDown
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="text-[10px] text-white/50 uppercase mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-mono font-bold text-white/90">{value}</span>
        <span className="text-[12px] text-white/50">{unit}</span>
      </div>
      <div className={`mt-1 flex items-center gap-1 text-[11px] ${positive ? "text-emerald-400" : "text-red-400"}`}>
        <Trend className="w-3 h-3" />
        <span className="font-mono">{trend > 0 ? "+" : ""}{trend.toFixed(1)}%</span>
        <span className="text-white/40">前月比</span>
      </div>
    </div>
  )
}
