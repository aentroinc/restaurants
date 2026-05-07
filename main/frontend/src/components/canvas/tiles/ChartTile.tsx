"use client"

import { useEffect, useState } from "react"
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { Link2 } from "lucide-react"
import type { ChartTile as ChartTileSpec } from "@/lib/canvas-spec"
import { kpiLabel } from "@/lib/canvas-spec"
import { ontologyAPI, type OntoObjectInstance } from "@/lib/ontology-api"

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"]
const TOOLTIP_STYLE = { background: "#0c1017", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }

const BRANDS = ["かっぱ寿司", "かっぱ寿司", "郊外ロードサイド型", "食べ放題特化型", "都市型"]
const REGIONS = ["関東", "関西", "中部", "九州", "東北"]
const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月"]
const STORES = ["品川", "渋谷", "新宿", "池袋", "横浜"]

function buildData(kpi: string, groupBy?: string) {
  const groups =
    groupBy === "region" ? REGIONS :
    groupBy === "month" ? MONTHS :
    groupBy === "store" ? STORES :
    BRANDS
  return groups.map((g, i) => ({
    name: g,
    value:
      kpi === "net_sales" ? 2200000 + i * 280000 + (i % 2) * 90000 :
      kpi === "avg_ticket" ? 650 + i * 35 :
      kpi === "improvement_opportunity" ? 800000 + i * 150000 :
      25 + i * 2.5,
  }))
}

export function ChartTile({ tile }: { tile: ChartTileSpec }) {
  const binding = tile.objectBinding
  const [boundData, setBoundData] = useState<{ name: string; value: number }[] | null>(null)

  useEffect(() => {
    if (!binding?.type) { setBoundData(null); return }
    ontologyAPI.listInstances(binding.type)
      .then((insts: OntoObjectInstance[]) => {
        const propKey = binding.property ?? tile.kpi
        const filtered = binding.instanceId ? insts.filter((i) => i.id === binding.instanceId) : insts
        const data = filtered.map((inst) => {
          const v = inst.properties[propKey]
          return { name: inst.display_name, value: typeof v === "number" ? v : 0 }
        })
        setBoundData(data)
      })
      .catch(() => setBoundData(null))
  }, [binding?.type, binding?.instanceId, binding?.property, tile.kpi])

  const data = boundData ?? buildData(tile.kpi, tile.groupBy)
  const color = tile.color ?? COLORS[0]

  return (
    <div className="h-full w-full flex flex-col p-3">
      <div className="text-[11px] text-white/40 px-1 mb-1 flex items-center gap-1">
        {boundData && <Link2 className="h-2.5 w-2.5 text-blue-400/70" />}
        {kpiLabel(tile.kpi)}
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {tile.chartKind === "bar" ? (
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} stroke="rgba(255,255,255,0.1)" />
              <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} stroke="rgba(255,255,255,0.1)" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : tile.chartKind === "line" ? (
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} stroke="rgba(255,255,255,0.1)" />
              <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} stroke="rgba(255,255,255,0.1)" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          ) : (
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="80%" label={{ fill: "rgba(255,255,255,0.7)", fontSize: 10 }}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
