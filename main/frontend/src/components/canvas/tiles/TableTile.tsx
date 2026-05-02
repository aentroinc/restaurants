"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Link2 } from "lucide-react"
import type { TableTile as TableTileSpec } from "@/lib/canvas-spec"
import { kpiLabel, kpiUnit } from "@/lib/canvas-spec"
import { ontologyAPI, type OntoObjectInstance, type OntoObjectType } from "@/lib/ontology-api"

const STORES = [
  "品川店", "渋谷店", "新宿店", "池袋店", "横浜店",
  "大宮店", "千葉店", "船橋店", "立川店", "町田店",
]
const BRANDS = ["すき家", "はま寿司", "ココス", "なか卯", "ジョリーパスタ"]
const REGIONS = ["関東", "関西", "中部", "九州", "東北"]

function sampleValue(kpi: string, idx: number): number {
  const base =
    kpi === "net_sales" ? 2400000 :
    kpi === "avg_ticket" ? 720 :
    kpi === "improvement_opportunity" ? 800000 :
    kpi === "health_score" ? 70 :
    kpi === "operating_profit_rate" ? 7.5 :
    27
  return base + ((idx * 173) % 100) * (base > 1000 ? 5000 : 0.4)
}

export function TableTile({ tile }: { tile: TableTileSpec }) {
  const groupKey = tile.groupBy ?? "store"
  const groups = groupKey === "brand" ? BRANDS : groupKey === "region" ? REGIONS : STORES
  const binding = tile.objectBinding

  // Object binding 時は実 instance データから行を生成
  const [bound, setBound] = useState<{ insts: OntoObjectInstance[]; ot: OntoObjectType | null } | null>(null)

  useEffect(() => {
    if (!binding?.type) { setBound(null); return }
    Promise.all([
      ontologyAPI.listInstances(binding.type),
      ontologyAPI.listObjectTypes(),
    ]).then(([insts, types]) => {
      const ot = types.find((t) => t.api_name === binding.type || t.id === binding.type) ?? null
      // instanceId 指定があれば 1 行に絞る
      const filtered = binding.instanceId ? insts.filter((i) => i.id === binding.instanceId) : insts
      setBound({ insts: filtered, ot })
    }).catch(() => setBound(null))
  }, [binding?.type, binding?.instanceId])

  const rows = useMemo(
    () => {
      if (bound) {
        return bound.insts.map((inst) => {
          const r: Record<string, string | number> = { name: inst.display_name }
          tile.kpis.forEach((k) => {
            const v = inst.properties[k]
            r[k] = typeof v === "number" ? v : (v != null ? String(v) : 0)
          })
          return r
        })
      }
      return groups.map((g, i) => {
        const r: Record<string, string | number> = { name: g }
        tile.kpis.forEach((k) => { r[k] = sampleValue(k, i) })
        return r
      })
    },
    [groups, tile.kpis, bound]
  )

  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null)

  const filtered = useMemo(() => {
    let r = rows
    if (query.trim()) r = r.filter((row) => String(row.name).toLowerCase().includes(query.toLowerCase()))
    if (sort) {
      const { key, dir } = sort
      r = [...r].sort((a, b) => {
        const av = a[key]; const bv = b[key]
        if (typeof av === "number" && typeof bv === "number") return dir === "asc" ? av - bv : bv - av
        return dir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
      })
    }
    return r
  }, [rows, query, sort])

  function toggleSort(key: string) {
    setSort((s) =>
      s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }
    )
  }

  function fmt(v: string | number, k?: string) {
    if (typeof v === "number") {
      const u = k ? kpiUnit(k) : ""
      if (u === "%" || u === "点") return v.toFixed(1) + u
      if (u === "円") return Math.round(v).toLocaleString() + u
      return v.toLocaleString()
    }
    return v
  }

  return (
    <div className="h-full w-full flex flex-col p-3 min-h-0">
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="検索"
            className="w-full text-[11px] pl-7 pr-2 py-1 bg-white/[0.04] border border-white/[0.06] rounded text-white/80 placeholder:text-white/30 focus:outline-none focus:border-white/20"
          />
        </div>
        {bound && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-300/80 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-400/30">
            <Link2 className="h-2.5 w-2.5" /> {bound.ot?.display_name ?? binding?.type}
          </span>
        )}
        <span className="text-[10px] text-white/30 tabular-nums">{filtered.length}件</span>
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 bg-[#0c1017]">
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-2 py-1.5 text-white/50 font-normal cursor-pointer hover:text-white/80" onClick={() => toggleSort("name")}>
                <div className="flex items-center gap-1">
                  {groupKey === "brand" ? "ブランド" : groupKey === "region" ? "エリア" : "店舗"}
                  {sort?.key === "name" ? (sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                </div>
              </th>
              {tile.kpis.map((k) => (
                <th key={k} className="text-right px-2 py-1.5 text-white/50 font-normal cursor-pointer hover:text-white/80" onClick={() => toggleSort(k)}>
                  <div className="flex items-center gap-1 justify-end">
                    {kpiLabel(k)}
                    {sort?.key === k ? (sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="px-2 py-1.5 text-white/85">{fmt(row.name)}</td>
                {tile.kpis.map((k) => (
                  <td key={k} className="px-2 py-1.5 text-right text-white/75 tabular-nums">{fmt(row[k], k)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
