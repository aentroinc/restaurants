"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ContextHeader } from "@/components/context-header"
import { Button } from "@/components/ui/button"
import { Save, ArrowLeft, FileText, FilePlus2, Layers } from "lucide-react"
import { CanvasGrid } from "@/components/canvas/CanvasGrid"
import { AddTilePalette } from "@/components/canvas/AddTilePalette"
import { PropertyPanel } from "@/components/canvas/PropertyPanel"
import {
  type CanvasSpec, type GridItem, type Tile, type TileType, type SharedFilter,
  makeEmptySpec, genTileId,
} from "@/lib/canvas-spec"
import { CANVAS_TEMPLATES } from "@/lib/canvas-templates"
import {
  type CanvasAnalysis, listAnalyses, createAnalysis, saveAnalysis,
} from "@/lib/canvas-api"
import { formatDate } from "@/lib/utils"

interface Props {
  initialAnalysisId?: string
  initialAnalysis?: CanvasAnalysis | null
}

function defaultTile(type: TileType, idx: number): Tile {
  const id = genTileId(type)
  switch (type) {
    case "kpi":
      return { id, type, title: "KPI", kpi: "net_sales", comparePrev: true, showSparkline: true, color: "#3b82f6" }
    case "chart":
      return { id, type, title: "チャート", chartKind: "bar", kpi: "net_sales", groupBy: "brand", color: "#3b82f6" }
    case "table":
      return { id, type, title: "テーブル", kpis: ["net_sales", "operating_profit_rate"], groupBy: "store" }
    case "markdown":
      return { id, type, title: "メモ", body: "## メモ\nここに自由に書けます" }
    case "filter":
      return { id, type, title: "共有フィルタ" }
    case "pivot":
      return { id, type, title: "ピボット", kpi: "net_sales", rows: "brand", cols: "month" }
  }
  // fallback (should be unreachable)
  return { id: `t-${idx}`, type: "markdown", title: "メモ", body: "" }
}

function defaultLayout(type: TileType, id: string, yOffset: number): GridItem {
  const sizes: Record<TileType, { w: number; h: number }> = {
    kpi: { w: 4, h: 3 },
    chart: { w: 6, h: 5 },
    table: { w: 12, h: 6 },
    markdown: { w: 6, h: 4 },
    filter: { w: 12, h: 2 },
    pivot: { w: 12, h: 6 },
  }
  return { i: id, x: 0, y: yOffset, ...sizes[type] }
}

export function CanvasEditor({ initialAnalysisId, initialAnalysis }: Props) {
  const router = useRouter()
  const [analysisId, setAnalysisId] = useState<string | undefined>(initialAnalysisId)
  const [name, setName] = useState(initialAnalysis?.name ?? "新しいキャンバス")
  const [spec, setSpec] = useState<CanvasSpec>(initialAnalysis?.spec ?? makeEmptySpec())
  const [analyses, setAnalyses] = useState<CanvasAnalysis[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  // 左ペイン: Analysis 一覧
  useEffect(() => {
    listAnalyses().then(setAnalyses).catch(() => setAnalyses([]))
  }, [])

  const selectedTile = useMemo(
    () => spec.tiles.find((t) => t.id === selectedId) ?? null,
    [spec.tiles, selectedId]
  )

  const addTile = useCallback((type: TileType) => {
    const tile = defaultTile(type, spec.tiles.length)
    const yMax = spec.layout.reduce((m, it) => Math.max(m, it.y + it.h), 0)
    const item = defaultLayout(type, tile.id, yMax)
    setSpec((s) => ({ ...s, tiles: [...s.tiles, tile], layout: [...s.layout, item] }))
    setSelectedId(tile.id)
  }, [spec.tiles.length, spec.layout])

  const updateTile = useCallback((next: Tile) => {
    setSpec((s) => ({ ...s, tiles: s.tiles.map((t) => (t.id === next.id ? next : t)) }))
  }, [])

  const removeTile = useCallback((id: string) => {
    setSpec((s) => ({ ...s, tiles: s.tiles.filter((t) => t.id !== id), layout: s.layout.filter((it) => it.i !== id) }))
    setSelectedId((sel) => (sel === id ? null : sel))
  }, [])

  const duplicateTile = useCallback((id: string) => {
    const t = spec.tiles.find((x) => x.id === id)
    const it = spec.layout.find((x) => x.i === id)
    if (!t || !it) return
    const newId = genTileId(t.type)
    const cloneTile = { ...t, id: newId, title: `${t.title} (複製)` } as Tile
    const yMax = spec.layout.reduce((m, x) => Math.max(m, x.y + x.h), 0)
    const cloneItem: GridItem = { i: newId, x: 0, y: yMax, w: it.w, h: it.h }
    setSpec((s) => ({ ...s, tiles: [...s.tiles, cloneTile], layout: [...s.layout, cloneItem] }))
    setSelectedId(newId)
  }, [spec.tiles, spec.layout])

  const onLayoutChange = useCallback((layout: GridItem[]) => {
    setSpec((s) => ({ ...s, layout }))
  }, [])

  const onFiltersChange = useCallback((filters: SharedFilter) => {
    setSpec((s) => ({ ...s, filters }))
  }, [])

  const applyTemplate = useCallback((key: string) => {
    const t = CANVAS_TEMPLATES.find((x) => x.key === key)
    if (!t) return
    setSpec(JSON.parse(JSON.stringify(t.spec)))
    setName(t.name)
    setSelectedId(null)
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      if (analysisId) {
        await saveAnalysis(analysisId, { name, spec })
      } else {
        const created = await createAnalysis({ name, spec, visibility: "private" })
        setAnalysisId(created.id)
        router.replace(`/workspace/canvas/${created.id}`)
      }
      setSavedAt(new Date().toLocaleTimeString("ja-JP"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-full bg-[#0a0e14] text-white/80 flex flex-col h-screen">
      <ContextHeader
        title="キャンバス（自由ダッシュボード）"
        description="ドラッグ&ドロップでKPI・チャートを配置 / Analysis として保存"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent border-white/[0.1] text-white/70 hover:bg-white/[0.06] h-7 text-[11px]"
              onClick={() => router.push("/workspace")}
            >
              <ArrowLeft className="h-3 w-3 mr-1" /> ワークスペースへ
            </Button>
            {savedAt && <span className="text-[10px] text-white/40">保存済み {savedAt}</span>}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-500 hover:bg-blue-600 text-white h-7 text-[11px]"
            >
              <Save className="h-3 w-3 mr-1" />
              {saving ? "保存中..." : analysisId ? "上書き保存" : "新規保存"}
            </Button>
          </div>
        }
      />

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-white/[0.06] bg-[#0c1017]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="text-[13px] font-medium bg-transparent border-0 border-b border-white/[0.06] focus:outline-none focus:border-white/30 text-white/90 px-1 py-0.5 min-w-[200px] max-w-[320px]"
          placeholder="キャンバス名"
        />
        <div className="h-4 w-px bg-white/[0.08]" />
        <AddTilePalette onAdd={addTile} />
        <div className="h-4 w-px bg-white/[0.08]" />
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-white/40 mr-1">テンプレ:</span>
          {CANVAS_TEMPLATES.map((t) => (
            <button
              key={t.key}
              onClick={() => applyTemplate(t.key)}
              className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.06] text-white/65 hover:bg-white/[0.06] hover:text-white/90"
              title={t.description}
            >
              <Layers className="h-3 w-3" />
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* 3-pane layout */}
      <div className="flex-1 min-h-0 grid grid-cols-[240px_1fr_300px]">
        {/* 左: Analysis 一覧 */}
        <aside className="border-r border-white/[0.06] bg-[#0b0f15] overflow-auto">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-white/40">マイ分析</span>
              <button
                onClick={() => {
                  setAnalysisId(undefined)
                  setName("新しいキャンバス")
                  setSpec(makeEmptySpec())
                  setSelectedId(null)
                  router.replace("/workspace/canvas")
                }}
                className="text-[10px] text-white/50 hover:text-white/90 inline-flex items-center gap-1"
              >
                <FilePlus2 className="h-3 w-3" /> 新規
              </button>
            </div>
            {analyses.length === 0 ? (
              <div className="text-[11px] text-white/30 py-4 text-center">分析がありません</div>
            ) : (
              <div className="space-y-1">
                {analyses.map((a) => {
                  const active = a.id === analysisId
                  return (
                    <button
                      key={a.id}
                      onClick={() => router.push(`/workspace/canvas/${a.id}`)}
                      className={`w-full text-left rounded p-2 transition-colors ${active ? "bg-blue-500/15 border border-blue-400/30" : "hover:bg-white/[0.04] border border-transparent"}`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileText className="h-3 w-3 text-white/40 shrink-0" />
                        <span className="text-[12px] text-white/85 truncate">{a.name}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-white/30 font-mono tabular-nums">{formatDate(a.created_at)}</span>
                        <span className="text-[10px] text-white/30">{a.spec.tiles?.length ?? 0} タイル</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </aside>

        {/* 中央: キャンバス */}
        <main className="bg-[#0a0e14] overflow-hidden">
          <CanvasGrid
            spec={spec}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onLayoutChange={onLayoutChange}
            onFiltersChange={onFiltersChange}
            onRemove={removeTile}
            onDuplicate={duplicateTile}
          />
        </main>

        {/* 右: プロパティ */}
        <aside className="border-l border-white/[0.06] bg-[#0b0f15] overflow-hidden">
          <PropertyPanel tile={selectedTile} onChange={updateTile} />
        </aside>
      </div>
    </div>
  )
}
