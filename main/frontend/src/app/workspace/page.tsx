"use client"

import React, { useEffect, useState, useCallback } from "react"
import { ContextHeader } from "@/components/context-header"
import { LoadingState, ErrorState, EmptyState } from "@/components/states"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fetchAPI } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import type { Analysis, CustomKPIDef, CohortDef, PanelSpec, SavedQuery } from "@/lib/types"
import {
  Plus, Eye, ArrowLeft, Download, Paperclip, ArrowUpRight, CheckCircle2,
  BarChart3, Table2, Hash, ScatterChart, TrendingUp, PieChart as PieChartIcon,
  Grid3X3, ArrowDownUp, Layers, Search, X, Save,
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart as RechartsScatter, Scatter, ZAxis,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts"

const visibilityBadge: Record<string, string> = {
  private: "text-white/50 bg-white/[0.06]",
  team: "text-blue-400 bg-blue-400/10",
  public: "text-emerald-400 bg-emerald-400/10",
}

const statusBadge: Record<string, string> = {
  active: "text-emerald-400 bg-emerald-400/10",
  draft: "text-amber-400 bg-amber-400/10",
  archived: "text-white/40 bg-white/[0.06]",
  promoted: "text-purple-400 bg-purple-400/10",
}

const brands = ["すき家", "はま寿司", "ココス", "なか卯", "ジョリーパスタ"]
const regions = ["関東", "関西", "中部", "九州", "東北"]
const kpiOptions = [
  { value: "net_sales", label: "売上高" },
  { value: "cogs_rate", label: "原価率" },
  { value: "labor_cost_rate", label: "人件費率" },
  { value: "fl_ratio", label: "FL比率" },
  { value: "health_score", label: "健全度スコア" },
  { value: "avg_ticket", label: "客単価" },
  { value: "operating_profit_rate", label: "営業利益率" },
  { value: "gross_profit_rate", label: "粗利率" },
  { value: "sales_per_labor_hour", label: "人時売上高" },
  { value: "improvement_opportunity", label: "改善機会額" },
]

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"]
const TOOLTIP_STYLE = { background: "#0c1017", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }

const DAYS = ["月", "火", "水", "木", "金", "土", "日"]
const STORES_SHORT = ["品川", "渋谷", "新宿", "池袋", "横浜", "大宮", "千葉", "船橋"]

// ── Mock data generators ──

function generateBarData(kpi: string, groupBy?: string) {
  const groups = groupBy === "region" ? regions : groupBy === "month" ? ["1月", "2月", "3月", "4月"] : brands
  return groups.map((g, i) => ({
    name: g,
    value: kpi === "net_sales" ? 2500000 + i * 300000 : kpi === "avg_ticket" ? 650 + i * 50 : 25 + i * 3,
  }))
}

function generatePivotData(kpi: string) {
  const months = ["2026-01", "2026-02", "2026-03", "2026-04"]
  return { headers: ["ブランド", ...months], rows: brands.map((b, bi) => [b, ...months.map((_, mi) => (kpi === "net_sales" ? 2200000 + bi * 200000 + mi * 100000 : 26 + bi * 2 + mi * 0.5).toLocaleString())]) }
}

function generateMetricData(kpi: string) {
  const values: Record<string, { value: number; change: number; unit: string }> = {
    net_sales: { value: 3250000, change: 4.2, unit: "円" },
    cogs_rate: { value: 31.2, change: -0.8, unit: "%" },
    labor_cost_rate: { value: 28.5, change: -1.2, unit: "%" },
    fl_ratio: { value: 59.7, change: -2.0, unit: "%" },
    health_score: { value: 72.3, change: 3.1, unit: "点" },
    avg_ticket: { value: 780, change: 2.5, unit: "円" },
    operating_profit_rate: { value: 8.3, change: 1.1, unit: "%" },
    gross_profit_rate: { value: 68.8, change: 0.5, unit: "%" },
    sales_per_labor_hour: { value: 4200, change: 3.8, unit: "円" },
    improvement_opportunity: { value: 1250000, change: -12.5, unit: "円" },
  }
  return values[kpi] || values.net_sales
}

function generateScatterData() {
  return brands.flatMap((b, bi) =>
    Array.from({ length: 8 }, (_, i) => ({
      x: 25 + bi * 3 + Math.sin(i) * 5,
      y: 60 + bi * 5 + Math.cos(i) * 10,
      z: 100 + i * 20,
      name: `${b} 店舗${i + 1}`,
    }))
  )
}

function generateLineData(kpi: string, groupBy?: string) {
  const months = ["1月", "2月", "3月", "4月", "5月", "6月"]
  const series = groupBy === "region" ? regions.slice(0, 3) : brands.slice(0, 3)
  return months.map((m, mi) => {
    const point: Record<string, any> = { name: m }
    series.forEach((s, si) => {
      point[s] = kpi === "net_sales" ? 2000000 + si * 300000 + mi * 150000 + Math.sin(mi + si) * 200000 : 25 + si * 3 + mi * 0.5 + Math.sin(mi + si) * 2
    })
    return point
  })
}

function generateStackedBarData(kpi: string, groupBy?: string) {
  const groups = groupBy === "region" ? regions : brands
  return groups.map((g, i) => ({
    name: g,
    売上高: 3000000 + i * 200000,
    原価: -(900000 + i * 50000),
    人件費: -(800000 + i * 40000),
    家賃: -(300000 + i * 10000),
    その他: -(200000 + i * 20000),
    営業利益: 800000 + i * 80000,
  }))
}

function generatePieData(kpi: string) {
  return brands.map((b, i) => ({
    name: b,
    value: kpi === "net_sales" ? 2500000 + i * 500000 : 18 + i * 3,
  }))
}

function generateHeatmapData() {
  return STORES_SHORT.map((store, si) =>
    DAYS.map((day, di) => ({
      store, day,
      value: 50 + Math.round(Math.sin(si * 3 + di) * 30 + si * 5 + di * 3),
    }))
  ).flat()
}

function generateWaterfallData() {
  return [
    { name: "売上高", value: 3250000, type: "positive" },
    { name: "原価", value: -1010000, type: "negative" },
    { name: "粗利", value: 2240000, type: "subtotal" },
    { name: "人件費", value: -926000, type: "negative" },
    { name: "家賃", value: -325000, type: "negative" },
    { name: "その他", value: -195000, type: "negative" },
    { name: "営業利益", value: 794000, type: "total" },
  ]
}

function generateTableData(kpi: string) {
  return brands.flatMap((b, bi) =>
    regions.slice(0, 2).map((r, ri) => ({
      ブランド: b,
      エリア: r,
      値: kpi === "net_sales" ? (2500000 + bi * 300000 + ri * 200000).toLocaleString() : (25 + bi * 3 + ri * 2).toFixed(1),
      前月比: `${(ri % 2 === 0 ? "+" : "-")}${(1.5 + bi * 0.3).toFixed(1)}%`,
      ランク: bi * 2 + ri + 1,
    }))
  )
}

// ── Panel components ──

function BarPanel({ panel }: { panel: PanelSpec }) {
  const data = generateBarData(panel.kpi, panel.group_by)
  return (
    <div className="h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function PivotPanel({ panel }: { panel: PanelSpec }) {
  const data = generatePivotData(panel.kpi)
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-white/[0.08]">
            {data.headers.map((h) => (
              <th key={h} className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-white/40 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, ri) => (
            <tr key={ri} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
              {row.map((cell, ci) => (
                <td key={ci} className={`px-3 py-2 ${ci === 0 ? "text-white/80 font-medium" : "text-white/60 font-mono tabular-nums"}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MetricPanel({ panel }: { panel: PanelSpec }) {
  const data = generateMetricData(panel.kpi)
  const isPositive = data.change > 0
  const higherIsBetter = ["net_sales", "health_score", "avg_ticket", "gross_profit_rate", "sales_per_labor_hour", "operating_profit_rate"].includes(panel.kpi)
  const isGood = higherIsBetter ? isPositive : !isPositive
  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div className="text-[36px] font-bold text-white/90 tabular-nums">{data.value.toLocaleString()}<span className="text-[14px] text-white/40 ml-1">{data.unit}</span></div>
      <div className={`mt-2 text-[13px] font-medium flex items-center gap-1 ${isGood ? "text-emerald-400" : "text-red-400"}`}>
        {isPositive ? "↑" : "↓"} {Math.abs(data.change)}% <span className="text-white/30 text-[11px] ml-1">前月比</span>
      </div>
    </div>
  )
}

function ScatterPanel() {
  const data = generateScatterData()
  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsScatter>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="x" name="原価率" unit="%" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} />
          <YAxis dataKey="y" name="健全度" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
          <ZAxis dataKey="z" range={[30, 120]} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ strokeDasharray: "3 3" }} />
          <Scatter data={data} fill="#8b5cf6" />
        </RechartsScatter>
      </ResponsiveContainer>
    </div>
  )
}

function LinePanel({ panel }: { panel: PanelSpec }) {
  const data = generateLineData(panel.kpi, panel.group_by)
  const seriesKeys = Object.keys(data[0] || {}).filter((k) => k !== "name")
  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }} />
          {seriesKeys.map((key, i) => (
            <Line key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function StackedBarPanel({ panel }: { panel: PanelSpec }) {
  const data = generateStackedBarData(panel.kpi, panel.group_by)
  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }} />
          <Bar dataKey="売上高" stackId="a" fill="#3b82f6" radius={[2, 2, 0, 0]} />
          <Bar dataKey="原価" stackId="a" fill="#ef4444" />
          <Bar dataKey="人件費" stackId="a" fill="#f59e0b" />
          <Bar dataKey="家賃" stackId="a" fill="#8b5cf6" />
          <Bar dataKey="その他" stackId="a" fill="#6b7280" />
          <Bar dataKey="営業利益" stackId="a" fill="#10b981" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function PiePanelComponent({ panel }: { panel: PanelSpec }) {
  const data = generatePieData(panel.kpi)
  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: "rgba(255,255,255,0.2)" }}>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

function HeatmapPanel() {
  const data = generateHeatmapData()
  const maxVal = Math.max(...data.map((d) => d.value))
  const minVal = Math.min(...data.map((d) => d.value))
  function heatColor(v: number) {
    const ratio = (v - minVal) / (maxVal - minVal)
    if (ratio > 0.75) return "bg-emerald-500/60"
    if (ratio > 0.5) return "bg-emerald-500/30"
    if (ratio > 0.25) return "bg-blue-500/20"
    return "bg-blue-500/10"
  }
  return (
    <div className="overflow-x-auto">
      <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `80px repeat(${DAYS.length}, 1fr)` }}>
        <div />
        {DAYS.map((d) => <div key={d} className="text-center text-[10px] text-white/40 py-1 px-2">{d}</div>)}
        {STORES_SHORT.map((store) => (
          <React.Fragment key={store}>
            <div className="text-[11px] text-white/60 py-1.5 pr-2 text-right">{store}</div>
            {DAYS.map((day) => {
              const cell = data.find((d) => d.store === store && d.day === day)
              return (
                <div key={`${store}-${day}`} className={`rounded text-center text-[10px] text-white/70 py-1.5 px-1 font-mono tabular-nums ${heatColor(cell?.value || 0)}`} title={`${store} ${day}: ${cell?.value}`}>
                  {cell?.value}
                </div>
              )
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-[9px] text-white/30">
        <span>低</span>
        <div className="flex gap-0.5">
          <div className="w-6 h-3 rounded bg-blue-500/10" />
          <div className="w-6 h-3 rounded bg-blue-500/20" />
          <div className="w-6 h-3 rounded bg-emerald-500/30" />
          <div className="w-6 h-3 rounded bg-emerald-500/60" />
        </div>
        <span>高</span>
      </div>
    </div>
  )
}

function WaterfallPanel() {
  const data = generateWaterfallData()
  let cumulative = 0
  const chartData = data.map((d) => {
    if (d.type === "total" || d.type === "subtotal") {
      const result = { name: d.name, positive: d.value > 0 ? d.value : 0, negative: d.value < 0 ? d.value : 0, invisible: 0 }
      cumulative = d.value
      return result
    }
    const start = cumulative
    cumulative += d.value
    return {
      name: d.name,
      positive: d.value > 0 ? d.value : 0,
      negative: d.value < 0 ? d.value : 0,
      invisible: d.value > 0 ? start : start + d.value,
    }
  })
  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="invisible" stackId="a" fill="transparent" />
          <Bar dataKey="positive" stackId="a" fill="#10b981" radius={[3, 3, 0, 0]} />
          <Bar dataKey="negative" stackId="a" fill="#ef4444" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function TablePanel({ panel }: { panel: PanelSpec }) {
  const data = generateTableData(panel.kpi)
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(true)
  const [filter, setFilter] = useState("")
  const cols = Object.keys(data[0] || {})
  const filtered = data.filter((row) => Object.values(row).some((v) => String(v).includes(filter)))
  const sorted = sortCol ? [...filtered].sort((a: any, b: any) => {
    const av = a[sortCol], bv = b[sortCol]
    const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv))
    return sortAsc ? cmp : -cmp
  }) : filtered
  return (
    <div>
      <div className="mb-2">
        <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="フィルタ..." className="bg-white/[0.04] border-white/[0.08] text-white/70 text-[12px] h-7 w-48" />
      </div>
      <div className="overflow-x-auto rounded border border-white/[0.06]">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-white/[0.08] bg-white/[0.02]">
              {cols.map((c) => (
                <th key={c} className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-white/40 font-medium cursor-pointer hover:text-white/60" onClick={() => { setSortCol(c); setSortAsc(sortCol === c ? !sortAsc : true) }}>
                  {c} {sortCol === c ? (sortAsc ? "↑" : "↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, ri) => (
              <tr key={ri} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                {cols.map((c) => (
                  <td key={c} className="px-3 py-1.5 text-white/60 font-mono tabular-nums">{(row as any)[c]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Panel type definitions for add dialog ──

const allPanelTypes: { type: PanelSpec["type"]; label: string; icon: typeof BarChart3; desc: string }[] = [
  { type: "bar_chart", label: "棒グラフ", icon: BarChart3, desc: "グループ別比較" },
  { type: "line_chart", label: "折れ線グラフ", icon: TrendingUp, desc: "時系列推移" },
  { type: "stacked_bar", label: "積み上げ棒グラフ", icon: Layers, desc: "構成比較（PL等）" },
  { type: "pie_chart", label: "円グラフ", icon: PieChartIcon, desc: "構成比" },
  { type: "pivot_table", label: "ピボット", icon: Table2, desc: "クロス集計テーブル" },
  { type: "metric_card", label: "メトリクスカード", icon: Hash, desc: "単一KPI + 前期比" },
  { type: "scatter", label: "散布図", icon: ScatterChart, desc: "KPI相関分析" },
  { type: "heatmap", label: "ヒートマップ", icon: Grid3X3, desc: "店舗×曜日の密度" },
  { type: "waterfall", label: "滝グラフ", icon: ArrowDownUp, desc: "PL滝（売上→利益）" },
  { type: "table", label: "データテーブル", icon: Table2, desc: "ソート・フィルタ付き" },
]

// ── Panel renderer ──

function PanelRenderer({ panel, onMeetingPack }: { panel: PanelSpec; onMeetingPack: (p: PanelSpec) => void }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.01]">
        <h4 className="text-[13px] font-medium text-white/80">{panel.title}</h4>
        <button onClick={() => onMeetingPack(panel)} className="text-[11px] text-white/30 hover:text-blue-400 flex items-center gap-1 transition-colors" title="経営会議パックに追加">
          <Paperclip className="w-3.5 h-3.5" /> 経営会議に追加
        </button>
      </div>
      <div className="p-4">
        {panel.type === "bar_chart" && <BarPanel panel={panel} />}
        {panel.type === "pivot_table" && <PivotPanel panel={panel} />}
        {panel.type === "metric_card" && <MetricPanel panel={panel} />}
        {panel.type === "scatter" && <ScatterPanel />}
        {panel.type === "line_chart" && <LinePanel panel={panel} />}
        {panel.type === "stacked_bar" && <StackedBarPanel panel={panel} />}
        {panel.type === "pie_chart" && <PiePanelComponent panel={panel} />}
        {panel.type === "heatmap" && <HeatmapPanel />}
        {panel.type === "waterfall" && <WaterfallPanel />}
        {panel.type === "table" && <TablePanel panel={panel} />}
      </div>
    </div>
  )
}

// ── CSV export ──

function downloadCSV(analysisName: string, panels: PanelSpec[]) {
  let csv = "\uFEFF"
  csv += `# 分析: ${analysisName}\n# エクスポート日: ${new Date().toISOString()}\n\n`
  for (const panel of panels) {
    csv += `## ${panel.title}\n`
    if (panel.type === "bar_chart") {
      const data = generateBarData(panel.kpi, panel.group_by)
      csv += "グループ,値\n"
      data.forEach((d) => { csv += `${d.name},${d.value}\n` })
    } else if (panel.type === "pivot_table") {
      const data = generatePivotData(panel.kpi)
      csv += data.headers.join(",") + "\n"
      data.rows.forEach((r) => { csv += r.join(",") + "\n" })
    } else if (panel.type === "metric_card") {
      const data = generateMetricData(panel.kpi)
      csv += `値,${data.value}\n前月比,${data.change}%\n`
    } else if (panel.type === "scatter") {
      const data = generateScatterData()
      csv += "名前,X,Y\n"
      data.forEach((d) => { csv += `${d.name},${d.x.toFixed(1)},${d.y.toFixed(1)}\n` })
    } else if (panel.type === "line_chart") {
      const data = generateLineData(panel.kpi, panel.group_by)
      const keys = Object.keys(data[0] || {})
      csv += keys.join(",") + "\n"
      data.forEach((d) => { csv += keys.map((k) => d[k]).join(",") + "\n" })
    } else if (panel.type === "stacked_bar") {
      const data = generateStackedBarData(panel.kpi, panel.group_by)
      const keys = Object.keys(data[0] || {})
      csv += keys.join(",") + "\n"
      data.forEach((d: any) => { csv += keys.map((k) => d[k]).join(",") + "\n" })
    } else if (panel.type === "pie_chart") {
      const data = generatePieData(panel.kpi)
      csv += "名前,値\n"
      data.forEach((d) => { csv += `${d.name},${d.value}\n` })
    } else if (panel.type === "heatmap") {
      const data = generateHeatmapData()
      csv += "店舗,曜日,値\n"
      data.forEach((d) => { csv += `${d.store},${d.day},${d.value}\n` })
    } else if (panel.type === "waterfall") {
      const data = generateWaterfallData()
      csv += "項目,金額,種別\n"
      data.forEach((d) => { csv += `${d.name},${d.value},${d.type}\n` })
    } else if (panel.type === "table") {
      const data = generateTableData(panel.kpi)
      const keys = Object.keys(data[0] || {})
      csv += keys.join(",") + "\n"
      data.forEach((d: any) => { csv += keys.map((k) => d[k]).join(",") + "\n" })
    }
    csv += "\n"
  }
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${analysisName}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Query Builder ──

function QueryBuilder() {
  const [kpi, setKpi] = useState("net_sales")
  const [aggregation, setAggregation] = useState("avg")
  const [groupBy, setGroupBy] = useState<string[]>(["brand"])
  const [filters, setFilters] = useState<{ field: string; operator: string; value: string }[]>([])
  const [periodStart, setPeriodStart] = useState("2026-01-01")
  const [periodEnd, setPeriodEnd] = useState("2026-04-30")
  const [previewData, setPreviewData] = useState<Record<string, any>[] | null>(null)
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([])
  const [queryName, setQueryName] = useState("")

  const groupByOptions = [
    { value: "brand", label: "ブランド" },
    { value: "region", label: "エリア" },
    { value: "store", label: "店舗" },
    { value: "month", label: "月次" },
  ]
  const aggOptions = [
    { value: "avg", label: "平均" },
    { value: "sum", label: "合計" },
    { value: "count", label: "件数" },
    { value: "min", label: "最小" },
    { value: "max", label: "最大" },
  ]
  const filterFields = [
    { value: "brand", label: "ブランド" },
    { value: "region", label: "エリア" },
    { value: "health_score", label: "健全度" },
    { value: "fl_ratio", label: "FL比率" },
  ]
  const filterOps = ["=", "!=", ">", "<", ">=", "<="]

  const addFilter = () => setFilters([...filters, { field: "brand", operator: "=", value: "" }])
  const removeFilter = (i: number) => setFilters(filters.filter((_, idx) => idx !== i))
  const toggleGroupBy = (v: string) => setGroupBy(groupBy.includes(v) ? groupBy.filter((g) => g !== v) : [...groupBy, v])

  const handlePreview = () => {
    const groups = groupBy.includes("brand") ? brands : groupBy.includes("region") ? regions : groupBy.includes("store") ? brands.flatMap((b) => [`${b} 品川店`, `${b} 渋谷店`]) : ["2026-01", "2026-02", "2026-03", "2026-04"]
    setPreviewData(groups.map((g, i) => ({
      グループ: g,
      [kpiOptions.find((k) => k.value === kpi)?.label || kpi]: kpi === "net_sales" ? (2500000 + i * 300000).toLocaleString() : (25 + i * 3).toFixed(1),
      [`${aggOptions.find((a) => a.value === aggregation)?.label || aggregation}`]: aggregation === "count" ? 30 + i * 5 : aggregation === "sum" ? (10000000 + i * 1000000).toLocaleString() : (25 + i * 3).toFixed(1),
    })))
  }

  const handleSave = () => {
    const q: SavedQuery = {
      id: `sq-${Date.now()}`,
      name: queryName || `クエリ ${savedQueries.length + 1}`,
      kpi, aggregation, group_by: groupBy, filters,
      period_start: periodStart, period_end: periodEnd,
      created_at: new Date().toISOString(),
    }
    setSavedQueries([...savedQueries, q])
    setQueryName("")
  }

  const handleQueryCSV = () => {
    if (!previewData) return
    let csv = "\uFEFF"
    const keys = Object.keys(previewData[0] || {})
    csv += keys.join(",") + "\n"
    previewData.forEach((row) => { csv += keys.map((k) => row[k]).join(",") + "\n" })
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "query-result.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] text-white/50 block mb-1">KPI</label>
            <select value={kpi} onChange={(e) => setKpi(e.target.value)} className="w-full text-[13px] px-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.08] text-white/70">
              {kpiOptions.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-white/50 block mb-1">集約</label>
            <select value={aggregation} onChange={(e) => setAggregation(e.target.value)} className="w-full text-[13px] px-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.08] text-white/70">
              {aggOptions.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[11px] text-white/50 block mb-1">グループ</label>
          <div className="flex flex-wrap gap-2">
            {groupByOptions.map((g) => (
              <button key={g.value} onClick={() => toggleGroupBy(g.value)} className={`text-[12px] px-3 py-1.5 rounded-md border transition-colors ${groupBy.includes(g.value) ? "bg-blue-500/20 border-blue-400/30 text-blue-400" : "bg-white/[0.02] border-white/[0.08] text-white/50 hover:text-white/70"}`}>
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] text-white/50">フィルタ</label>
            <button onClick={addFilter} className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5"><Plus className="w-3 h-3" />追加</button>
          </div>
          {filters.map((f, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <select value={f.field} onChange={(e) => { const nf = [...filters]; nf[i] = { ...f, field: e.target.value }; setFilters(nf) }} className="text-[12px] px-2 py-1.5 rounded bg-white/[0.04] border border-white/[0.08] text-white/70">
                {filterFields.map((ff) => <option key={ff.value} value={ff.value}>{ff.label}</option>)}
              </select>
              <select value={f.operator} onChange={(e) => { const nf = [...filters]; nf[i] = { ...f, operator: e.target.value }; setFilters(nf) }} className="text-[12px] px-2 py-1.5 rounded bg-white/[0.04] border border-white/[0.08] text-white/70 w-16">
                {filterOps.map((op) => <option key={op} value={op}>{op}</option>)}
              </select>
              <Input value={f.value} onChange={(e) => { const nf = [...filters]; nf[i] = { ...f, value: e.target.value }; setFilters(nf) }} className="bg-white/[0.04] border-white/[0.08] text-white/70 text-[12px] h-8 flex-1" placeholder="値" />
              <button onClick={() => removeFilter(i)} className="text-white/30 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] text-white/50 block mb-1">開始日</label>
            <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-white/70 text-[12px]" />
          </div>
          <div>
            <label className="text-[11px] text-white/50 block mb-1">終了日</label>
            <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-white/70 text-[12px]" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Input value={queryName} onChange={(e) => setQueryName(e.target.value)} placeholder="クエリ名（任意）" className="bg-white/[0.04] border-white/[0.08] text-white/70 text-[12px] flex-1" />
        </div>

        <div className="flex gap-2 pt-1">
          <Button onClick={handlePreview} className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-400/20 text-[12px]">
            <Eye className="w-3.5 h-3.5 mr-1.5" />プレビュー
          </Button>
          <Button onClick={handleSave} className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-400/20 text-[12px]">
            <Save className="w-3.5 h-3.5 mr-1.5" />保存
          </Button>
          {previewData && (
            <Button onClick={handleQueryCSV} className="bg-white/[0.06] text-white/60 hover:bg-white/[0.1] border border-white/[0.08] text-[12px]">
              <Download className="w-3.5 h-3.5 mr-1.5" />CSVダウンロード
            </Button>
          )}
        </div>
      </div>

      {/* Preview results */}
      {previewData && (
        <div className="rounded-lg border border-white/[0.06] overflow-hidden">
          <div className="px-4 py-2 bg-white/[0.02] border-b border-white/[0.06] text-[11px] text-white/40">{previewData.length}件の結果</div>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {Object.keys(previewData[0] || {}).map((k) => (
                  <th key={k} className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-white/40 font-medium">{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewData.map((row, i) => (
                <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  {Object.values(row).map((v, j) => (
                    <td key={j} className="px-3 py-1.5 text-white/60 font-mono tabular-nums">{String(v)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Saved queries */}
      {savedQueries.length > 0 && (
        <div>
          <div className="text-[11px] text-white/40 mb-2">保存済みクエリ</div>
          <div className="space-y-2">
            {savedQueries.map((q) => (
              <div key={q.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-white/80 font-medium">{q.name}</span>
                  <span className="text-white/30 font-mono text-[10px]">{formatDate(q.created_at)}</span>
                </div>
                <div className="text-white/40 mt-1">
                  {kpiOptions.find((k) => k.value === q.kpi)?.label} / {q.aggregation} / {q.group_by.join(", ")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ──

export default function WorkspacePage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [kpis, setKpis] = useState<CustomKPIDef[]>([])
  const [cohorts, setCohorts] = useState<CohortDef[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null)
  const [meetingPackDialog, setMeetingPackDialog] = useState<PanelSpec | null>(null)
  const [meetingPackDone, setMeetingPackDone] = useState(false)
  const [addPanelOpen, setAddPanelOpen] = useState(false)
  const [newPanelType, setNewPanelType] = useState<PanelSpec["type"] | null>(null)
  const [newPanelKpi, setNewPanelKpi] = useState("net_sales")
  const [newPanelGroupBy, setNewPanelGroupBy] = useState("brand")
  const [newPanelBrand, setNewPanelBrand] = useState("")
  const [newPanelRegion, setNewPanelRegion] = useState("")
  const [newPanelTitle, setNewPanelTitle] = useState("")
  const [previewPanel, setPreviewPanel] = useState<PanelSpec | null>(null)
  const [promoteId, setPromoteId] = useState<string | null>(null)
  const [promoteDone, setPromoteDone] = useState<Set<string>>(new Set())
  const [cohortDialogOpen, setCohortDialogOpen] = useState(false)
  const [cohortForm, setCohortForm] = useState({ name: "", brand: "", region: "", healthMin: "", healthMax: "", flThreshold: "" })
  const [cohortPreview, setCohortPreview] = useState<{ count: number; samples: string[] } | null>(null)

  useEffect(() => {
    Promise.all([
      fetchAPI<Analysis[]>("/api/v1/workspace/analyses"),
      fetchAPI<CustomKPIDef[]>("/api/v1/workspace/custom-kpis"),
      fetchAPI<CohortDef[]>("/api/v1/workspace/cohorts"),
    ])
      .then(([a, k, c]) => { setAnalyses(a); setKpis(k); setCohorts(c) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleCSVDownload = useCallback(() => {
    if (!selectedAnalysis?.spec.panels?.length) return
    downloadCSV(selectedAnalysis.name, selectedAnalysis.spec.panels!)
  }, [selectedAnalysis])

  const handleMeetingPackAdd = (panel: PanelSpec) => {
    setMeetingPackDialog(panel)
    setMeetingPackDone(false)
  }

  const confirmMeetingPack = () => {
    setMeetingPackDone(true)
    setTimeout(() => setMeetingPackDialog(null), 1500)
  }

  const resetAddPanelForm = () => {
    setNewPanelType(null)
    setNewPanelKpi("net_sales")
    setNewPanelGroupBy("brand")
    setNewPanelBrand("")
    setNewPanelRegion("")
    setNewPanelTitle("")
    setPreviewPanel(null)
  }

  const buildPanelFromForm = (): PanelSpec => ({
    id: `p-new-${Date.now()}`,
    type: newPanelType!,
    title: newPanelTitle || `${kpiOptions.find((k) => k.value === newPanelKpi)?.label || newPanelKpi}`,
    kpi: newPanelKpi,
    group_by: newPanelGroupBy,
    scope: {
      ...(newPanelBrand && { brand: newPanelBrand }),
      ...(newPanelRegion && { region: newPanelRegion }),
    },
  })

  const handlePreviewPanel = () => {
    if (!newPanelType) return
    setPreviewPanel(buildPanelFromForm())
  }

  const handleAddPanel = () => {
    if (!newPanelType || !selectedAnalysis) return
    const newPanel = buildPanelFromForm()
    const updated = { ...selectedAnalysis, spec: { ...selectedAnalysis.spec, panels: [...(selectedAnalysis.spec.panels || []), newPanel] } }
    setSelectedAnalysis(updated)
    setAnalyses((prev) => prev.map((a) => a.id === updated.id ? updated : a))
    setAddPanelOpen(false)
    resetAddPanelForm()
  }

  const handlePromote = (id: string) => {
    fetchAPI(`/api/v1/workspace/custom-kpis/${id}/promote`, { method: "POST" })
    setPromoteDone((prev) => new Set(prev).add(id))
    setKpis((prev) => prev.map((k) => k.id === id ? { ...k, status: "promoted" } : k))
    setPromoteId(null)
  }

  const handleCohortPreview = () => {
    const sampleStores = ["すき家 品川港南店", "はま寿司 横浜六角橋店", "ココス 大宮店", "なか卯 品川店", "すき家 渋谷道玄坂店"]
    const count = cohortForm.brand ? 12 : cohortForm.region ? 18 : 42
    setCohortPreview({ count, samples: sampleStores.slice(0, 3) })
  }

  const handleCohortSave = () => {
    const newCohort: CohortDef = {
      id: `co-new-${Date.now()}`,
      name: cohortForm.name || "新規コホート",
      object_type: "store",
      filter_spec: {
        ...(cohortForm.brand && { brand: cohortForm.brand }),
        ...(cohortForm.region && { region: cohortForm.region }),
        ...(cohortForm.healthMin && { health_score: { gte: Number(cohortForm.healthMin) } }),
        ...(cohortForm.healthMax && { health_score: { ...(cohortForm.healthMin ? { gte: Number(cohortForm.healthMin) } : {}), lte: Number(cohortForm.healthMax) } }),
        ...(cohortForm.flThreshold && { fl_ratio: { lte: Number(cohortForm.flThreshold) } }),
      },
      instance_count: cohortPreview?.count || 0,
    }
    setCohorts((prev) => [...prev, newCohort])
    setCohortDialogOpen(false)
    setCohortForm({ name: "", brand: "", region: "", healthMin: "", healthMax: "", flThreshold: "" })
    setCohortPreview(null)
  }

  if (loading) return <div className="min-h-full bg-[#0a0e14]"><ContextHeader title="分析ワークスペース" description="カスタム分析・KPI定義・コホート管理" /><LoadingState /></div>
  if (error) return <div className="min-h-full bg-[#0a0e14]"><ContextHeader title="分析ワークスペース" description="カスタム分析・KPI定義・コホート管理" /><ErrorState message={error} /></div>

  // Analysis detail view
  if (selectedAnalysis) {
    const panels = selectedAnalysis.spec.panels || []
    return (
      <div className="min-h-full bg-[#0a0e14] text-white/80 flex flex-col">
        <ContextHeader title={selectedAnalysis.name} description={selectedAnalysis.description} />
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setSelectedAnalysis(null)} className="flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/70 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> 分析一覧に戻る
            </button>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleCSVDownload} className="bg-white/[0.06] text-white/60 hover:bg-white/[0.1] border border-white/[0.08] text-[12px] h-8">
                <Download className="w-3.5 h-3.5 mr-1.5" />CSVダウンロード
              </Button>
              <Dialog open={addPanelOpen} onOpenChange={(open) => { setAddPanelOpen(open); if (!open) resetAddPanelForm() }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-400/20 text-[12px] h-8">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />パネル追加
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#0c1017] border-white/[0.1] text-white/80 max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="text-white/90">パネル追加</DialogTitle></DialogHeader>
                  {!newPanelType ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                      {allPanelTypes.map((t) => (
                        <button key={t.type} onClick={() => setNewPanelType(t.type)} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 hover:bg-white/[0.06] hover:border-white/[0.15] transition-all text-left">
                          <t.icon className="w-6 h-6 text-blue-400 mb-2" />
                          <div className="text-[13px] font-medium text-white/80">{t.label}</div>
                          <div className="text-[11px] text-white/40 mt-0.5">{t.desc}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3 mt-2">
                      <div>
                        <label className="text-[11px] text-white/50 block mb-1">タイトル</label>
                        <Input value={newPanelTitle} onChange={(e) => setNewPanelTitle(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-white/70 text-[13px]" placeholder="任意（空欄の場合KPI名を使用）" />
                      </div>
                      <div>
                        <label className="text-[11px] text-white/50 block mb-1">KPI</label>
                        <select value={newPanelKpi} onChange={(e) => setNewPanelKpi(e.target.value)} className="w-full text-[13px] px-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.08] text-white/70">
                          {kpiOptions.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-white/50 block mb-1">ブランド</label>
                          <select value={newPanelBrand} onChange={(e) => setNewPanelBrand(e.target.value)} className="w-full text-[13px] px-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.08] text-white/70">
                            <option value="">すべて</option>
                            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] text-white/50 block mb-1">エリア</label>
                          <select value={newPanelRegion} onChange={(e) => setNewPanelRegion(e.target.value)} className="w-full text-[13px] px-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.08] text-white/70">
                            <option value="">すべて</option>
                            {regions.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                      </div>
                      {!["metric_card", "heatmap", "waterfall"].includes(newPanelType) && (
                        <div>
                          <label className="text-[11px] text-white/50 block mb-1">グループ化</label>
                          <select value={newPanelGroupBy} onChange={(e) => setNewPanelGroupBy(e.target.value)} className="w-full text-[13px] px-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.08] text-white/70">
                            <option value="brand">ブランド</option>
                            <option value="region">エリア</option>
                            <option value="store">店舗</option>
                            <option value="month">月次</option>
                          </select>
                        </div>
                      )}

                      {/* Preview */}
                      {previewPanel && (
                        <div className="rounded-lg border border-white/[0.06] bg-white/[0.01] p-3">
                          <div className="text-[10px] text-white/40 mb-2">プレビュー</div>
                          <PanelRenderer panel={previewPanel} onMeetingPack={() => {}} />
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" onClick={() => { setNewPanelType(null); setPreviewPanel(null) }} className="bg-transparent border-white/[0.1] text-white/50 hover:bg-white/[0.06]">戻る</Button>
                        <Button variant="outline" onClick={handlePreviewPanel} className="bg-transparent border-white/[0.1] text-white/50 hover:bg-white/[0.06]">
                          <Eye className="w-3.5 h-3.5 mr-1" />プレビュー
                        </Button>
                        <Button onClick={handleAddPanel} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white">追加</Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </div>
          {panels.length === 0 ? (
            <div className="text-center py-20 text-white/30 text-[13px]">パネルがありません。「パネル追加」から分析を始めましょう。</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {panels.map((panel) => (
                <PanelRenderer key={panel.id} panel={panel} onMeetingPack={handleMeetingPackAdd} />
              ))}
            </div>
          )}
        </div>

        {/* Meeting Pack confirmation dialog */}
        <Dialog open={!!meetingPackDialog} onOpenChange={(open) => !open && setMeetingPackDialog(null)}>
          <DialogContent className="bg-[#0c1017] border-white/[0.1] text-white/80 max-w-sm">
            {meetingPackDone ? (
              <div className="flex flex-col items-center py-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-3" />
                <p className="text-[14px] text-white/80">経営会議パックに追加しました</p>
              </div>
            ) : (
              <>
                <DialogHeader><DialogTitle className="text-white/90">経営会議パックに追加</DialogTitle></DialogHeader>
                <p className="text-[13px] text-white/60 mt-2">この分析を経営会議パックに追加しますか？</p>
                <p className="text-[12px] text-white/40 mt-1">パネル: {meetingPackDialog?.title}</p>
                <div className="flex gap-2 mt-4">
                  <DialogClose asChild><Button variant="outline" className="flex-1 bg-transparent border-white/[0.1] text-white/50 hover:bg-white/[0.06]">キャンセル</Button></DialogClose>
                  <Button onClick={confirmMeetingPack} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white">追加する</Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-[#0a0e14] text-white/80 flex flex-col">
      <ContextHeader title="分析ワークスペース" description="カスタム分析・KPI定義・コホート管理" />

      <div className="px-5 py-5">
        <Tabs defaultValue="analyses" className="w-full">
          <TabsList className="bg-white/[0.04] border border-white/[0.06]">
            <TabsTrigger value="analyses" className="data-[state=active]:bg-white/[0.08] data-[state=active]:text-white text-white/50">マイ分析</TabsTrigger>
            <TabsTrigger value="kpis" className="data-[state=active]:bg-white/[0.08] data-[state=active]:text-white text-white/50">カスタムKPI</TabsTrigger>
            <TabsTrigger value="cohorts" className="data-[state=active]:bg-white/[0.08] data-[state=active]:text-white text-white/50">コホート</TabsTrigger>
            <TabsTrigger value="query" className="data-[state=active]:bg-white/[0.08] data-[state=active]:text-white text-white/50">クエリビルダ</TabsTrigger>
          </TabsList>

          {/* マイ分析 */}
          <TabsContent value="analyses" className="mt-4">
            {analyses.length === 0 ? <EmptyState message="分析がありません" /> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {analyses.map((a) => (
                  <div key={a.id} onClick={() => setSelectedAnalysis(a)} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.04] hover:border-white/[0.12] transition-all cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-[14px] font-semibold text-white/90">{a.name}</h3>
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${visibilityBadge[a.visibility] || visibilityBadge.private}`}>{a.visibility}</span>
                    </div>
                    {a.description && <p className="text-[12px] text-white/40 mb-3 line-clamp-2">{a.description}</p>}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/30 font-mono tabular-nums">{formatDate(a.created_at)}</span>
                      <span className="text-[10px] text-white/30">{a.spec.panels?.length || 0} パネル</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* カスタムKPI */}
          <TabsContent value="kpis" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] text-white/40">{kpis.length}件のカスタムKPI</span>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-400/20 text-[12px] h-8">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />新規作成
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#0c1017] border-white/[0.1] text-white/80">
                  <DialogHeader><DialogTitle className="text-white/90">カスタムKPI作成</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><label className="text-[11px] text-white/50 block mb-1">KPI名</label><Input className="bg-white/[0.04] border-white/[0.08] text-white/80" placeholder="例: ピーク時間効率" /></div>
                    <div><label className="text-[11px] text-white/50 block mb-1">計算式</label><Input className="bg-white/[0.04] border-white/[0.08] text-white/80 font-mono" placeholder="例: peak_sales / peak_labor_hours" /></div>
                    <div><label className="text-[11px] text-white/50 block mb-1">対象オブジェクト</label>
                      <select className="w-full text-[13px] px-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.08] text-white/70">
                        <option value="store">店舗</option><option value="brand">ブランド</option><option value="area">エリア</option>
                      </select>
                    </div>
                    <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white">作成</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="rounded-lg border border-white/[0.06] overflow-hidden">
              <table className="w-full text-[13px]">
                <thead><tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">API名</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">表示名</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">計算式</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">ステータス</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">Ver</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium"></th>
                </tr></thead>
                <tbody>
                  {kpis.map((k) => (
                    <tr key={k.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-mono text-[12px] text-white/60">{k.api_name}</td>
                      <td className="px-4 py-3 text-white/80">{k.display_name}</td>
                      <td className="px-4 py-3"><code className="text-[11px] bg-white/[0.06] px-2 py-0.5 rounded text-cyan-400/80 font-mono">{k.formula}</code></td>
                      <td className="px-4 py-3"><span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${statusBadge[k.status] || statusBadge.draft}`}>{k.status}</span></td>
                      <td className="px-4 py-3 text-white/40 font-mono">v{k.version}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"><Eye className="w-3 h-3" />プレビュー</button>
                          {k.status === "active" && !promoteDone.has(k.id) && (
                            <Dialog open={promoteId === k.id} onOpenChange={(open) => !open && setPromoteId(null)}>
                              <DialogTrigger asChild>
                                <button onClick={() => setPromoteId(k.id)} className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1">
                                  <ArrowUpRight className="w-3 h-3" />KPI Registryに昇格
                                </button>
                              </DialogTrigger>
                              <DialogContent className="bg-[#0c1017] border-white/[0.1] text-white/80 max-w-sm">
                                <DialogHeader><DialogTitle className="text-white/90">KPI Registryに昇格</DialogTitle></DialogHeader>
                                <p className="text-[13px] text-white/60 mt-2">この式を公式KPIとして登録します。全ダッシュボードから参照可能になります。</p>
                                <p className="text-[12px] text-white/40 mt-1 font-mono">{k.display_name}: {k.formula}</p>
                                <div className="flex gap-2 mt-4">
                                  <DialogClose asChild><Button variant="outline" className="flex-1 bg-transparent border-white/[0.1] text-white/50 hover:bg-white/[0.06]">キャンセル</Button></DialogClose>
                                  <Button onClick={() => handlePromote(k.id)} className="flex-1 bg-purple-500 hover:bg-purple-600 text-white">昇格する</Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                          {k.status === "promoted" && (
                            <span className="text-[10px] text-purple-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />昇格済み</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* コホート */}
          <TabsContent value="cohorts" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] text-white/40">{cohorts.length}件のコホート</span>
              <Dialog open={cohortDialogOpen} onOpenChange={setCohortDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-400/20 text-[12px] h-8">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />新規作成
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#0c1017] border-white/[0.1] text-white/80 max-w-md">
                  <DialogHeader><DialogTitle className="text-white/90">コホート作成</DialogTitle></DialogHeader>
                  <div className="space-y-3 mt-2">
                    <div>
                      <label className="text-[11px] text-white/50 block mb-1">コホート名</label>
                      <Input value={cohortForm.name} onChange={(e) => setCohortForm({ ...cohortForm, name: e.target.value })} className="bg-white/[0.04] border-white/[0.08] text-white/80" placeholder="例: 高収益店舗群" />
                    </div>
                    <div>
                      <label className="text-[11px] text-white/50 block mb-1">ブランド</label>
                      <select value={cohortForm.brand} onChange={(e) => setCohortForm({ ...cohortForm, brand: e.target.value })} className="w-full text-[13px] px-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.08] text-white/70">
                        <option value="">すべて</option>
                        {brands.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-white/50 block mb-1">リージョン</label>
                      <select value={cohortForm.region} onChange={(e) => setCohortForm({ ...cohortForm, region: e.target.value })} className="w-full text-[13px] px-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.08] text-white/70">
                        <option value="">すべて</option>
                        {regions.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-white/50 block mb-1">健全度スコア（下限）</label>
                        <Input type="number" value={cohortForm.healthMin} onChange={(e) => setCohortForm({ ...cohortForm, healthMin: e.target.value })} className="bg-white/[0.04] border-white/[0.08] text-white/80" placeholder="0" />
                      </div>
                      <div>
                        <label className="text-[11px] text-white/50 block mb-1">健全度スコア（上限）</label>
                        <Input type="number" value={cohortForm.healthMax} onChange={(e) => setCohortForm({ ...cohortForm, healthMax: e.target.value })} className="bg-white/[0.04] border-white/[0.08] text-white/80" placeholder="100" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] text-white/50 block mb-1">FL比率しきい値（以下）</label>
                      <Input type="number" value={cohortForm.flThreshold} onChange={(e) => setCohortForm({ ...cohortForm, flThreshold: e.target.value })} className="bg-white/[0.04] border-white/[0.08] text-white/80" placeholder="65" />
                    </div>

                    {cohortPreview && (
                      <div className="rounded-md bg-white/[0.04] border border-white/[0.08] p-3">
                        <div className="text-[13px] text-white/80 font-medium mb-1">該当: {cohortPreview.count}件</div>
                        <div className="text-[11px] text-white/50">
                          {cohortPreview.samples.map((s) => <div key={s}>{s}</div>)}
                          {cohortPreview.count > 3 && <div className="text-white/30 mt-0.5">...他 {cohortPreview.count - 3}件</div>}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" onClick={handleCohortPreview} className="flex-1 bg-transparent border-white/[0.1] text-white/50 hover:bg-white/[0.06]">プレビュー</Button>
                      <Button onClick={handleCohortSave} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white">保存</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="rounded-lg border border-white/[0.06] overflow-hidden">
              <table className="w-full text-[13px]">
                <thead><tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">コホート名</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">対象タイプ</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">インスタンス数</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">フィルタ</th>
                </tr></thead>
                <tbody>
                  {cohorts.map((c) => (
                    <tr key={c.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-white/80 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-white/50">{c.object_type}</td>
                      <td className="px-4 py-3 font-mono tabular-nums text-white/60">{c.instance_count ?? "-"}</td>
                      <td className="px-4 py-3"><code className="text-[11px] bg-white/[0.06] px-2 py-0.5 rounded text-cyan-400/80 font-mono">{JSON.stringify(c.filter_spec)}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* クエリビルダ */}
          <TabsContent value="query" className="mt-4">
            <QueryBuilder />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
