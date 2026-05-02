"use client"

import { useEffect, useMemo, useState } from "react"
import { ContextHeader } from "@/components/context-header"
import { LoadingState, ErrorState } from "@/components/states"
import {
  createShiftDraft, updateShiftDraft, publishShiftDraft, getShiftDraft,
  type ShiftDraft, type ShiftDraftSlot,
} from "@/lib/labor-api"
import { CheckCircle2, RefreshCw, AlertCircle, ChevronUp, ChevronDown, AlertOctagon, AlertTriangle } from "lucide-react"
import { ComplianceBadge, severityCellClass, type ComplianceSeverity } from "@/components/labor/ComplianceBadge"

const DEFAULT_STORE_ID = "00000000-0000-0000-0000-000000000010"
const DEFAULT_WEEK_START = "2026-05-04"

const HOURS = Array.from({ length: 13 }, (_, i) => i + 10) // 10..22
const ROLE_COLORS: Record<string, string> = {
  "ホール": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "キッチン": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "レジ": "bg-amber-500/20 text-amber-300 border-amber-500/30",
}

function fmtKey(iso: string): { date: string; hhmm: string } {
  const d = new Date(iso)
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  return { date, hhmm }
}

export default function ShiftBuilderPage() {
  const [storeId, setStoreId] = useState(DEFAULT_STORE_ID)
  const [weekStart, setWeekStart] = useState(DEFAULT_WEEK_START)
  const [draft, setDraft] = useState<ShiftDraft | null>(null)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = async () => {
    setGenerating(true); setError(null)
    try {
      const d = await createShiftDraft(storeId, weekStart)
      setDraft(d)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  // 初回自動生成
  useEffect(() => {
    if (!draft) generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const employees = useMemo(() => {
    if (!draft) return []
    return draft.draft_json.summary.employee_summary.map((e: any) => ({
      id: e.employee_id,
      name: e.name,
      hours: e.scheduled_hours,
      days: e.days_worked,
      warnings: e.warnings as string[],
      compliance_skips: (e.compliance_skips || []) as { rule: string; slot: string }[],
    }))
  }, [draft])

  // employeeId -> 各 slot に対する severity (block | warn | null)
  const cellSeverity = useMemo(() => {
    const m = new Map<string, Map<string, ComplianceSeverity>>()
    employees.forEach((e) => {
      const inner = new Map<string, ComplianceSeverity>()
      e.compliance_skips.forEach((s) => inner.set(s.slot, "block"))
      m.set(e.id, inner)
    })
    return m
  }, [employees])

  // 各 employee の row レベル severity (warnings から導出)
  const rowSeverity = (warnings: string[]): ComplianceSeverity | null => {
    if (warnings.some((w) => w === "art36:block")) return "block"
    if (warnings.some((w) => w === "art36:warn")) return "warn"
    return null
  }

  // employee × slot のマトリクス
  const matrix = useMemo(() => {
    const m = new Map<string, Map<string, ShiftDraftSlot["assignments"][number]>>()
    if (!draft) return m
    draft.draft_json.slots.forEach((s) => {
      s.assignments.forEach((a) => {
        if (!a.employee_id) return
        if (!m.has(a.employee_id)) m.set(a.employee_id, new Map())
        m.get(a.employee_id)!.set(s.slot_start, a)
      })
    })
    return m
  }, [draft])

  // ユニーク slot 列 (日×30分)
  const slotColumns = useMemo(() => {
    if (!draft) return [] as { iso: string; date: string; hhmm: string }[]
    return draft.draft_json.slots.map((s) => {
      const { date, hhmm } = fmtKey(s.slot_start)
      return { iso: s.slot_start, date, hhmm }
    })
  }, [draft])

  const dates = useMemo(() => Array.from(new Set(slotColumns.map((c) => c.date))).sort(), [slotColumns])
  const [activeDate, setActiveDate] = useState<string | null>(null)
  useEffect(() => {
    if (!activeDate && dates.length) setActiveDate(dates[0])
  }, [dates, activeDate])

  const filteredCols = useMemo(
    () => slotColumns.filter((c) => c.date === activeDate),
    [slotColumns, activeDate]
  )

  const toggleAssignment = (slotIso: string, employeeId: string, employeeName: string) => {
    if (!draft || draft.status === "published") return
    const slots = draft.draft_json.slots.map((s) => {
      if (s.slot_start !== slotIso) return s
      const has = s.assignments.find((a) => a.employee_id === employeeId)
      let newAssign
      if (has) {
        newAssign = s.assignments.filter((a) => a.employee_id !== employeeId)
      } else {
        // role: 必要量が最も埋まっていない role を選ぶ
        const roleCounts: Record<string, number> = {}
        s.assignments.forEach((a) => { roleCounts[a.role] = (roleCounts[a.role] || 0) + 1 })
        let bestRole = Object.keys(s.role_split)[0] || "ホール"
        let bestGap = -Infinity
        for (const role of Object.keys(s.role_split)) {
          const gap = (s.role_split[role] || 0) - (roleCounts[role] || 0)
          if (gap > bestGap) { bestGap = gap; bestRole = role }
        }
        newAssign = [...s.assignments.filter((a) => a.employee_id !== null || a.role !== bestRole),
                     { employee_id: employeeId, employee_name: employeeName, role: bestRole }]
      }
      return { ...s, assignments: newAssign }
    })
    setDraft({ ...draft, draft_json: { ...draft.draft_json, slots } })
  }

  const save = async () => {
    if (!draft) return
    setSaving(true); setError(null)
    try {
      // recompute summary employee hours from current matrix
      const empMap: Record<string, { name: string; hours: number; days: Set<string>; roles: Record<string, number> }> = {}
      draft.draft_json.slots.forEach((s) => {
        s.assignments.forEach((a) => {
          if (!a.employee_id) return
          if (!empMap[a.employee_id]) empMap[a.employee_id] = { name: a.employee_name, hours: 0, days: new Set(), roles: {} }
          empMap[a.employee_id].hours += 0.5
          empMap[a.employee_id].days.add(fmtKey(s.slot_start).date)
          empMap[a.employee_id].roles[a.role] = (empMap[a.employee_id].roles[a.role] || 0) + 1
        })
      })
      const employee_summary = Object.entries(empMap).map(([id, v]) => ({
        employee_id: id,
        name: v.name,
        scheduled_hours: Math.round(v.hours * 10) / 10,
        days_worked: v.days.size,
        role_distribution: v.roles,
        warnings: v.hours > 40 ? ["over_max_hours"] : [],
      }))
      const total_assignments = draft.draft_json.slots.reduce((s, x) => s + x.assignments.filter((a) => a.employee_id).length, 0)
      const cost_estimate_yen = Math.round(Object.values(empMap).reduce((s, v) => s + v.hours * 1180, 0))
      const newDraft = {
        ...draft,
        draft_json: {
          ...draft.draft_json,
          summary: {
            ...draft.draft_json.summary,
            total_assignments,
            cost_estimate_yen,
            employee_summary,
          },
        },
      }
      const updated = await updateShiftDraft(draft.id, newDraft.draft_json)
      setDraft(updated)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const publish = async () => {
    if (!draft) return
    if (!confirm("シフトを公開します。よろしいですか?")) return
    setPublishing(true); setError(null)
    try {
      const r = await publishShiftDraft(draft.id)
      setDraft(r)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setPublishing(false)
    }
  }

  const refreshFromServer = async () => {
    if (!draft) return
    const r = await getShiftDraft(draft.id)
    setDraft(r)
  }

  if (error) return <div className="min-h-full bg-[#0a0e14]"><ContextHeader title="シフトビルダー" description="週次シフトドラフト → 編集 → 公開" /><ErrorState message={error} /></div>

  return (
    <div className="min-h-full bg-[#0a0e14] text-white/80">
      <ContextHeader
        title="シフトビルダー"
        description="店長の3時間シフト編成 → 15分。需要予測ベースのドラフト生成 + マトリクス編集"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={generate}
              disabled={generating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-md bg-white/[0.04] border border-white/[0.08] text-white/70 hover:bg-white/[0.08]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
              再生成
            </button>
            <button
              onClick={save}
              disabled={!draft || saving || draft.status === "published"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-md bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 disabled:opacity-40"
            >
              {saving ? "保存中..." : "保存"}
            </button>
            <button
              onClick={publish}
              disabled={!draft || publishing || draft.status === "published"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 disabled:opacity-40"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {publishing ? "公開中..." : draft?.status === "published" ? "公開済み" : "公開"}
            </button>
          </div>
        }
      />

      <div className="px-5 py-5 space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[12px] text-white/60">
            店舗ID
            <input type="text" value={storeId} onChange={(e) => setStoreId(e.target.value)} className="w-[280px] px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded text-[11px] font-mono" />
          </label>
          <label className="flex items-center gap-2 text-[12px] text-white/60">
            週開始 (月)
            <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className="px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded text-[11px]" />
          </label>
          {draft && (
            <span className={`ml-auto px-2 py-1 rounded text-[11px] border ${draft.status === "published" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" : "bg-amber-500/15 border-amber-500/30 text-amber-300"}`}>
              {draft.status === "published" ? "公開済み" : "ドラフト"}
            </span>
          )}
        </div>

        {generating && !draft && <LoadingState />}

        {draft && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "充足率", value: `${draft.draft_json.summary.fill_rate_pct.toFixed(1)}%`, color: "text-emerald-400" },
                { label: "未充足slot", value: draft.draft_json.summary.unfilled_slots.toString(), color: "text-amber-400" },
                { label: "総assign数", value: draft.draft_json.summary.total_assignments.toLocaleString(), color: "text-blue-400" },
                { label: "推定週コスト", value: `¥${Math.round(draft.draft_json.summary.cost_estimate_yen).toLocaleString()}`, color: "text-white/80" },
              ].map((c) => (
                <div key={c.label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">{c.label}</div>
                  <div className={`font-mono tabular-nums text-2xl font-semibold ${c.color}`}>{c.value}</div>
                </div>
              ))}
            </div>

            {/* Date tabs */}
            <div className="flex flex-wrap items-center gap-1">
              {dates.map((d) => {
                const active = d === activeDate
                return (
                  <button
                    key={d}
                    onClick={() => setActiveDate(d)}
                    className={`px-3 py-1.5 text-[12px] rounded-md border ${active ? "bg-blue-500/20 text-blue-300 border-blue-500/40" : "bg-white/[0.02] text-white/60 border-white/[0.06] hover:bg-white/[0.05]"}`}
                  >
                    {d.slice(5)} ({["月","火","水","木","金","土","日"][(new Date(d).getDay() + 6) % 7]})
                  </button>
                )
              })}
            </div>

            {/* Matrix table */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-x-auto">
              <table className="text-[10px] font-mono">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                    <th className="sticky left-0 bg-[#0a0e14] px-3 py-2 text-left text-white/40 z-10 min-w-[100px]">従業員</th>
                    {filteredCols.map((c) => (
                      <th key={c.iso} className="px-0.5 py-2 text-white/30 w-7 text-center">{c.hhmm}</th>
                    ))}
                    <th className="px-2 py-2 text-white/40 text-right">時数</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => {
                    const rowSev = rowSeverity(emp.warnings)
                    return (
                    <tr key={emp.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="sticky left-0 bg-[#0a0e14] px-3 py-1.5 z-10 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white/80 text-[12px]">{emp.name}</span>
                          {rowSev === "block" && <AlertOctagon className="w-3 h-3 text-red-400" />}
                          {rowSev === "warn" && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                        </div>
                        <div className="text-white/30 text-[9px]">
                          {emp.days}日 / {emp.warnings.length > 0 ? <span className="text-amber-400" title={emp.warnings.join(", ")}>⚠{emp.warnings.length}</span> : "ok"}
                        </div>
                      </td>
                      {filteredCols.map((c) => {
                        const a = matrix.get(emp.id)?.get(c.iso)
                        const sev = cellSeverity.get(emp.id)?.get(c.iso) || null
                        const sevCls = severityCellClass(sev)
                        const baseCls = a ? (ROLE_COLORS[a.role] || "bg-white/20 text-white/80 border-white/30") : "bg-transparent border-white/[0.04]"
                        const cls = sevCls || baseCls
                        return (
                          <td
                            key={c.iso}
                            onClick={() => toggleAssignment(c.iso, emp.id, emp.name)}
                            className={`w-7 h-6 border ${cls} cursor-pointer text-center align-middle ${draft.status === "published" ? "pointer-events-none opacity-60" : ""}`}
                            title={
                              sev === "block"
                                ? `違反 (block): 法令違反のため割当不可`
                                : sev === "warn"
                                ? `警告 (warn): 上限近接`
                                : a
                                ? `${a.role}`
                                : "（割当なし）"
                            }
                          >
                            {sev === "block" ? "✕" : sev === "warn" ? "!" : a ? a.role.charAt(0) : ""}
                          </td>
                        )
                      })}
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums text-white/70">{emp.hours.toFixed(1)}h</td>
                    </tr>
                  )})}
                </tbody>
              </table>
              <div className="px-3 py-2 text-[10px] text-white/40 border-t border-white/[0.06] flex flex-wrap items-center gap-3">
                <span>セルクリックで割当ON/OFF。「ホ=ホール / キ=キッチン / レ=レジ」</span>
                <span className="ml-auto flex items-center gap-2">
                  <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/30 border border-red-500/50" />違反</span>
                  <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40" />警告</span>
                  <a href="/labor/compliance" className="text-blue-300 hover:underline">違反詳細 →</a>
                </span>
              </div>
            </div>

            {/* Required vs assigned per slot */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-[11px] text-white/50 mb-2">slot別 必要 vs 割当 ({activeDate})</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-[11px]">
                {filteredCols.map((c) => {
                  const slot = draft.draft_json.slots.find((s) => s.slot_start === c.iso)
                  if (!slot) return null
                  const need = Math.ceil(Object.values(slot.role_split).reduce((s, v) => s + v, 0))
                  const got = slot.assignments.filter((a) => a.employee_id).length
                  const ok = got >= need
                  return (
                    <div key={c.iso} className={`flex items-center gap-2 px-2 py-1 rounded ${ok ? "bg-white/[0.02]" : "bg-amber-500/10 border border-amber-500/20"}`}>
                      <span className="font-mono text-white/50 w-12">{c.hhmm}</span>
                      {ok ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <AlertCircle className="w-3 h-3 text-amber-400" />}
                      <span className="font-mono text-white/70">必要 {need}人 / 割当 {got}人</span>
                      {!ok && got < need && <ChevronUp className="w-3 h-3 text-amber-400 ml-auto" />}
                      {got > need && <ChevronDown className="w-3 h-3 text-blue-400 ml-auto" />}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
