"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ContextHeader } from "@/components/context-header"
import { RunStatusGraph } from "@/components/pipeline/RunStatusGraph"
import { pipelineApi, type PipelineDef, type PipelineRun, STATUS_COLOR, NODE_TYPE_META } from "@/lib/pipeline-api"
import { ChevronLeft, Loader2, Clock, ArrowRight } from "lucide-react"

function fmt(d?: string) {
  if (!d) return "—"
  try { return new Date(d).toLocaleString("ja-JP") } catch { return d }
}
function fmtDuration(ms?: number) {
  if (!ms) return "—"
  if (ms < 1000) return `${ms}ms`
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

export default function RunDetailPage() {
  const params = useParams<{ id: string; runId: string }>()
  const id = params?.id
  const runId = params?.runId
  const [pipeline, setPipeline] = useState<PipelineDef | null>(null)
  const [run, setRun] = useState<PipelineRun | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id || !runId) return
    Promise.all([pipelineApi.get(id), pipelineApi.getRun(id, runId)])
      .then(([p, r]) => { setPipeline(p); setRun(r); setSelectedNodeId(r.node_runs[0]?.node_id ?? null) })
      .finally(() => setLoading(false))
  }, [id, runId])

  if (loading || !pipeline || !run) {
    return (
      <div className="flex items-center justify-center h-screen text-white/50 text-[13px]">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> 読み込み中...
      </div>
    )
  }

  const sc = STATUS_COLOR[run.status]
  const selectedNodeRun = run.node_runs.find((nr) => nr.node_id === selectedNodeId)
  const selectedNode = pipeline.nodes.find((n) => n.id === selectedNodeId)

  // lineage: trace upstream
  const lineageUpstream = (nodeId: string): string[] => {
    const result: string[] = []
    const stack = [nodeId]
    const visited = new Set<string>()
    while (stack.length) {
      const cur = stack.pop()!
      if (visited.has(cur)) continue
      visited.add(cur)
      pipeline.edges.filter((e) => e.target === cur).forEach((e) => {
        result.push(e.source)
        stack.push(e.source)
      })
    }
    return result
  }

  return (
    <div className="flex flex-col h-screen">
      <ContextHeader
        title={`Run ${run.id}`}
        description={`${pipeline.name} / branch: ${run.branch} / trigger: ${run.triggered_by}`}
        region="-"
        actions={
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[11px] ${sc.bg} ${sc.fg} border ${sc.border}`}>{sc.label}</span>
            <Link href={`/pipeline/${pipeline.id}/runs`} className="px-2 py-1 rounded text-white/60 hover:bg-white/[0.04] text-[11px] inline-flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5" /> 履歴
            </Link>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="開始" value={fmt(run.started_at)} />
          <Stat label="終了" value={fmt(run.finished_at)} />
          <Stat label="所要時間" value={fmtDuration(run.duration_ms)} />
          <Stat label="ノード成功率" value={`${run.node_runs.filter((n) => n.status === "success").length} / ${run.node_runs.length}`} />
        </div>

        {/* DAG status graph */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <div className="px-4 py-2 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-white/55 font-bold">DAG ステータスビュー</span>
            <span className="text-[10px] text-white/40">ノードをクリックしてログを表示</span>
          </div>
          <div className="h-72 relative">
            <RunStatusGraph nodes={pipeline.nodes} edges={pipeline.edges} run={run} height={288} />
          </div>
        </div>

        {/* Per-node table + selected detail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <div className="px-4 py-2 border-b border-white/[0.06]">
              <span className="text-[11px] uppercase tracking-wider text-white/55 font-bold">ノード実行サマリ</span>
            </div>
            <table className="w-full text-[12px]">
              <thead className="text-white/40 border-b border-white/[0.04]">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">ノード</th>
                  <th className="text-left px-3 py-2 font-medium">タイプ</th>
                  <th className="text-left px-3 py-2 font-medium">ステータス</th>
                  <th className="text-right px-3 py-2 font-medium">所要</th>
                  <th className="text-right px-3 py-2 font-medium">処理行数</th>
                </tr>
              </thead>
              <tbody>
                {run.node_runs.map((nr) => {
                  const n = pipeline.nodes.find((x) => x.id === nr.node_id)
                  const c = STATUS_COLOR[nr.status]
                  const meta = n ? NODE_TYPE_META[n.type] : null
                  const active = selectedNodeId === nr.node_id
                  return (
                    <tr
                      key={nr.node_id}
                      onClick={() => setSelectedNodeId(nr.node_id)}
                      className={`border-b border-white/[0.03] cursor-pointer ${active ? "bg-blue-500/[0.06]" : "hover:bg-white/[0.02]"}`}
                    >
                      <td className="px-4 py-2 text-white/85">{n?.label ?? nr.node_id}</td>
                      <td className="px-3 py-2">
                        {meta && <span className={`text-[10px] ${meta.color}`}>{meta.label}</span>}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${c.bg} ${c.fg}`}>{c.label}</span>
                      </td>
                      <td className="text-right px-3 py-2 font-mono text-white/70">{fmtDuration(nr.duration_ms)}</td>
                      <td className="text-right px-3 py-2 font-mono text-white/70">{nr.rows_processed?.toLocaleString() ?? "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <span className="text-[11px] uppercase tracking-wider text-white/55 font-bold">選択ノード詳細</span>
            {selectedNode && selectedNodeRun ? (
              <div className="mt-3 space-y-3">
                <div>
                  <div className="text-[10px] uppercase text-white/40">ノード</div>
                  <div className="text-[13px] text-white/85 mt-0.5">{selectedNode.label}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-white/40">出力 dataset</div>
                  <div className="text-[12px] text-white/75 font-mono mt-0.5">{selectedNode.config?.target_dataset || "—"}</div>
                </div>

                <div>
                  <div className="text-[10px] uppercase text-white/40">Lineage (上流)</div>
                  <div className="mt-1 space-y-1">
                    {lineageUpstream(selectedNode.id).length === 0 && <div className="text-[10px] text-white/35">(なし)</div>}
                    {lineageUpstream(selectedNode.id).map((upId) => {
                      const up = pipeline.nodes.find((n) => n.id === upId)
                      return (
                        <div key={upId} className="flex items-center gap-1 text-[11px] text-white/70">
                          <ArrowRight className="w-3 h-3 text-white/30" />
                          <span>{up?.label ?? upId}</span>
                          <span className="text-[9px] text-white/30 font-mono">→ {up?.config?.target_dataset || "—"}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase text-white/40 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> 実行時刻
                  </div>
                  <div className="text-[11px] text-white/65 mt-0.5">
                    {fmt(selectedNodeRun.started_at)} → {fmt(selectedNodeRun.finished_at)}
                  </div>
                  <div className="text-[10px] text-white/45 mt-0.5">所要 {fmtDuration(selectedNodeRun.duration_ms)}</div>
                </div>

                <div>
                  <div className="text-[10px] uppercase text-white/40">ログ</div>
                  <pre className="mt-1 px-3 py-2 rounded bg-black/40 border border-white/[0.06] text-[10px] text-white/75 font-mono whitespace-pre-wrap break-words max-h-48 overflow-auto">
                    {selectedNodeRun.error ? `[ERROR] ${selectedNodeRun.error}` : selectedNodeRun.log || "(ログなし)"}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="mt-3 text-[11px] text-white/35">ノードを選択してください</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-white/45">{label}</div>
      <div className="text-[14px] text-white/90 font-mono mt-1">{value}</div>
    </div>
  )
}
