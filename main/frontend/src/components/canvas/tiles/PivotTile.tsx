"use client"

import type { PivotTile as PivotTileSpec } from "@/lib/canvas-spec"
import { kpiLabel, kpiUnit } from "@/lib/canvas-spec"

const BRANDS = ["すき家", "はま寿司", "ココス", "なか卯", "ジョリーパスタ"]
const REGIONS = ["関東", "関西", "中部", "九州", "東北"]
const STORES = ["品川店", "渋谷店", "新宿店", "池袋店", "横浜店"]
const MONTHS = ["2026-01", "2026-02", "2026-03", "2026-04"]
const QUARTERS = ["2025-Q4", "2026-Q1", "2026-Q2", "2026-Q3"]

function val(kpi: string, ri: number, ci: number): number {
  const base =
    kpi === "net_sales" ? 2200000 + ri * 200000 + ci * 100000 :
    kpi === "avg_ticket" ? 700 + ri * 25 + ci * 8 :
    25 + ri * 1.4 + ci * 0.7
  return base
}

export function PivotTile({ tile }: { tile: PivotTileSpec }) {
  const rows = tile.rows === "brand" ? BRANDS : tile.rows === "region" ? REGIONS : STORES
  const cols = tile.cols === "month" ? MONTHS : QUARTERS
  const unit = kpiUnit(tile.kpi)

  function fmt(v: number) {
    if (unit === "%" || unit === "点") return v.toFixed(1) + unit
    if (unit === "円") return Math.round(v).toLocaleString()
    return v.toLocaleString()
  }

  return (
    <div className="h-full w-full overflow-auto p-3">
      <div className="text-[11px] text-white/40 mb-2">{kpiLabel(tile.kpi)}</div>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-white/[0.08]">
            <th className="text-left px-2 py-1.5 text-white/50 font-normal sticky left-0 bg-[#0c1017]">
              {tile.rows === "brand" ? "ブランド" : tile.rows === "region" ? "エリア" : "店舗"}
            </th>
            {cols.map((c) => (
              <th key={c} className="text-right px-2 py-1.5 text-white/50 font-normal whitespace-nowrap">{c}</th>
            ))}
            <th className="text-right px-2 py-1.5 text-white/70 font-normal bg-white/[0.03]">合計</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => {
            const total = cols.reduce((acc, _, ci) => acc + val(tile.kpi, ri, ci), 0)
            return (
              <tr key={r} className="border-b border-white/[0.04]">
                <td className="px-2 py-1.5 text-white/85 sticky left-0 bg-[#0c1017]">{r}</td>
                {cols.map((c, ci) => (
                  <td key={c} className="px-2 py-1.5 text-right text-white/75 tabular-nums">{fmt(val(tile.kpi, ri, ci))}</td>
                ))}
                <td className="px-2 py-1.5 text-right text-white/90 tabular-nums bg-white/[0.03] font-medium">{fmt(unit === "%" || unit === "点" ? total / cols.length : total)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
