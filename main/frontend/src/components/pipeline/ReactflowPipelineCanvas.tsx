"use client"

import { useCallback, useMemo } from "react"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type NodeProps,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  ConnectionMode,
  Handle,
  Position,
  MarkerType,
} from "reactflow"
import "reactflow/dist/style.css"

import {
  type PipelineNode,
  type PipelineEdge,
  type PipelineNodeType,
  NODE_TYPE_META,
} from "@/lib/pipeline-api"
import { Database, Code2, ShieldCheck, Send, Sparkles } from "lucide-react"

const NODE_ICON: Record<PipelineNodeType, React.ComponentType<{ className?: string }>> = {
  connector_fetch: Database,
  transform_sql: Code2,
  validate: ShieldCheck,
  writeback: Send,
  python_func: Sparkles,
}

// カスタムノード — 5 種それぞれ NODE_TYPE_META を流用してスタイル
function PipelineNodeView({ data, selected }: NodeProps) {
  const nodeType = data.nodeType as PipelineNodeType
  const meta = NODE_TYPE_META[nodeType]
  const Icon = NODE_ICON[nodeType]
  const status = data.status as string | undefined

  return (
    <div
      className={`relative rounded-lg border ${meta.border} ${meta.bg} backdrop-blur-sm w-[200px] h-[70px] ${selected ? "ring-2 ring-blue-400/60 shadow-lg shadow-blue-500/10" : ""}`}
    >
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-[#0a0e14] !border !border-white/40" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-[#0a0e14] !border !border-white/40" />

      <div className="flex items-center gap-2 px-3 pt-2">
        <div className={`w-6 h-6 rounded ${meta.bg} ${meta.color} flex items-center justify-center shrink-0`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-[9px] uppercase tracking-wider ${meta.color} font-bold`}>{meta.label}</div>
          <div className="text-[12px] text-white/85 truncate font-medium">{data.label}</div>
        </div>
      </div>
      <div className="px-3 pb-2 mt-1 text-[10px] text-white/45 truncate">
        {data.config?.target_dataset || data.config?.connector_id || data.config?.sql?.slice(0, 40) || meta.description}
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
}

const NODE_TYPES = {
  connector_fetch: PipelineNodeView,
  transform_sql: PipelineNodeView,
  validate: PipelineNodeView,
  writeback: PipelineNodeView,
  python_func: PipelineNodeView,
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

export function ReactflowPipelineCanvas({
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
  // PipelineNode → reactflow Node 変換
  const rfNodes = useMemo<Node[]>(
    () => nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: {
        label: n.label,
        nodeType: n.type,
        config: n.config,
        status: nodeStatusMap?.[n.id],
      },
      selected: n.id === selectedNodeId,
    })),
    [nodes, selectedNodeId, nodeStatusMap],
  )

  // PipelineEdge → reactflow Edge 変換
  const rfEdges = useMemo<Edge[]>(
    () => edges.map((e) => {
      const sourceStatus = nodeStatusMap?.[e.source]
      const stroke = sourceStatus === "success" ? "rgba(52,211,153,0.85)"
        : sourceStatus === "failed" ? "rgba(248,113,113,0.7)"
        : "rgba(96,165,250,0.7)"
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: "smoothstep",
        animated: sourceStatus === "running",
        style: { stroke, strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
      }
    }),
    [edges, nodeStatusMap],
  )

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    if (readOnly) return
    // applyNodeChanges は表示状態を再計算するためだけに使い、実体は親に通知
    applyNodeChanges(changes, rfNodes)
    for (const c of changes) {
      if (c.type === "position" && c.position && c.dragging === false) {
        onMoveNode(c.id, c.position)
      } else if (c.type === "position" && c.position) {
        // ドラッグ中も親 state を更新（楽観反映）
        onMoveNode(c.id, c.position)
      } else if (c.type === "remove") {
        onDeleteNode(c.id)
      } else if (c.type === "select") {
        if (c.selected) onSelectNode(c.id)
      }
    }
  }, [readOnly, rfNodes, onMoveNode, onDeleteNode, onSelectNode])

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    if (readOnly) return
    applyEdgeChanges(changes, rfEdges)
    for (const c of changes) {
      if (c.type === "remove") onDeleteEdge(c.id)
    }
  }, [readOnly, rfEdges, onDeleteEdge])

  const handleConnect = useCallback((conn: Connection) => {
    if (readOnly) return
    if (!conn.source || !conn.target) return
    if (conn.source === conn.target) return
    onConnect(conn.source, conn.target)
    // addEdge を呼ぶ必要はない（親 state 経由で props として降りてくる）
    return addEdge(conn, rfEdges)
  }, [readOnly, onConnect, rfEdges])

  // パレットからのドラッグ＆ドロップ
  const onCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (readOnly) return
    const type = e.dataTransfer.getData("application/x-pipeline-node") as PipelineNodeType
    if (!type) return
    const bounds = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    onAddNode(type, { x: e.clientX - bounds.left - 100, y: e.clientY - bounds.top - 35 })
  }, [readOnly, onAddNode])

  const onCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }, [])

  const handlePaneClick = useCallback(() => {
    onSelectNode(null)
  }, [onSelectNode])

  return (
    <div
      className="w-full h-full"
      onDrop={onCanvasDrop}
      onDragOver={onCanvasDragOver}
      style={{ background: "#0a0e14" }}
    >
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={NODE_TYPES}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onPaneClick={handlePaneClick}
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={{
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed },
        }}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.0 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="rgba(255,255,255,0.06)" gap={20} />
        <Controls className="!bg-[#0c1017] !border !border-white/10 [&>button]:!bg-[#0c1017] [&>button]:!border-white/10 [&>button]:!text-white/70" />
        <MiniMap
          className="!bg-[#0c1017] !border !border-white/10"
          nodeColor={() => "#1e293b"}
          maskColor="rgba(10,14,20,0.7)"
        />
      </ReactFlow>
    </div>
  )
}
