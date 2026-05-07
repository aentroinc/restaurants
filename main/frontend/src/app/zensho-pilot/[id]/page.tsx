"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import { ArrowLeft, Download, RefreshCw, FileText, Users, Building2 } from "lucide-react"

interface PilotSummary {
  pilot_id: string
  name: string
  theme: string
  theme_name: string
  status: string
  sponsor_name?: string
  baseline_period: string
  intervention_period: string
  target_store_count: number
  control_store_count: number
  results: Array<{
    kpi_name: string
    baseline: number
    intervention: number
    delta_pct: number
    p_value?: number
    significant: boolean
    annualized_impact_yen: number
    ci?: [number | null, number | null]
    method: string
  }>
  total_annualized_impact_yen: number
  significant_kpi_count: number
  kpi_count: number
  verdict: string
  next_actions: string[]
}

const KPI_LABEL: Record<string, string> = {
  waste_amount: "廃棄金額",
  stockout_rate: "欠品率",
  gross_profit_rate: "粗利率",
  sales_per_labor_hour: "人時売上",
  labor_cost_rate: "人件費率",
  overtime_hours: "残業時間",
}

export default function PilotDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [summary, setSummary] = useState<PilotSummary | null>(null)
  const [audience, setAudience] = useState<"executive" | "brand" | "it" | "store_manager">("executive")
  const [recalcing, setRecalcing] = useState(false)

  useEffect(() => {
    fetchAPI<PilotSummary>(`/api/v1/pilots/${id}/summary`).then(setSummary).catch(() => {})
  }, [id])

  async function recalc() {
    setRecalcing(true)
    await fetchAPI(`/api/v1/pilots/${id}/calculate-results`, { method: "POST" })
    const fresh = await fetchAPI<PilotSummary>(`/api/v1/pilots/${id}/summary`)
    setSummary(fresh)
    setRecalcing(false)
  }

  if (!summary) return <div className="p-8 text-white/40">Loading...</div>

  const safeResults = Array.isArray(summary.results) ? summary.results : []
  const safeNextActions = Array.isArray(summary.next_actions) ? summary.next_actions : []
  const fmt = (n: number | null | undefined) => `¥${(n ?? 0).toLocaleString()}`

  return (
    <div className="flex flex-col h-screen">
      <ContextHeader title={summary.name ?? "POC"} description={`${summary.theme_name ?? "-"}・${summary.status ?? "-"}`} region="POC" />

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <Link href="/zensho-pilot" className="inline-flex items-center gap-1 text-[12px] text-blue-400 hover:text-blue-300">
          <ArrowLeft className="w-3 h-3" /> POC 一覧に戻る
        </Link>

        {/* Top metrics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/[0.06] p-4">
            <div className="text-[10px] text-emerald-400/70 uppercase tracking-wider">年間改善見込み</div>
            <div className="mt-1 text-2xl font-mono font-bold text-emerald-400">{fmt(summary.total_annualized_impact_yen)}</div>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">統計的有意</div>
            <div className="mt-1 text-2xl font-mono text-white/85">{summary.significant_kpi_count ?? 0}<span className="text-[14px] text-white/30">/{summary.kpi_count ?? 0}</span></div>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">対象店舗</div>
            <div className="mt-1 text-2xl font-mono text-white/85">{summary.target_store_count ?? 0}</div>
            <div className="text-[10px] text-white/30 mt-0.5">control: {summary.control_store_count ?? 0}</div>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">期間</div>
            <div className="mt-1 text-[11px] text-white/70">{summary.baseline_period ?? "-"}</div>
            <div className="text-[11px] text-white/70">→ {summary.intervention_period ?? "-"}</div>
          </div>
        </div>

        {/* Verdict */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
          <h3 className="text-[12px] font-semibold text-white/60 tracking-wide uppercase mb-2">判定</h3>
          <p className="text-[14px] text-white/85 leading-relaxed">{summary.verdict}</p>
          {summary.sponsor_name && (
            <p className="text-[11px] text-white/40 mt-3">スポンサー: {summary.sponsor_name}</p>
          )}
        </div>

        {/* KPI table */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-[12px] font-semibold text-white/60 tracking-wide uppercase">KPI 別効果（対照群比較）</span>
            <button onClick={recalc} disabled={recalcing} className="text-[11px] flex items-center gap-1 px-2 py-1 rounded bg-white/[0.04] hover:bg-blue-500/15 hover:text-blue-400 text-white/55 disabled:opacity-50">
              <RefreshCw className={`w-3 h-3 ${recalcing ? "animate-spin" : ""}`} /> 再計算
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="text-white/40 border-b border-white/[0.04]">
                <tr>
                  <th className="text-left px-5 py-2 font-medium">KPI</th>
                  <th className="text-right px-3 py-2 font-medium">ベースライン</th>
                  <th className="text-right px-3 py-2 font-medium">介入後</th>
                  <th className="text-right px-3 py-2 font-medium">変化率</th>
                  <th className="text-right px-3 py-2 font-medium">信頼度</th>
                  <th className="text-right px-3 py-2 font-medium">改善幅</th>
                  <th className="text-right px-3 py-2 font-medium">年間換算</th>
                  <th className="text-center px-3 py-2 font-medium">判定</th>
                </tr>
              </thead>
              <tbody className="text-white/75 font-mono">
                {safeResults.map((r) => (
                  <tr key={r.kpi_name} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-5 py-3 text-white/85 font-sans">{KPI_LABEL[r.kpi_name] || r.kpi_name}</td>
                    <td className="text-right px-3 py-3">{(r.baseline ?? 0).toFixed(2)}</td>
                    <td className="text-right px-3 py-3">{(r.intervention ?? 0).toFixed(2)}</td>
                    <td className={`text-right px-3 py-3 ${(r.delta_pct ?? 0) < 0 ? "text-emerald-400" : "text-blue-400"}`}>{(r.delta_pct ?? 0) > 0 ? "+" : ""}{(r.delta_pct ?? 0).toFixed(2)}%</td>
                    <td className="text-right px-3 py-3 text-white/55 text-[11px]" title={r.p_value !== undefined && r.p_value !== null ? `p = ${r.p_value.toFixed(4)}` : ""}>
                      {r.p_value !== undefined && r.p_value !== null ? (r.p_value < 0.01 ? "高" : r.p_value < 0.05 ? "中" : "低") : "n/a"}
                    </td>
                    <td className="text-right px-3 py-3 text-white/55 text-[10px]">
                      {r.ci && r.ci[0] !== null ? `±${(((r.ci[1] || 0) - (r.ci[0] || 0)) / 2).toFixed(2)}` : "n/a"}
                    </td>
                    <td className="text-right px-3 py-3 text-amber-400/90">{fmt(r.annualized_impact_yen)}</td>
                    <td className="text-center px-3 py-3">
                      {r.significant ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">確実</span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400/80">参考</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Next actions */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
          <h3 className="text-[12px] font-semibold text-white/60 tracking-wide uppercase mb-3">次アクション</h3>
          <ul className="space-y-2">
            {safeNextActions.map((a, i) => (
              <li key={i} className="flex gap-2 text-[13px] text-white/75">
                <span className="text-amber-400">▸</span><span>{a}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Export pack */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[12px] font-semibold text-white/60 tracking-wide uppercase">レポートパック生成</h3>
            <button onClick={async () => {
              const pack = await fetchAPI<any>(`/api/v1/pilots/${id}/export-pack?audience=${audience}`, { method: "POST" })
              const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" })
              const url = URL.createObjectURL(blob)
              const a = document.createElement("a"); a.href = url; a.download = `pilot-${id}-${audience}.json`; a.click()
              URL.revokeObjectURL(url)
            }} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-[12px]">
              <Download className="w-3.5 h-3.5" /> ダウンロード
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { v: "executive", label: "経営向け", icon: FileText },
              { v: "brand", label: "事業部向け", icon: Building2 },
              { v: "it", label: "情シス向け", icon: FileText },
              { v: "store_manager", label: "店長向け", icon: Users },
            ].map((a) => (
              <button key={a.v} onClick={() => setAudience(a.v as any)} className={`flex flex-col items-center gap-1 px-3 py-3 rounded border text-[11px] transition-colors ${audience === a.v ? "border-blue-400/40 bg-blue-500/[0.10] text-blue-300" : "border-white/[0.06] text-white/55 hover:bg-white/[0.04]"}`}>
                <a.icon className="w-4 h-4" />
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
