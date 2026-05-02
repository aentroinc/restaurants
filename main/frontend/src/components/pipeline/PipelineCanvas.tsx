"use client"

import { useCallback, useRef, useState } from "react"
import {
  type PipelineNode,
  type PipelineEdge,
  type PipelineNodeType,
  NODE_TYPE_META,
} from "@/lib/pipeline-api"
import { Database, Code2, ShieldCheck, Send, Sparkles, X, Trash2 } from "lucide-react"

const NODE_W = 200
const NODE_H = 70

const NODE_ICON: Record<PipelineNodeType, React.ComponentType<{ className?: string }>> = {
  connector_fetch: Database,
  transform_sql: Code2,
  validate: ShieldCheck,
  writeback: Send,
  python_func: Sparkles,
}

interface Props {
  nodes: PipelineNode[]
  edges: PipelineEdge[]
  selectedNodeId: string | null
  onSelectNode: (id: string | null) => void
  onMoveNode: (id: string, position: { x: number; y: number }) => void
  onAddNode: (type: PipelineNodeType, position: { x: number; y: number }) => void
  onDeleteNode: (id: string) => void
  onConnect: (source: string, target: string) => void
  onDeleteEdge: (id: string) => void
  readOnly?: boolean
  nodeStatusMap?: Record<string, "success" | "failed" | "running" | "skipped" | "pending">
}

export function PipelineCanvas({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onMoveNode,
  onAddNode,
  onDeleteNode,
  onConnect,
  onDeleteEdge,
  readOnly = false,
  nodeStatusMap,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null)
  const [connectFrom, setConnectFrom] = useState<string | null>(null)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null)

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setHoverPos({ x, y })
    if (drag) {
      onMoveNode(drag.id, { x: x - drag.offsetX, y: y - drag.offsetY })
    }
  }, [drag, onMoveNode])

  const onMouseUp = useCallback(() => setDrag(null), [])

  const onCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData("application/x-pipeline-node") as PipelineNodeType
    if (!type) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    onAddNode(type, { x: e.clientX - rect.left - NODE_W / 2, y: e.clientY - rect.top - NODE_H / 2 })
  }, [onAddNode])

  const onCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }, [])

  const handleNodeMouseDown = (e: React.MouseEvent, n: PipelineNode) => {
    if (readOnly) return
    e.stopPropagation()
    onSelectNode(n.id)
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    setDrag({
      id: n.id,
      offsetX: e.clientX - rect.left - n.position.x,
      offsetY: e.clientY - rect.top - n.position.y,
    })
  }

  const handlePortClick = (e: React.MouseEvent, nodeId: string, side: "in" | "out") => {
    if (readOnly) return
    e.stopPropagation()
    if (side === "out") {
      setConnectFrom(nodeId)
      return
    }
    if (connectFrom && connectFrom !== nodeId) {
      onConnect(connectFrom, nodeId)
      setConnectFrom(null)
    }
  }

  const getEdgePath = (s: PipelineNode, t: PipelineNode) => {
    const x1 = s.position.x + NODE_W
    const y1 = s.position.y + NODE_H / 2
    const x2 = t.position.x
    const y2 = t.position.y + NODE_H / 2
    const dx = Math.max(40, (x2 - x1) / 2)
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
  }

  return (
    <div
      ref={canvasRef}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onDrop={onCanvasDrop}
      onDragOver={onCanvasDragOver}
      onClick={() => { onSelectNode(null); setConnectFrom(null) }}
      className="relative w-full h-full overflow-auto bg-[#0a0e14]"
      style={{
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      {/* edges (svg) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minWidth: 1600, minHeight: 800 }}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(96,165,250,0.7)" />
          </marker>
          <marker id="arrow-success" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(52,211,153,0.85)" />
          </marker>
        </defs>
        {edges.map((e) => {
          const s = nodes.find((n) => n.id === e.source)
          const t = nodes.find((n) => n.id === e.target)
          if (!s || !t) return null
          const sourceStatus = nodeStatusMap?.[s.id]
          const stroke = sourceStatus === "success" ? "rgba(52,211,153,0.85)" : sourceStatus === "failed" ? "rgba(248,113,113,0.7)" : "rgba(96,165,250,0.5)"
          const marker = sourceStatus === "success" ? "url(#arrow-success)" : "url(#arrow)"
          return (
            <g key={e.id} className="pointer-events-auto cursor-pointer" onClick={(ev) => { ev.stopPropagation(); if (!readOnly) onDeleteEdge(e.id) }}>
              <path d={getEdgePath(s, t)} fill="none" stroke={stroke} strokeWidth={2} markerEnd={marker} />
            </g>
          )
        })}
        {/* preview line for in-progress connection */}
        {connectFrom && hoverPos && (() => {
          const s = nodes.find((n) => n.id === connectFrom)
          if (!s) return null
          const x1 = s.position.x + NODE_W
          const y1 = s.position.y + NODE_H / 2
          return <line x1={x1} y1={y1} x2={hoverPos.x} y2={hoverPos.y} stroke="rgba(96,165,250,0.6)" strokeWidth={2} strokeDasharray="4 3" />
        })()}
      </svg>

      {/* nodes */}
      {nodes.map((n) => {
        const meta = NODE_TYPE_META[n.type]
        const Icon = NODE_ICON[n.type]
        const isSelected = selectedNodeId === n.id
        const status = nodeStatusMap?.[n.id]
        const statusRing = status === "success" ? "ring-emerald-400/60" : status === "failed" ? "ring-red-400/70" : status === "running" ? "ring-blue-400/70 animate-pulse" : status === "skipped" ? "ring-white/15" : ""
        return (
          <div
            key={n.id}
            onMouseDown={(e) => handleNodeMouseDown(e, n)}
            onClick={(e) => { e.stopPropagation(); onSelectNode(n.id) }}
            className={`absolute select-none rounded-lg border ${meta.border} ${meta.bg} backdrop-blur-sm transition-shadow ${isSelected ? "ring-2 ring-blue-400/60 shadow-lg shadow-blue-500/10" : statusRing ? `ring-2 ${statusRing}` : ""} ${readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
            style={{ left: n.position.x, top: n.position.y, width: NODE_W, height: NODE_H }}
          >
            {/* in port */}
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => handlePortClick(e, n.id, "in")}
              className={`absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border ${connectFrom && connectFrom !== n.id ? "bg-blue-400 border-blue-200 ring-2 ring-blue-400/30" : "bg-[#0a0e14] border-white/40"} ${readOnly ? "" : "cursor-crosshair"}`}
              title="入力ポート (クリックで接続完了)"
            />
            {/* out port */}
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => handlePortClick(e, n.id, "out")}
              className={`absolute -right-2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border ${connectFrom === n.id ? "bg-blue-400 border-blue-200" : "bg-[#0a0e14] border-white/40"} ${readOnly ? "" : "cursor-crosshair"}`}
              title="出力ポート (クリックで接続開始)"
            />

            <div className="flex items-center gap-2 px-3 pt-2">
              <div className={`w-6 h-6 rounded ${meta.bg} ${meta.color} flex items-center justify-center shrink-0`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-[9px] uppercase tracking-wider ${meta.color} font-bold`}>{meta.label}</div>
                <div className="text-[12px] text-white/85 truncate font-medium">{n.label}</div>
              </div>
              {!readOnly && isSelected && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteNode(n.id) }}
                  className="text-white/40 hover:text-red-400 shrink-0"
                  title="削除"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="px-3 pb-2 mt-1 text-[10px] text-white/45 truncate">
              {n.config?.target_dataset || n.config?.connector_id || n.config?.sql?.slice(0, 40) || meta.description}
            </div>
            {status && (
              <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                status === "success" ? "bg-emerald-500/20 text-emerald-300" :
                status === "failed" ? "bg-red-500/20 text-red-300" :
                status === "running" ? "bg-blue-500/20 text-blue-300" :
                status === "skipped" ? "bg-white/10 text-white/50" :
                "bg-white/[0.04] text-white/40"
              }`}>
                {status}
              </div>
            )}
          </div>
        )
      })}

      {connectFrom && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 text-[11px] text-blue-300 z-10 flex items-center gap-2">
          接続中: 入力ポートをクリック
          <button onClick={(e) => { e.stopPropagation(); setConnectFrom(null) }} className="text-blue-200 hover:text-white">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30 pointer-events-none">
          <div className="text-[14px]">左パレットからノードをドラッグして配置してください</div>
        </div>
      )}
    </div>
  )
}
