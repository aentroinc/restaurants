"use client"

import { useEffect, useState } from "react"
import { ContextHeader } from "@/components/context-header"
import { LoadingState, ErrorState, EmptyState } from "@/components/states"
import { fetchAPI } from "@/lib/api"
import type { ShiftItem, LaborComplianceReport } from "@/lib/types"
import { AlertTriangle, Clock, Users, Shield } from "lucide-react"

const violationBadge: Record<string, { label: string; cls: string }> = {
  overtime: { label: "時間外超過", cls: "text-red-400 bg-red-400/10 border-red-400/20" },
  short_break: { label: "休憩不足", cls: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  rest_interval: { label: "インターバル不足", cls: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
}

export default function LaborPage() {
  const [shifts, setShifts] = useState<ShiftItem[]>([])
  const [compliance, setCompliance] = useState<LaborComplianceReport | null>(null)
  const [filterStore, setFilterStore] = useState("")
  const [filterViolation, setFilterViolation] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetchAPI<ShiftItem[]>("/api/v1/vertical/labor/shifts"),
      fetchAPI<LaborComplianceReport>("/api/v1/vertical/labor/compliance-report"),
    ])
      .then(([s, c]) => { setShifts(Array.isArray(s) ? s : []); setCompliance(c ?? null) })
      .catch((e) => setError(e?.message ?? String(e)))
      .finally(() => setLoading(false))
  }, [])

  const violationShifts = shifts.filter((s) => Array.isArray(s?.violations) && s.violations.length > 0)
  const filtered = violationShifts.filter((s) => {
    if (filterStore && !s.store_name?.includes(filterStore)) return false
    if (filterViolation && !s.violations.includes(filterViolation)) return false
    return true
  })

  const stores = [...new Set(shifts.map((s) => s?.store_name).filter(Boolean))]
  const overtimeCount = compliance?.violations?.find((v: any) => v?.type === "overtime")?.count ?? 0

  if (loading) return <div className="min-h-full bg-[#0a0e14]"><ContextHeader title="シフト・労務コンプライアンス" description="労働時間管理と法令遵守状況" /><LoadingState /></div>
  if (error) return <div className="min-h-full bg-[#0a0e14]"><ContextHeader title="シフト・労務コンプライアンス" description="労働時間管理と法令遵守状況" /><ErrorState message={error} /></div>
  if (!shifts.length) return <div className="min-h-full bg-[#0a0e14]"><ContextHeader title="シフト・労務コンプライアンス" description="労働時間管理と法令遵守状況" /><EmptyState /></div>

  return (
    <div className="min-h-full bg-[#0a0e14] text-white/80 flex flex-col">
      <ContextHeader title="シフト・労務コンプライアンス" description="労働時間管理と法令遵守状況" />

      <div className="px-5 py-5 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "総シフト数", value: compliance?.total_shifts?.toLocaleString() ?? "-", icon: Users, color: "text-blue-400" },
            { label: "違反件数", value: compliance?.violation_count?.toLocaleString() ?? "-", icon: AlertTriangle, color: "text-red-400" },
            { label: "違反率", value: compliance ? `${compliance.violation_rate}%` : "-", icon: Shield, color: "text-amber-400" },
            { label: "36協定超過", value: `${overtimeCount}件`, icon: Clock, color: "text-orange-400" },
          ].map((card) => {
            const Icon = card.icon
            return (
              <div key={card.label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${card.color}`} strokeWidth={1.5} />
                  <span className="text-[10px] uppercase tracking-wider text-white/40">{card.label}</span>
                </div>
                <div className={`font-mono tabular-nums text-2xl font-semibold ${card.color}`}>{card.value}</div>
              </div>
            )
          })}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={filterStore}
            onChange={(e) => setFilterStore(e.target.value)}
            className="text-[12px] px-3 py-1.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-white/70"
          >
            <option value="">全店舗</option>
            {stores.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filterViolation}
            onChange={(e) => setFilterViolation(e.target.value)}
            className="text-[12px] px-3 py-1.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-white/70"
          >
            <option value="">全違反種別</option>
            <option value="overtime">時間外超過</option>
            <option value="short_break">休憩不足</option>
            <option value="rest_interval">インターバル不足</option>
          </select>
          <span className="text-[11px] text-white/30 ml-auto">{filtered.length}件の違反</span>
        </div>

        {/* Violations table */}
        <div className="rounded-lg border border-white/[0.06] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead><tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">店舗名</th>
              <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">従業員</th>
              <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">役割</th>
              <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">違反種別</th>
              <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">勤務時間</th>
            </tr></thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-white/80">{s.store_name}</td>
                  <td className="px-4 py-3 text-white/70">{s.employee_name}</td>
                  <td className="px-4 py-3 text-white/50">{s.role}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {s.violations.map((v) => {
                        const b = violationBadge[v] || { label: v, cls: "text-white/50 bg-white/[0.06]" }
                        return <span key={v} className={`text-[10px] px-2 py-0.5 rounded border ${b.cls}`}>{b.label}</span>
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-white/50">{new Date(s.start_at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} - {new Date(s.end_at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
