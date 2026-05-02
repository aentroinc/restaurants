"use client"

import { Hash, BarChart3, Table2, FileText, SlidersHorizontal, Grid3X3, Box } from "lucide-react"
import type { TileType } from "@/lib/canvas-spec"

interface Props {
  onAdd: (type: TileType) => void
}

const ITEMS: { type: TileType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: "kpi", label: "KPIタイル", icon: Hash },
  { type: "chart", label: "チャート", icon: BarChart3 },
  { type: "table", label: "テーブル", icon: Table2 },
  { type: "markdown", label: "マークダウン", icon: FileText },
  { type: "filter", label: "フィルタ", icon: SlidersHorizontal },
  { type: "pivot", label: "ピボット", icon: Grid3X3 },
  { type: "object", label: "Object", icon: Box },
]

export function AddTilePalette({ onAdd }: Props) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[11px] text-white/40 mr-1">タイル追加:</span>
      {ITEMS.map((it) => (
        <button
          key={it.type}
          onClick={() => onAdd(it.type)}
          className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-white/75 hover:bg-white/[0.08] hover:text-white/95 hover:border-white/[0.12] transition-colors"
        >
          <it.icon className="h-3.5 w-3.5" />
          {it.label}
        </button>
      ))}
    </div>
  )
}
