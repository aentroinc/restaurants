"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"
import { X, GripVertical, Copy } from "lucide-react"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

import type { CanvasSpec, GridItem, Tile, SharedFilter } from "@/lib/canvas-spec"
import { KpiTile } from "./tiles/KpiTile"
import { ChartTile } from "./tiles/ChartTile"
import { TableTile } from "./tiles/TableTile"
import { MarkdownTile } from "./tiles/MarkdownTile"
import { FilterTile } from "./tiles/FilterTile"
import { PivotTile } from "./tiles/PivotTile"
import { ObjectTile } from "./tiles/ObjectTile"

// react-grid-layout は SSR 不可
const GridLayout = dynamic(() => import("react-grid-layout").then((m) => m.default), { ssr: false })

interface Props {
  spec: CanvasSpec
  selectedId: string | null
  onSelect: (id: string | null) => void
  onLayoutChange: (layout: GridItem[]) => void
  onFiltersChange: (filters: SharedFilter) => void
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
}

export function CanvasGrid({
  spec, selectedId, onSelect, onLayoutChange, onFiltersChange, onRemove, onDuplicate,
}: Props) {
  const [width, setWidth] = useState(1200)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const tilesById = new Map<string, Tile>(spec.tiles.map((t) => [t.id, t]))

  return (
    <div ref={ref} className="w-full h-full overflow-auto" onClick={() => onSelect(null)}>
      {spec.tiles.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-[13px] text-white/40">キャンバスは空です</div>
            <div className="text-[11px] text-white/30 mt-1">上の「タイル追加」からKPI・チャートを置いてください</div>
          </div>
        </div>
      ) : (
        <GridLayout
          className="layout"
          layout={spec.layout}
          cols={12}
          rowHeight={40}
          width={width}
          margin={[12, 12]}
          containerPadding={[12, 12]}
          draggableHandle=".tile-drag-handle"
          onLayoutChange={(l) => onLayoutChange(l.map((it) => ({ i: it.i, x: it.x, y: it.y, w: it.w, h: it.h })))}
        >
          {spec.layout.map((item) => {
            const tile = tilesById.get(item.i)
            if (!tile) return <div key={item.i} />
            const isSel = selectedId === tile.id
            return (
              <div
                key={item.i}
                onClick={(e) => { e.stopPropagation(); onSelect(tile.id) }}
                className={`group rounded-lg border bg-[#0c1017] overflow-hidden flex flex-col transition-colors ${isSel ? "border-blue-400/60 ring-1 ring-blue-400/40" : "border-white/[0.06] hover:border-white/[0.12]"}`}
              >
                <div className="flex items-center justify-between px-2 py-1 border-b border-white/[0.04] bg-white/[0.02]">
                  <div className="flex items-center gap-1 min-w-0">
                    <button className="tile-drag-handle cursor-move text-white/30 hover:text-white/70 px-0.5" title="ドラッグで移動">
                      <GripVertical className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-[11px] font-medium text-white/80 truncate">{tile.title}</span>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); onDuplicate(tile.id) }}
                      title="複製"
                      className="text-white/40 hover:text-white/80 p-0.5"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemove(tile.id) }}
                      title="削除"
                      className="text-white/40 hover:text-red-400 p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  {tile.type === "kpi" ? <KpiTile tile={tile} /> :
                   tile.type === "chart" ? <ChartTile tile={tile} /> :
                   tile.type === "table" ? <TableTile tile={tile} /> :
                   tile.type === "markdown" ? <MarkdownTile tile={tile} /> :
                   tile.type === "filter" ? <FilterTile tile={tile} filters={spec.filters} onChange={onFiltersChange} /> :
                   tile.type === "pivot" ? <PivotTile tile={tile} /> :
                   tile.type === "object" ? <ObjectTile tile={tile} /> :
                   null}
                </div>
              </div>
            )
          })}
        </GridLayout>
      )}
    </div>
  )
}
