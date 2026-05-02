"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ContextHeader } from "@/components/context-header"
import { pipelineApi, type PipelineDef, STATUS_COLOR } from "@/lib/pipeline-api"
import { Plus, Play, Calendar, GitBranch, ChevronRight, Workflow, Loader2 } from "lucide-react"

function fmt(d?: string) {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
  } catch { return d }
}

export default function PipelineListPage() {
  const router = useRouter()
  const [pipelines, setPipelines] = useState<PipelineDef[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    pipelineApi.list().then(setPipelines).finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const created = await pipelineApi.create({ name: "新規パイプライン", nodes: [], edges: [] })
      router.push(`/pipeline/${created.id}`)
    } finally {
      setCreating(false)
    }
  }

  const handleRun = async (e: React.MouseEvent, p: PipelineDef) => {
    e.preventDefault()
    e.stopPropagation()
    const run = await pipelineApi.run(p.id, p.branch || "main")
    router.push(`/pipeline/${p.id}/runs/${run.id}`)
  }

  return (
    <div className="flex flex-col h-screen">
      <ContextHeader
        title="パイプラインビルダー"
        description="DAG 形式でデータパイプラインを設計・実行・スケジュール"
        region="-"
        actions={
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-3 py-1.5 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-[12px] inline-flex items-center gap-1.5 disabled:opacity-40"
          >
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            新規パイプライン
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="rounded-xl border border-blue-400/20 bg-gradient-to-br from-blue-500/[0.08] via-blue-500/[0.03] to-transparent p-5">
          <div className="flex items-center gap-2 text-[11px] text-blue-400/80 uppercase tracking-wider font-bold mb-2">
            <Workflow className="w-3.5 h-3.5" /> Pipeline Builder (Foundry 相当)
          </div>
          <p className="text-[13px] text-white/65 leading-relaxed">
            connector_fetch / transform_sql / validate / writeback / python_func の 5 種類のノードを DAG で接続し、
            データパイプラインを構築。スケジュール実行・ブランチ管理・実行履歴の lineage 確認が可能。
          </p>
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-[12px] font-semibold text-white/60 tracking-wide uppercase">
              パイプライン一覧 ({pipelines.length})
            </span>
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-white/40" />}
          </div>

          <table className="w-full text-[12px]">
            <thead className="text-white/40 border-b border-white/[0.04]">
              <tr>
                <th className="text-left px-5 py-2 font-medium">名前</th>
                <th className="text-left px-3 py-2 font-medium">ノード数</th>
                <th className="text-left px-3 py-2 font-medium">最終実行</th>
                <th className="text-left px-3 py-2 font-medium">ステータス</th>
                <th className="text-left px-3 py-2 font-medium">スケジュール</th>
                <th className="text-left px-3 py-2 font-medium">ブランチ</th>
                <th className="text-right px-3 py-2 font-medium">アクション</th>
              </tr>
            </thead>
            <tbody className="text-white/75">
              {pipelines.map((p) => {
                const sc = p.last_run_status ? STATUS_COLOR[p.last_run_status] : null
                return (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/pipeline/${p.id}`)}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer"
                  >
                    <td className="px-5 py-3 text-white/90 font-medium">
                      <div>{p.name}</div>
                      {p.description && <div className="text-[10px] text-white/40 mt-0.5 truncate max-w-md">{p.description}</div>}
                    </td>
                    <td className="px-3 py-3 font-mono text-white/70">{p.nodes.length}</td>
                    <td className="px-3 py-3 text-white/55 font-mono text-[10px]">{fmt(p.last_run_at)}</td>
                    <td className="px-3 py-3">
                      {sc ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] ${sc.bg} ${sc.fg} border ${sc.border}`}>
                          {sc.label}
                        </span>
                      ) : (
                        <span className="text-white/30 text-[10px]">未実行</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {p.schedule ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-white/60 font-mono">
                          <Calendar className="w-3 h-3" /> {p.schedule}
                        </span>
                      ) : (
                        <span className="text-white/30 text-[10px]">手動</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 text-[10px] text-white/60">
                        <GitBranch className="w-3 h-3" /> {p.branch}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => handleRun(e, p)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[11px] mr-2"
                        title="実行"
                      >
                        <Play className="w-3 h-3" /> 実行
                      </button>
                      <Link
                        href={`/pipeline/${p.id}/runs`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-white/70 text-[11px] mr-1"
                      >
                        履歴
                      </Link>
                      <ChevronRight className="inline w-3 h-3 text-white/30" />
                    </td>
                  </tr>
                )
              })}
              {!loading && pipelines.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-white/40 text-[12px]">
                    パイプラインがまだありません。「新規パイプライン」から作成してください。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
