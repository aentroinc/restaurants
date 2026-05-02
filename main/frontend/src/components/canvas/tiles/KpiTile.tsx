"use client"

import { LineChart, Line, ResponsiveContainer } from "recharts"
import { TrendingUp, TrendingDown } from "lucide-react"
import type { KpiTile as KpiTileSpec } from "@/lib/canvas-spec"
import { kpiLabel, kpiUnit } from "@/lib/canvas-spec"
import { formatCurrencyCompact } from "@/lib/utils"

const SAMPLE_VALUES: Record<string, { value: number; change: number }> = {
  net_sales: { value: 3250000, change: 4.2 },
  cogs_rate: { value: 31.2, change: -0.8 },
  labor_cost_rate: { value: 28.5, change: -1.2 },
  fl_ratio: { value: 59.7, change: -2.0 },
  health_score: { value: 72.3, change: 3.1 },
  avg_ticket: { value: 780, change: 2.5 },
  operating_profit_rate: { value: 8.3, change: 1.1 },
  gross_profit_rate: { value: 68.8, change: 0.5 },
  sales_per_labor_hour: { value: 4200, change: 3.8 },
  improvement_opportunity: { value: 1250000, change: -12.5 },
}

function genSpark(seed: string): { v: number }[] {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return Array.from({ length: 12 }, (_, i) => {
    h = (h * 1103515245 + 12345) >>> 0
    return { v: 50 + ((h >> 8) % 50) + i * 1.5 }
  })
}

export function KpiTile({ tile }: { tile: KpiTileSpec }) {
  const stat = SAMPLE_VALUES[tile.kpi] ?? { value: 0, change: 0 }
  const unit = kpiUnit(tile.kpi)
  const isPercent = unit === "%" || unit === "点"
  const display = isPercent
    ? `${stat.value.toFixed(1)}${unit}`
    : unit === "円"
    ? formatCurrencyCompact(stat.value)
    : `${stat.value.toLocaleString()}${unit}`

  const positive = stat.change >= 0
  const color = tile.color ?? "#3b82f6"

  return (
    <div className="h-full w-full flex flex-col justify-between p-4">
      <div className="text-[11px] text-white/40 truncate">{kpiLabel(tile.kpi)}</div>
      <div className="flex items-end justify-between gap-2 mt-1">
        <div className="text-[26px] font-semibold text-white/95 tabular-nums leading-none">
          {display}
        </div>
        {tile.comparePrev && (
          <div className={`flex items-center gap-1 text-[11px] tabular-nums ${positive ? "text-emerald-400" : "text-red-400"}`}>
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {positive ? "+" : ""}
            {stat.change.toFixed(1)}%
          </div>
        )}
      </div>
      {tile.showSparkline && (
        <div className="h-10 mt-2 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={genSpark(tile.kpi)}>
              <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
