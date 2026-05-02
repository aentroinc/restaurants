"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ContextHeader } from "@/components/context-header"
import { aipLogicApi, type LogicFunction, type LogicRun } from "@/lib/aip-logic-api"
import { Plus, Play, Zap, Loader2, Brain, ChevronRight, Activity } from "lucide-react"

function fmt(d?: string | null) {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
  } catch {
    return d
  }
}

const TRIGGER_LABEL: Record<string, string> = {
  cron: "スケジュール",
  event: "イベント",
  anomaly: "異常検知",
}

const STATUS_COLOR: Record<string, string> = {
  success: "text-emerald-400",
  failed: "text-red-400",
  skipped: "text-white/40",
  pending: "text-white/40",
}

export default function AIPLogicListPage() {
  const router = useRouter()
  const [fns, setFns] = useState<LogicFunction[]>([])
  const [recent, setRecent] = useState<LogicRun[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    aipLogicApi.list().then(async (list) => {
      setFns(list)
      // pull last runs for first 3 functions
      const runs: LogicRun[] = []
      for (const f of list.slice(0, 3)) {
        const rs = await aipLogicApi.listRuns(f.id)
        runs.push(...rs.slice(0, 2))
      }
      runs.sort((a, b) => (b.triggered_at || "").localeCompare(a.triggered_at || ""))
      setRecent(runs.slice(0, 8))
    }).finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const created = await aipLogicApi.create({
        name: "新規 AI ロジック",
        description: "",
        trigger_json: { type: "anomaly", config: {} },
        predicate_json: { op: "<", left: { kpi: "net_sales" }, right: { const: 0 } },
        actions_json: [],
        enabled: true,
      })
      router.push(`/aip-logic/${created.id}`)
    } finally {
      setCreating(false)
    }
  }

  const handleRun = async (e: React.MouseEvent, f: LogicFunction) => {
    e.preventDefault()
    e.stopPropagation()
    await aipLogicApi.runNow(f.id, { type: "manual" })
    const rs = await aipLogicApi.listRuns(f.id)
    setRecent((cur) => [...rs.slice(0, 2), ...cur].slice(0, 8))
  }

  return (
    <div className="flex flex-col h-screen">
      <ContextHeader
        title="AI ロジック"
        description="ノーコードで「KPIが下がる → AIが仮説 → SVへタスク」を定義"
        region="-"
        actions={
          <button
            onClick={handleCreate}
            disabled={creating}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-[12px] rounded bg-blue-500/15 border border-blue-400/30 text-blue-200 hover:bg-blue-500/25 disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            新規ロジック
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {loading && (
          <div className="flex items-center gap-2 text-white/50 text-[12px]"><Loader2 className="w-3 h-3 animate-spin" /> 読み込み中...</div>
        )}

        {/* Functions */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-blue-300" />
            <h2 className="text-[13px] font-semibold text-white/85">ロジック関数 ({fns.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fns.map((f) => (
              <Link
                key={f.id}
                href={`/aip-logic/${f.id}`}
                className="group rounded-lg border border-white/10 bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={"inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider " + (f.enabled ? "bg-emerald-500/10 text-emerald-300" : "bg-white/5 text-white/40")}>
                        <Zap className="w-2.5 h-2.5" />
                        {f.enabled ? "有効" : "停止"}
                      </span>
                      <span className="text-[10px] text-white/50">{TRIGGER_LABEL[f.trigger_json?.type] || f.trigger_json?.type}</span>
                    </div>
                    <div className="mt-1 text-[13px] font-semibold text-white/90 truncate">{f.name}</div>
                    <div className="text-[11px] text-white/50 line-clamp-2">{f.description}</div>
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-white/40">
                      <span>アクション {f.actions_json?.length ?? 0}</span>
                      <span>•</span>
                      <span>{fmt(f.updated_at)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <button
                      onClick={(e) => handleRun(e, f)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded border border-white/15 text-white/80 hover:text-white hover:bg-white/[0.06]"
                    >
                      <Play className="w-3 h-3" /> 実行
                    </button>
                    <ChevronRight className="w-3 h-3 text-white/30 group-hover:text-white/60" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent runs */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-emerald-300" />
            <h2 className="text-[13px] font-semibold text-white/85">直近の実行</h2>
          </div>
          <div className="rounded-lg border border-white/10 overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-white/[0.03] text-white/50 text-[10px] uppercase">
                  <th className="text-left px-3 py-2">時刻</th>
                  <th className="text-left px-3 py-2">関数</th>
                  <th className="text-left px-3 py-2">条件</th>
                  <th className="text-left px-3 py-2">ステータス</th>
                  <th className="text-left px-3 py-2">アクション</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => {
                  const fn = fns.find((f) => f.id === r.function_id)
                  return (
                    <tr key={r.id} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                      <td className="px-3 py-2 text-white/60 tabular-nums">{fmt(r.triggered_at)}</td>
                      <td className="px-3 py-2 text-white/85 truncate max-w-[300px]">{fn?.name ?? r.function_id.slice(0, 8)}</td>
                      <td className="px-3 py-2 text-white/60">{r.predicate_result ? "成立" : "不成立"}</td>
                      <td className={"px-3 py-2 font-medium " + (STATUS_COLOR[r.status] || "text-white/40")}>{r.status}</td>
                      <td className="px-3 py-2 text-white/60">{(r.actions_executed_json ?? []).map((a: any) => a.type).join(" → ") || "—"}</td>
                    </tr>
                  )
                })}
                {recent.length === 0 && !loading && (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-white/40">まだ実行履歴がありません。</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
