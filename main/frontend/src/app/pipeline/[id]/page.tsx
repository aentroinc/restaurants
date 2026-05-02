"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { ContextHeader } from "@/components/context-header"
import { PipelineCanvas } from "@/components/pipeline/PipelineCanvas"
import { NodeConfigPanel } from "@/components/pipeline/NodeConfigPanel"
import { ScheduleDialog } from "@/components/pipeline/ScheduleDialog"
import {
  pipelineApi,
  type PipelineDef,
  type PipelineNode,
  type PipelineNodeType,
  NODE_TYPE_META,
} from "@/lib/pipeline-api"
import {
  Database, Code2, ShieldCheck, Send, Sparkles, Save, Play, Calendar, GitBranch, Loader2, History, ChevronLeft, Sparkle,
} from "lucide-react"

const PALETTE: { type: PipelineNodeType; Icon: React.ComponentType<{ className?: string }> }[] = [
  { type: "connector_fetch", Icon: Database },
  { type: "transform_sql", Icon: Code2 },
  { type: "validate", Icon: ShieldCheck },
  { type: "writeback", Icon: Send },
  { type: "python_func", Icon: Sparkles },
]

export default function PipelineEditorPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [pipeline, setPipeline] = useState<PipelineDef | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [branches, setBranches] = useState<string[]>(["main"])
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      pipelineApi.get(id),
      pipelineApi.listBranches(id),
    ]).then(([p, brs]) => {
      setPipeline(p)
      setBranches(brs.map((b) => b.name).length ? brs.map((b) => b.name) : ["main"])
    }).finally(() => setLoading(false))
  }, [id])

  const selectedNode = useMemo(
    () => pipeline?.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [pipeline, selectedNodeId],
  )

  const updatePipeline = (patch: Partial<PipelineDef>) => {
    setPipeline((p) => (p ? { ...p, ...patch } : p))
  }

  const handleAddNode = (type: PipelineNodeType, position: { x: number; y: number }) => {
    if (!pipeline) return
    const n: PipelineNode = {
      id: `n_${Date.now()}`,
      type,
      label: NODE_TYPE_META[type].label,
      position,
      config: {},
    }
    updatePipeline({ nodes: [...pipeline.nodes, n] })
    setSelectedNodeId(n.id)
  }

  const handleMoveNode = (nodeId: string, position: { x: number; y: number }) => {
    if (!pipeline) return
    updatePipeline({
      nodes: pipeline.nodes.map((n) => (n.id === nodeId ? { ...n, position } : n)),
    })
  }

  const handleDeleteNode = (nodeId: string) => {
    if (!pipeline) return
    updatePipeline({
      nodes: pipeline.nodes.filter((n) => n.id !== nodeId),
      edges: pipeline.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    })
    if (selectedNodeId === nodeId) setSelectedNodeId(null)
  }

  const handleConnect = (source: string, target: string) => {
    if (!pipeline) return
    if (source === target) return
    if (pipeline.edges.some((e) => e.source === source && e.target === target)) return
    // simple cycle prevention
    const wouldCycle = (s: string, t: string): boolean => {
      const stack = [t]
      const visited = new Set<string>()
      while (stack.length) {
        const cur = stack.pop()!
        if (cur === s) return true
        if (visited.has(cur)) continue
        visited.add(cur)
        pipeline.edges.filter((e) => e.source === cur).forEach((e) => stack.push(e.target))
      }
      return false
    }
    if (wouldCycle(source, target)) {
      setStatusMsg("循環参照は作成できません")
      setTimeout(() => setStatusMsg(null), 2500)
      return
    }
    updatePipeline({
      edges: [...pipeline.edges, { id: `e_${Date.now()}`, source, target }],
    })
  }

  const handleDeleteEdge = (edgeId: string) => {
    if (!pipeline) return
    updatePipeline({ edges: pipeline.edges.filter((e) => e.id !== edgeId) })
  }

  const handleNodeChange = (patch: Partial<PipelineNode>) => {
    if (!pipeline || !selectedNodeId) return
    updatePipeline({
      nodes: pipeline.nodes.map((n) => (n.id === selectedNodeId ? { ...n, ...patch } : n)),
    })
  }

  const handleSave = async () => {
    if (!pipeline) return
    setSaving(true)
    try {
      const updated = await pipelineApi.update(pipeline.id, pipeline)
      setPipeline(updated)
      setStatusMsg("保存しました")
    } catch {
      setStatusMsg("保存失敗 (mock を更新)")
    } finally {
      setSaving(false)
      setTimeout(() => setStatusMsg(null), 2000)
    }
  }

  const handleRun = async () => {
    if (!pipeline) return
    setRunning(true)
    try {
      const run = await pipelineApi.run(pipeline.id, pipeline.branch || "main")
      router.push(`/pipeline/${pipeline.id}/runs/${run.id}`)
    } finally {
      setRunning(false)
    }
  }

  const handleSaveSchedule = async (cron: string, branch: string, description: string) => {
    if (!pipeline) return
    await pipelineApi.createSchedule(pipeline.id, { cron, branch, description, enabled: true })
    updatePipeline({ schedule: cron })
    setStatusMsg(`スケジュール登録: ${cron} (${branch})`)
    setTimeout(() => setStatusMsg(null), 2500)
  }

  if (loading || !pipeline) {
    return (
      <div className="flex items-center justify-center h-screen text-white/50 text-[13px]">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> 読み込み中...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <ContextHeader
        title={pipeline.name}
        description={pipeline.description || "DAG パイプラインエディタ"}
        region="-"
        actions={
          <div className="flex items-center gap-2">
            {statusMsg && <span className="text-[11px] text-blue-300 mr-1">{statusMsg}</span>}
            <Link
              href={`/pipeline/v2/${pipeline.id}`}
              className="px-2 py-1 rounded bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 text-[11px] inline-flex items-center gap-1 border border-purple-400/30"
            >
              <Sparkle className="w-3 h-3" /> 新エディタへ
            </Link>
            <Link
              href="/pipeline"
              className="px-2 py-1 rounded text-white/60 hover:bg-white/[0.04] text-[11px] inline-flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> 一覧
            </Link>
            <Link
              href={`/pipeline/${pipeline.id}/runs`}
              className="px-2 py-1 rounded text-white/60 hover:bg-white/[0.04] text-[11px] inline-flex items-center gap-1"
            >
              <History className="w-3.5 h-3.5" /> 実行履歴
            </Link>
            <span className="px-2 py-1 rounded bg-white/[0.04] text-white/70 text-[11px] inline-flex items-center gap-1">
              <GitBranch className="w-3 h-3" /> {pipeline.branch}
            </span>
            <button
              onClick={() => setScheduleOpen(true)}
              className="px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-white/70 text-[11px] inline-flex items-center gap-1"
            >
              <Calendar className="w-3 h-3" /> スケジュール
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-2.5 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-[11px] inline-flex items-center gap-1 disabled:opacity-40"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} 保存
            </button>
            <button
              onClick={handleRun}
              disabled={running}
              className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] inline-flex items-center gap-1 disabled:opacity-40"
            >
              {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} 実行
            </button>
          </div>
        }
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: palette */}
        <aside className="w-56 border-r border-white/[0.06] bg-[#0c1017] overflow-y-auto shrink-0">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <div className="text-[10px] uppercase tracking-wider text-white/45 font-bold">ノードパレット</div>
            <div className="text-[10px] text-white/35 mt-1">ドラッグ & ドロップ</div>
          </div>
          <div className="p-3 space-y-2">
            {PALETTE.map(({ type, Icon }) => {
              const meta = NODE_TYPE_META[type]
              return (
                <div
                  key={type}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("application/x-pipeline-node", type)}
                  className={`px-3 py-2 rounded border ${meta.border} ${meta.bg} cursor-grab active:cursor-grabbing hover:brightness-125 transition`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${meta.color}`} />
                    <div className={`text-[11px] font-bold uppercase tracking-wider ${meta.color}`}>{meta.label}</div>
                  </div>
                  <div className="text-[10px] text-white/45 mt-1">{meta.description}</div>
                </div>
              )
            })}
          </div>

          <div className="px-4 py-3 border-t border-white/[0.06]">
            <div className="text-[10px] uppercase tracking-wider text-white/45 font-bold mb-2">操作</div>
            <ul className="text-[10px] text-white/55 space-y-1">
              <li>• ノードをドラッグで配置</li>
              <li>• 右側のポートで接続開始</li>
              <li>• 左側のポートで接続完了</li>
              <li>• エッジクリックで削除</li>
            </ul>
          </div>
        </aside>

        {/* Center: canvas */}
        <div className="flex-1 relative overflow-hidden">
          <PipelineCanvas
            nodes={pipeline.nodes}
            edges={pipeline.edges}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onMoveNode={handleMoveNode}
            onAddNode={handleAddNode}
            onDeleteNode={handleDeleteNode}
            onConnect={handleConnect}
            onDeleteEdge={handleDeleteEdge}
          />
        </div>

        {/* Right: properties */}
        <aside className="w-80 border-l border-white/[0.06] bg-[#0c1017] shrink-0 flex flex-col">
          {selectedNode ? (
            <NodeConfigPanel node={selectedNode} onChange={handleNodeChange} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-white/30 text-[12px] text-center px-6">
              <div>ノードを選択するとプロパティが表示されます</div>
              <div className="text-[10px] mt-2 text-white/25">
                ノード数: {pipeline.nodes.length} / エッジ数: {pipeline.edges.length}
              </div>
            </div>
          )}
        </aside>
      </div>

      <ScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        branches={branches}
        onSave={handleSaveSchedule}
        initialCron={pipeline.schedule}
        initialBranch={pipeline.branch}
      />
    </div>
  )
}
