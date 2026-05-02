"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ContextHeader } from "@/components/context-header"
import {
  aipLogicApi,
  KPI_OPTIONS,
  type LogicFunction,
  type LogicRun,
  type TriggerType,
} from "@/lib/aip-logic-api"
import PredicateBuilder from "@/components/aip-logic/PredicateBuilder"
import ActionChainEditor from "@/components/aip-logic/ActionChainEditor"
import { Save, Play, Trash2, Loader2, ArrowLeft, History, Pencil, Beaker, CheckCircle2, XCircle } from "lucide-react"

type Tab = "edit" | "test" | "history"

function fmt(d?: string | null) {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
  } catch {
    return d
  }
}

export default function AIPLogicEditorPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id as string
  const [fn, setFn] = useState<LogicFunction | null>(null)
  const [tab, setTab] = useState<Tab>("edit")
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [runs, setRuns] = useState<LogicRun[]>([])
  const [testCtx, setTestCtx] = useState<string>('{ "kpi": { "net_sales": 720000, "review_score": 2.8 } }')
  const [testResult, setTestResult] = useState<any>(null)

  useEffect(() => {
    if (!id) return
    aipLogicApi.get(id).then(setFn)
    aipLogicApi.listRuns(id).then(setRuns)
  }, [id])

  if (!fn) {
    return (
      <div className="flex flex-col h-screen items-center justify-center text-white/50 text-[12px]">
        <Loader2 className="w-4 h-4 animate-spin mb-2" />
        読み込み中...
      </div>
    )
  }

  const update = (patch: Partial<LogicFunction>) => setFn({ ...(fn as LogicFunction), ...patch })

  const updateTrigger = (t: { type: TriggerType; config: Record<string, any> }) => update({ trigger_json: t })

  const handleSave = async () => {
    setSaving(true)
    try {
      const saved = await aipLogicApi.update(fn.id, {
        name: fn.name,
        description: fn.description ?? "",
        trigger_json: fn.trigger_json,
        predicate_json: fn.predicate_json,
        actions_json: fn.actions_json,
        enabled: fn.enabled,
      })
      setFn(saved)
    } finally {
      setSaving(false)
    }
  }

  const handleRunNow = async () => {
    setRunning(true)
    try {
      await aipLogicApi.runNow(fn.id, { type: "manual" })
      const rs = await aipLogicApi.listRuns(fn.id)
      setRuns(rs)
      setTab("history")
    } finally {
      setRunning(false)
    }
  }

  const handleTest = async () => {
    let ctx: any = {}
    try {
      ctx = JSON.parse(testCtx || "{}")
    } catch {
      setTestResult({ error: "JSON parse error" })
      return
    }
    const r = await aipLogicApi.test(fn.id, ctx)
    setTestResult(r)
  }

  const handleDelete = async () => {
    if (!confirm("このロジックを削除しますか？")) return
    await aipLogicApi.delete(fn.id)
    router.push("/aip-logic")
  }

  const triggerType: TriggerType = (fn.trigger_json?.type as TriggerType) || "anomaly"
  const triggerConfig = fn.trigger_json?.config ?? {}

  return (
    <div className="flex flex-col h-screen">
      <ContextHeader
        title={fn.name || "AI ロジック"}
        description={fn.enabled ? "有効" : "停止中"}
        region="-"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/aip-logic")}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-[12px] rounded text-white/60 hover:text-white hover:bg-white/[0.06]"
            >
              <ArrowLeft className="w-3 h-3" /> 戻る
            </button>
            <button
              onClick={handleRunNow}
              disabled={running}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] rounded border border-white/15 text-white/85 hover:bg-white/[0.06] disabled:opacity-50"
            >
              {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              手動実行
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] rounded bg-blue-500/20 border border-blue-400/30 text-blue-100 hover:bg-blue-500/30 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              保存
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="border-b border-white/10 px-6 flex gap-2">
        {([
          { v: "edit", label: "編集", icon: Pencil },
          { v: "test", label: "テスト実行", icon: Beaker },
          { v: "history", label: "履歴", icon: History },
        ] as { v: Tab; label: string; icon: any }[]).map(({ v, label, icon: Icon }) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={
              "px-3 py-2 text-[12px] inline-flex items-center gap-1 border-b-2 transition-colors " +
              (tab === v
                ? "border-blue-400 text-blue-300"
                : "border-transparent text-white/50 hover:text-white/85")
            }
          >
            <Icon className="w-3 h-3" /> {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {tab === "edit" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl">
            {/* Basic */}
            <section className="space-y-3 lg:col-span-2">
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-white/50">基本情報</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/50">名称</label>
                  <input
                    value={fn.name}
                    onChange={(e) => update({ name: e.target.value })}
                    className="w-full bg-[#0e1320] border border-white/15 rounded px-2 py-1.5 text-[13px] text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/50">有効/無効</label>
                  <div className="pt-1">
                    <label className="inline-flex items-center gap-2 text-[12px] text-white/80">
                      <input
                        type="checkbox"
                        checked={fn.enabled}
                        onChange={(e) => update({ enabled: e.target.checked })}
                      />
                      有効化
                    </label>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] text-white/50">説明</label>
                  <textarea
                    value={fn.description ?? ""}
                    onChange={(e) => update({ description: e.target.value })}
                    className="w-full bg-[#0e1320] border border-white/15 rounded px-2 py-1.5 text-[12px] text-white"
                  />
                </div>
              </div>
            </section>

            {/* Trigger */}
            <section className="space-y-3">
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-white/50">トリガー</h3>
              <div className="rounded border border-white/10 bg-white/[0.02] p-3 space-y-2">
                <div>
                  <label className="text-[10px] text-white/50">種類</label>
                  <select
                    value={triggerType}
                    onChange={(e) => updateTrigger({ type: e.target.value as TriggerType, config: {} })}
                    className="w-full bg-[#0e1320] border border-white/15 rounded px-2 py-1.5 text-[12px] text-white"
                  >
                    <option value="cron">スケジュール (cron)</option>
                    <option value="event">イベント</option>
                    <option value="anomaly">異常検知 (KPI 閾値)</option>
                  </select>
                </div>

                {triggerType === "cron" && (
                  <div>
                    <label className="text-[10px] text-white/50">cron 式 (UTC)</label>
                    <input
                      placeholder="0 9 * * *"
                      value={triggerConfig.cron ?? ""}
                      onChange={(e) => updateTrigger({ type: "cron", config: { ...triggerConfig, cron: e.target.value } })}
                      className="w-full bg-[#0e1320] border border-white/15 rounded px-2 py-1.5 text-[12px] text-white font-mono"
                    />
                    <div className="text-[10px] text-white/40 mt-1">例: <code>0 * * * *</code> (毎時)</div>
                  </div>
                )}

                {triggerType === "event" && (
                  <div>
                    <label className="text-[10px] text-white/50">イベント名</label>
                    <input
                      placeholder="labor_violation_detected"
                      value={triggerConfig.event ?? ""}
                      onChange={(e) => updateTrigger({ type: "event", config: { ...triggerConfig, event: e.target.value } })}
                      className="w-full bg-[#0e1320] border border-white/15 rounded px-2 py-1.5 text-[12px] text-white"
                    />
                  </div>
                )}

                {triggerType === "anomaly" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-white/50">監視 KPI</label>
                      <select
                        value={triggerConfig.kpi ?? "net_sales"}
                        onChange={(e) => updateTrigger({ type: "anomaly", config: { ...triggerConfig, kpi: e.target.value } })}
                        className="w-full bg-[#0e1320] border border-white/15 rounded px-2 py-1.5 text-[12px] text-white"
                      >
                        {KPI_OPTIONS.map((k) => (
                          <option key={k.value} value={k.value}>{k.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-white/50">閾値</label>
                      <input
                        type="number"
                        value={triggerConfig.threshold ?? 0}
                        onChange={(e) => updateTrigger({ type: "anomaly", config: { ...triggerConfig, threshold: parseFloat(e.target.value) } })}
                        className="w-full bg-[#0e1320] border border-white/15 rounded px-2 py-1.5 text-[12px] text-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Predicate */}
            <section className="space-y-3">
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-white/50">条件 (Predicate)</h3>
              <div className="rounded border border-white/10 bg-white/[0.02] p-3">
                <PredicateBuilder
                  value={fn.predicate_json as any}
                  onChange={(p) => update({ predicate_json: p })}
                />
              </div>
            </section>

            {/* Actions */}
            <section className="space-y-3 lg:col-span-2">
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-white/50">アクションチェーン</h3>
              <ActionChainEditor
                value={fn.actions_json ?? []}
                onChange={(a) => update({ actions_json: a })}
              />
            </section>

            {/* Danger */}
            <section className="lg:col-span-2 pt-4 border-t border-white/10">
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] rounded border border-red-500/30 text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="w-3 h-3" /> このロジックを削除
              </button>
            </section>
          </div>
        )}

        {tab === "test" && (
          <div className="max-w-3xl space-y-3">
            <div className="text-[12px] text-white/60">
              テスト用 context を JSON で渡し、predicate の成立可否を確認できます (DB 副作用なし)。
            </div>
            <textarea
              value={testCtx}
              onChange={(e) => setTestCtx(e.target.value)}
              rows={6}
              className="w-full bg-[#0e1320] border border-white/15 rounded p-2 font-mono text-[12px] text-white"
            />
            <button
              onClick={handleTest}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] rounded bg-blue-500/20 border border-blue-400/30 text-blue-100 hover:bg-blue-500/30"
            >
              <Beaker className="w-3 h-3" /> テスト実行
            </button>
            {testResult && (
              <div className="rounded border border-white/10 bg-white/[0.02] p-3 space-y-2">
                {testResult.error ? (
                  <div className="text-red-300 text-[12px]">{testResult.error}</div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-[12px]">
                      <span className="text-white/50">predicate:</span>
                      {testResult.predicate_result ? (
                        <span className="inline-flex items-center gap-1 text-emerald-300"><CheckCircle2 className="w-3 h-3" /> 成立</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-white/50"><XCircle className="w-3 h-3" /> 不成立</span>
                      )}
                    </div>
                    {testResult.would_execute_actions && (
                      <div className="text-[12px] text-white/70">
                        <span className="text-white/50">実行されるアクション: </span>
                        {testResult.would_execute_actions.length ? testResult.would_execute_actions.join(" → ") : "(なし)"}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="max-w-5xl">
            <div className="rounded-lg border border-white/10 overflow-hidden">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-white/[0.03] text-white/50 text-[10px] uppercase">
                    <th className="text-left px-3 py-2">時刻</th>
                    <th className="text-left px-3 py-2">predicate</th>
                    <th className="text-left px-3 py-2">ステータス</th>
                    <th className="text-left px-3 py-2">アクション結果</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id} className="border-t border-white/[0.05] align-top">
                      <td className="px-3 py-2 text-white/60 tabular-nums whitespace-nowrap">{fmt(r.triggered_at)}</td>
                      <td className="px-3 py-2 text-white/70">{r.predicate_result ? "成立" : "不成立"}</td>
                      <td className="px-3 py-2">
                        <span className={
                          r.status === "success" ? "text-emerald-400" :
                          r.status === "failed" ? "text-red-400" :
                          "text-white/40"
                        }>{r.status}</span>
                      </td>
                      <td className="px-3 py-2 text-white/70">
                        <ul className="space-y-0.5">
                          {(r.actions_executed_json ?? []).map((a: any, i: number) => (
                            <li key={i} className="text-[11px]">
                              <span className={a.ok ? "text-emerald-300" : "text-red-300"}>{a.ok ? "✓" : "✗"}</span>{" "}
                              <span className="text-white/85">{a.type}</span>
                              {a.text && <span className="text-white/50"> — {String(a.text).slice(0, 80)}</span>}
                              {a.task_id && <span className="text-white/50"> task#{a.task_id.slice(0, 8)}</span>}
                              {a.error && <span className="text-red-300"> — {a.error}</span>}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                  {runs.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-8 text-center text-white/40">実行履歴はまだありません。</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
