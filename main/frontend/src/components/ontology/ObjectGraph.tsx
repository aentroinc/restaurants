"use client"

import { useEffect, useMemo, useState } from "react"
import type { OntoObjectType, OntoLink } from "@/lib/ontology-api"

interface ObjectGraphProps {
  objectTypes: OntoObjectType[]
  links: OntoLink[]
  selectedId?: string | null
  onSelect?: (id: string) => void
}

// reactflow を試行ロード。未インストールでも壊れない。
type ReactFlowExports = any

function useReactFlow(): { mod: ReactFlowExports; loading: boolean } {
  const [mod, setMod] = useState<ReactFlowExports>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    // @ts-ignore - reactflow is an optional dependency loaded at runtime
    import("reactflow")
      .then((m) => { if (alive) { setMod(m); setLoading(false) } })
      .catch(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])
  return { mod, loading }
}

// ============================================
// Layout: 円形配置
// ============================================
function circularLayout(ids: string[], radius = 220): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {}
  const cx = 320, cy = 240
  ids.forEach((id, i) => {
    const angle = (2 * Math.PI * i) / Math.max(ids.length, 1) - Math.PI / 2
    positions[id] = { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius }
  })
  return positions
}

// ============================================
// SVG Fallback (reactflow が無い時)
// ============================================
function SvgGraph({ objectTypes, links, selectedId, onSelect }: ObjectGraphProps) {
  const positions = useMemo(() => circularLayout(objectTypes.map((t) => t.id)), [objectTypes])

  return (
    <svg className="w-full h-full" viewBox="0 0 640 480">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.4)" />
        </marker>
      </defs>
      {links.map((l) => {
        const from = positions[l.from_object_type_id]
        const to = positions[l.to_object_type_id]
        if (!from || !to) return null
        const mx = (from.x + to.x) / 2
        const my = (from.y + to.y) / 2
        return (
          <g key={l.id}>
            <line
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke="rgba(255,255,255,0.18)" strokeWidth={1.2}
              markerEnd="url(#arrow)"
            />
            <text x={mx} y={my} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.45)" className="font-mono">
              {l.cardinality}
            </text>
          </g>
        )
      })}
      {objectTypes.map((t) => {
        const p = positions[t.id]
        if (!p) return null
        const isSelected = t.id === selectedId
        return (
          <g key={t.id} onClick={() => onSelect?.(t.id)} style={{ cursor: "pointer" }}>
            <rect
              x={p.x - 60} y={p.y - 22} width={120} height={44} rx={8}
              fill={isSelected ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.04)"}
              stroke={isSelected ? "rgba(96,165,250,0.6)" : "rgba(255,255,255,0.1)"}
              strokeWidth={1.2}
            />
            <text x={p.x} y={p.y - 2} textAnchor="middle" fontSize="14" fill="white">
              {t.icon}
            </text>
            <text x={p.x} y={p.y + 14} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.85)" fontWeight={500}>
              {t.display_name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ============================================
// ReactFlow Graph
// ============================================
function FlowGraph({ objectTypes, links, selectedId, onSelect, mod }: ObjectGraphProps & { mod: ReactFlowExports }) {
  const { ReactFlow, Background, Controls, MarkerType } = mod as any

  const positions = useMemo(() => circularLayout(objectTypes.map((t) => t.id)), [objectTypes])

  const nodes = objectTypes.map((t) => ({
    id: t.id,
    position: positions[t.id] || { x: 0, y: 0 },
    data: { label: `${t.icon} ${t.display_name}` },
    style: {
      background: t.id === selectedId ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.04)",
      color: "rgba(255,255,255,0.85)",
      border: t.id === selectedId ? "1px solid rgba(96,165,250,0.6)" : "1px solid rgba(255,255,255,0.1)",
      borderRadius: 8,
      fontSize: 12,
      padding: "8px 12px",
      width: 140,
    },
  }))

  const edges = links.map((l) => ({
    id: l.id,
    source: l.from_object_type_id,
    target: l.to_object_type_id,
    label: l.cardinality,
    type: "smoothstep",
    animated: false,
    style: { stroke: "rgba(255,255,255,0.25)" },
    labelStyle: { fill: "rgba(255,255,255,0.55)", fontSize: 10, fontFamily: "monospace" },
    labelBgStyle: { fill: "#0c1017" },
    markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(255,255,255,0.45)" },
  }))

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        onNodeClick={(_: unknown, node: { id: string }) => onSelect?.(node.id)}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="rgba(255,255,255,0.06)" gap={24} />
        <Controls showInteractive={false} className="!bg-white/[0.04] !border !border-white/[0.08]" />
      </ReactFlow>
    </div>
  )
}

// ============================================
// Public component
// ============================================
export default function ObjectGraph(props: ObjectGraphProps) {
  const { mod, loading } = useReactFlow()

  if (loading) {
    return <div className="w-full h-full flex items-center justify-center text-white/30 text-[12px]">グラフを読み込み中...</div>
  }
  if (mod) {
    return <FlowGraph {...props} mod={mod} />
  }
  return <SvgGraph {...props} />
}
