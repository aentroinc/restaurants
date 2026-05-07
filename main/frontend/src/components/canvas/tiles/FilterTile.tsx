"use client"

import { CalendarDays, Filter as FilterIcon } from "lucide-react"
import type { FilterTile as FilterTileSpec, SharedFilter } from "@/lib/canvas-spec"

interface Props {
  tile: FilterTileSpec
  filters: SharedFilter
  onChange: (next: SharedFilter) => void
}

const BRANDS = ["", "かっぱ寿司", "かっぱ寿司", "郊外ロードサイド型", "食べ放題特化型", "都市型"]
const REGIONS = ["", "関東", "関西", "中部", "九州", "東北"]

export function FilterTile({ filters, onChange }: Props) {
  return (
    <div className="h-full w-full p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[11px] text-white/50">
        <FilterIcon className="h-3.5 w-3.5" />
        共有フィルタ（全タイルに適用）
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <div>
          <div className="text-[10px] text-white/40 mb-1 flex items-center gap-1"><CalendarDays className="h-3 w-3" /> 開始</div>
          <input
            type="date"
            value={filters.period?.from ?? ""}
            onChange={(e) => onChange({ ...filters, period: { ...filters.period, from: e.target.value } })}
            className="w-full text-[11px] px-2 py-1 bg-white/[0.04] border border-white/[0.06] rounded text-white/80 focus:outline-none focus:border-white/20"
          />
        </div>
        <div>
          <div className="text-[10px] text-white/40 mb-1 flex items-center gap-1"><CalendarDays className="h-3 w-3" /> 終了</div>
          <input
            type="date"
            value={filters.period?.to ?? ""}
            onChange={(e) => onChange({ ...filters, period: { ...filters.period, to: e.target.value } })}
            className="w-full text-[11px] px-2 py-1 bg-white/[0.04] border border-white/[0.06] rounded text-white/80 focus:outline-none focus:border-white/20"
          />
        </div>
        <div>
          <div className="text-[10px] text-white/40 mb-1">ブランド</div>
          <select
            value={filters.brand ?? ""}
            onChange={(e) => onChange({ ...filters, brand: e.target.value || undefined })}
            className="w-full text-[11px] px-2 py-1 bg-white/[0.04] border border-white/[0.06] rounded text-white/80 focus:outline-none focus:border-white/20"
          >
            {BRANDS.map((b) => <option key={b} value={b} className="bg-[#0c1017]">{b || "全ブランド"}</option>)}
          </select>
        </div>
        <div>
          <div className="text-[10px] text-white/40 mb-1">エリア</div>
          <select
            value={filters.region ?? ""}
            onChange={(e) => onChange({ ...filters, region: e.target.value || undefined })}
            className="w-full text-[11px] px-2 py-1 bg-white/[0.04] border border-white/[0.06] rounded text-white/80 focus:outline-none focus:border-white/20"
          >
            {REGIONS.map((r) => <option key={r} value={r} className="bg-[#0c1017]">{r || "全エリア"}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}
