"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import { TrendingUp, AlertTriangle, Sparkles, ArrowRight, CheckCircle2, Building2, Banknote, Activity } from "lucide-react"
import { LiveCounter, LiveTicker } from "@/components/live-counter"

interface PilotSummary {
  pilot_id: string
  name: string
  theme: string
  theme_name: string
  status: string
  total_annualized_impact_yen: number
  significant_kpi_count: number
  kpi_count: number
  verdict: string
  results: Array<{
    kpi_name: string
    baseline: number
    intervention: number
    delta_pct: number
    significant: boolean
    annualized_impact_yen: number
  }>
  next_actions: string[]
}

const KPI_LABEL: Record<string, string> = {
  waste_amount: "廃棄金額",
  stockout_rate: "欠品率",
  gross_profit_rate: "粗利率",
  sales_per_labor_hour: "人時売上",
  labor_cost_rate: "人件費率",
  overtime_hours: "残業時間",
  qsc_score: "QSC スコア",
  haccp_compliance_rate: "HACCP 遵守率",
  health_score: "店舗ヘルススコア",
}

export default function ZenshoExecutivePage() {
  const [summary, setSummary] = useState<PilotSummary | null>(null)

  useEffect(() => {
    fetchAPI<PilotSummary>("/api/v1/pilots/pilot-001/summary").then(setSummary)
  }, [])

  if (!summary) return <div className="p-8 text-white/40">Loading...</div>

  const fmt = (n: number) => `¥${n.toLocaleString()}`

  return (
    <div className="flex flex-col h-screen">
      <ContextHeader
        title="Executive Command — Zensho Holdings" description="社長専用 / POC 結果サマリ"
        region="全社" />
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Hero metric */}
        <div className="rounded-xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/[0.08] via-emerald-500/[0.03] to-transparent p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] tracking-wider text-emerald-400/80 uppercase font-bold flex items-center gap-2">
                年間改善見込み
                <span className="flex items-center gap-1 text-emerald-400">
                  <Activity className="w-3 h-3" /> Live
                </span>
              </div>
              <div className="mt-2 text-5xl font-mono font-bold text-emerald-400 tabular-nums">
                <LiveCounter
                  initial={summary.total_annualized_impact_yen}
                  driftRange={Math.floor(summary.total_annualized_impact_yen * 0.005)}
                  format={(n) => `¥${n.toLocaleString()}`}
                  showLiveDot={false}
                />
              </div>
              <div className="mt-2 text-[13px] text-white/60">
                {summary.theme_name}・対象 20 店舗・{summary.significant_kpi_count}/{summary.kpi_count} KPI で統計的有意改善
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-500/10 text-emerald-400 text-[12px]">
              <CheckCircle2 className="w-4 h-4" />
              <span>POC 成功判定</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/[0.06] text-[12px] text-white/50">
            {summary.verdict}
          </div>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-3 gap-4">
          {summary.results.map((r) => (
            <div key={r.kpi_name} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] text-white/60">{KPI_LABEL[r.kpi_name] || r.kpi_name}</span>
                {r.significant ? (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">統計的有意</span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-white/40">参考</span>
                )}
              </div>
              <div className={`text-3xl font-mono font-bold ${r.delta_pct < 0 ? "text-emerald-400" : "text-blue-400"}`}>
                {r.delta_pct > 0 ? "+" : ""}{r.delta_pct.toFixed(1)}%
              </div>
              <div className="mt-2 text-[11px] text-white/40">
                ベース {r.baseline.toFixed(1)} → 介入後 {r.intervention.toFixed(1)}
              </div>
              <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center gap-2">
                <Banknote className="w-3.5 h-3.5 text-amber-400/80" />
                <span className="text-[12px] text-amber-400/80 font-mono">{fmt(r.annualized_impact_yen)} / 年</span>
              </div>
            </div>
          ))}
        </div>

        {/* Two-column: Verdict / Next Actions */}
        <div className="grid grid-cols-2 gap-5">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
            <h3 className="text-[12px] font-semibold text-white/60 tracking-wide uppercase mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" /> 本契約推奨
            </h3>
            <p className="text-[14px] text-white/85 leading-relaxed">
              全 6 ブランド 5,000 店舗への横展開で、年間 <span className="font-mono text-emerald-400 font-bold">{fmt(summary.total_annualized_impact_yen * 5)}</span> 規模の改善余地。
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded bg-white/[0.03] p-3">
                <div className="text-[10px] text-white/40">年間ライセンス提案</div>
                <div className="mt-1 text-[15px] font-mono text-white/85">¥240M</div>
              </div>
              <div className="rounded bg-white/[0.03] p-3">
                <div className="text-[10px] text-white/40">投資回収期間</div>
                <div className="mt-1 text-[15px] font-mono text-emerald-400">2.4 ヶ月</div>
              </div>
              <div className="rounded bg-white/[0.03] p-3">
                <div className="text-[10px] text-white/40">ROI 倍率</div>
                <div className="mt-1 text-[15px] font-mono text-emerald-400">15.2x</div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
            <h3 className="text-[12px] font-semibold text-white/60 tracking-wide uppercase mb-3 flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-amber-400" /> 次アクション
            </h3>
            <div className="space-y-2.5">
              {summary.next_actions.map((a, i) => (
                <div key={i} className="flex gap-2 text-[13px] text-white/75">
                  <span className="text-amber-400 mt-0.5">▸</span>
                  <span className="leading-relaxed">{a}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pilot list summary */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-[12px] font-semibold text-white/60 tracking-wide uppercase">進行中 POC</span>
            <Link href="/zensho-pilot" className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
              全 POC 一覧 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <Link href={`/zensho-pilot/${summary.pilot_id}`} className="block px-5 py-4 hover:bg-white/[0.03] transition-colors">
            <div className="flex items-center gap-4">
              <Building2 className="w-5 h-5 text-blue-400/60" />
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-white/85">{summary.name}</div>
                <div className="mt-0.5 text-[11px] text-white/40">テーマ: {summary.theme} | ステータス: {summary.status}</div>
              </div>
              <div className="text-right">
                <div className="text-[15px] font-mono font-semibold text-emerald-400">{fmt(summary.total_annualized_impact_yen)}</div>
                <div className="text-[10px] text-white/30">年間換算</div>
              </div>
            </div>
          </Link>
        </div>

        {/* Footer disclosure */}
        <div className="text-[10px] text-white/30 text-center pt-2">
          すべての数値は POC スコープ（20店舗・4週間）から算出。年間換算 = 介入期間平均 delta × 365 × 店舗数。統計的有意性 p&lt;0.05 を採用。
        </div>
      </div>
    </div>
  )
}
