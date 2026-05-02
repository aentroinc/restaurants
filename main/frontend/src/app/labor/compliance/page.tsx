"use client"

import { useEffect, useMemo, useState } from "react"
import { ContextHeader } from "@/components/context-header"
import { LoadingState, ErrorState } from "@/components/states"
import { fetchAPI } from "@/lib/api"
import { ComplianceBadge, type ComplianceSeverity } from "@/components/labor/ComplianceBadge"
import { AlertOctagon, AlertTriangle, ShieldCheck, RefreshCw } from "lucide-react"

type Violation = {
  id: string
  employee_id: string
  store_id: string | null
  rule_code: string
  severity: ComplianceSeverity
  detail: Record<string, any>
  occurred_at: string
  resolved_at: string | null
}

type Dashboard = {
  period_days: number
  total: number
  open_count: number
  by_severity: Record<string, number>
  by_rule: Record<string, number>
  trend: { date: string; count: number }[]
}

export default function LaborCompliancePage() {
  const [violations, setViolations] = useState<Violation[]>([])
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [storeId, setStoreId] = useState("")
  const [severity, setSeverity] = useState<"" | "warn" | "block">("")

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const sev = severity ? `&severity=${severity}` : ""
      const sid = storeId ? `&store_id=${storeId}` : ""
      const [v, d] = await Promise.all([
        fetchAPI<{ data: Violation[] }>(`/api/v1/labor/compliance/violations?period_days=30${sev}${sid}`),
        fetchAPI<{ data: Dashboard }>(`/api/v1/labor/compliance/dashboard?period_days=30${sid}`),
      ])
      setViolations(v.data || [])
      setDashboard(d.data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, severity])

  const blockCount = dashboard?.by_severity?.block || 0
  const warnCount = dashboard?.by_severity?.warn || 0

  const ruleStats = useMemo(() => {
    if (!dashboard) return []
    return Object.entries(dashboard.by_rule).sort((a, b) => b[1] - a[1])
  }, [dashboard])

  return (
    <div className="min-h-full bg-[#0a0e14] text-white/80">
      <ContextHeader
        title="労務コンプライアンス"
        description="労働基準法 6ルール (36協定 / 休憩 / 未成年深夜 / 連続勤務 / インターバル / 最低賃金) の違反/警告ダッシュボード"
        actions={
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-md bg-white/[0.04] border border-white/[0.08] text-white/70 hover:bg-white/[0.08]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            再取得
          </button>
        }
      />

      <div className="px-5 py-5 space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[12px] text-white/60">
            店舗ID
            <input
              type="text"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              placeholder="全店舗"
              className="w-[260px] px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded text-[11px] font-mono"
            />
          </label>
          <label className="flex items-center gap-2 text-[12px] text-white/60">
            severity
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as any)}
              className="px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded text-[11px]"
            >
              <option value="">すべて</option>
              <option value="block">違反 (block)</option>
              <option value="warn">警告 (warn)</option>
            </select>
          </label>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            label="違反 (block)"
            value={blockCount}
            icon={AlertOctagon}
            color="text-red-400"
          />
          <KpiCard
            label="警告 (warn)"
            value={warnCount}
            icon={AlertTriangle}
            color="text-amber-400"
          />
          <KpiCard
            label="未対応"
            value={dashboard?.open_count ?? 0}
            icon={AlertTriangle}
            color="text-orange-400"
          />
          <KpiCard
            label="期間 (日)"
            value={dashboard?.period_days ?? 30}
            icon={ShieldCheck}
            color="text-emerald-400"
          />
        </div>

        {/* Rule breakdown */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="text-[11px] uppercase tracking-wider text-white/40 mb-2">ルール別内訳</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ruleStats.length === 0 && (
              <div className="text-[12px] text-white/40">違反なし</div>
            )}
            {ruleStats.map(([rule, count]) => (
              <div key={rule} className="flex items-center justify-between text-[12px] px-2 py-1 rounded bg-white/[0.02]">
                <ComplianceBadge severity="warn" ruleCode={rule} compact />
                <span className="font-mono tabular-nums text-white/70">{count}件</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trend */}
        {dashboard?.trend && dashboard.trend.length > 0 && (
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[11px] uppercase tracking-wider text-white/40 mb-2">日次推移</div>
            <div className="flex items-end gap-1 h-20">
              {dashboard.trend.map((p) => {
                const max = Math.max(...dashboard.trend.map((x) => x.count), 1)
                const h = Math.max(2, (p.count / max) * 70)
                return (
                  <div key={p.date} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                    <div className="w-full bg-amber-400/40 rounded-sm" style={{ height: `${h}px` }} />
                    <div className="text-[9px] text-white/30 font-mono truncate">{p.date.slice(5)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Violations list */}
        <div className="rounded-lg border border-white/[0.06] overflow-hidden">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} />
          ) : violations.length === 0 ? (
            <div className="px-5 py-10 text-center text-white/40 text-[13px]">違反履歴なし</div>
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40">時刻</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40">ルール</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40">severity</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40">従業員</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40">詳細</th>
                </tr>
              </thead>
              <tbody>
                {violations.map((v) => (
                  <tr key={v.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-2 font-mono text-[11px] text-white/50">
                      {new Date(v.occurred_at).toLocaleString("ja-JP", { hour12: false })}
                    </td>
                    <td className="px-4 py-2">
                      <ComplianceBadge severity={v.severity} ruleCode={v.rule_code} compact />
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        v.severity === "block"
                          ? "text-red-400 bg-red-400/10 border-red-400/20"
                          : "text-amber-400 bg-amber-400/10 border-amber-400/20"
                      }`}>
                        {v.severity}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-[10px] text-white/40 truncate max-w-[120px]">
                      {v.employee_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-2 text-white/70">
                      {String(v.detail?.message || "—")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: typeof ShieldCheck
  color: string
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} strokeWidth={1.5} />
        <span className="text-[10px] uppercase tracking-wider text-white/40">{label}</span>
      </div>
      <div className={`font-mono tabular-nums text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  )
}
