"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ContextHeader } from "@/components/context-header"
import { RunStatusGraph } from "@/components/pipeline/RunStatusGraph"
import { pipelineApi, type PipelineDef, type PipelineRun, STATUS_COLOR } from "@/lib/pipeline-api"
import { ChevronLeft, ChevronRight, Loader2, Clock } from "lucide-react"

function fmt(d?: string) {
  if (!d) return "—"
  try { return new Date(d).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) }
  catch { return d }
}
function fmtDuration(ms?: number) {
  if (!ms) return "—"
  if (ms < 1000) return `${ms}ms`
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

export default function RunsListPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [pipeline, setPipeline] = useState<PipelineDef | null>(null)
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([pipelineApi.get(id), pipelineApi.listRuns(id)])
      .then(([p, rs]) => { setPipeline(p); setRuns(rs); if (rs[0]) setExpanded(rs[0].id) })
      .finally(() => setLoading(false))
  }, [id])

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
        title={`${pipeline.name} — 実行履歴`}
        description={`${runs.length} 件の実行ログ`}
        region="-"
        actions={
          <Link href={`/pipeline/${pipeline.id}`} className="px-2 py-1 rounded text-white/60 hover:bg-white/[0.04] text-[11px] inline-flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" /> エディタへ戻る
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {runs.length === 0 && (
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-10 text-center text-white/40 text-[12px]">
            まだ実行履歴がありません
          </div>
        )}

        {runs.map((run) => {
          const sc = STATUS_COLOR[run.status]
          const open = expanded === run.id
          return (
            <div key={run.id} className={`rounded-lg border ${sc.border} ${open ? "bg-white/[0.02]" : "bg-white/[0.01]"}`}>
              <button
                onClick={() => setExpanded(open ? null : run.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition"
              >
                <ChevronRight className={`w-4 h-4 text-white/40 transition-transform ${open ? "rotate-90" : ""}`} />
                <span className={`px-2 py-0.5 rounded text-[10px] ${sc.bg} ${sc.fg} border ${sc.border}`}>{sc.label}</span>
                <span className="font-mono text-[11px] text-white/70">{run.id}</span>
                <span className="text-[10px] text-white/40 inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {fmt(run.started_at)} ・ {fmtDuration(run.duration_ms)}
                </span>
                <span className="text-[10px] text-white/45 ml-auto">
                  trigger: {run.triggered_by} / branch: {run.branch}
                </span>
                <Link
                  href={`/pipeline/${pipeline.id}/runs/${run.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="px-2 py-0.5 rounded bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 text-[10px]"
                >
                  詳細
                </Link>
              </button>

              {open && (
                <div className="px-4 pb-4">
                  <RunStatusGraph nodes={pipeline.nodes} edges={pipeline.edges} run={run} height={200} />
                  <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {run.node_runs.map((nr) => {
                      const node = pipeline.nodes.find((n) => n.id === nr.node_id)
                      const c = STATUS_COLOR[nr.status]
                      return (
                        <div key={nr.node_id} className={`rounded border ${c.border} ${c.bg} px-3 py-2`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-white/85 font-medium truncate">{node?.label ?? nr.node_id}</span>
                            <span className={`text-[9px] uppercase font-bold ${c.fg}`}>{c.label}</span>
                          </div>
                          <div className="text-[10px] text-white/50 mt-1 font-mono">
                            {fmtDuration(nr.duration_ms)} {nr.rows_processed != null && `· ${nr.rows_processed.toLocaleString()} rows`}
                          </div>
                          {nr.error && <div className="text-[10px] text-red-300 mt-1 truncate">{nr.error}</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
