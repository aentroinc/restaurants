"use client"

import { useEffect, useState } from "react"
import { ContextHeader } from "@/components/context-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fetchAPI } from "@/lib/api"
import type { HACCPComplianceRate } from "@/lib/types"
import { CheckCircle2, XCircle } from "lucide-react"

interface MonitoringEntry {
  id: string; store_name: string; checkpoint: string; recorded_value: string; threshold: string; compliant: boolean; recorded_at: string;
}
interface AllergenRow {
  product: string; allergens: Record<string, boolean>;
}

const ALLERGENS = ["小麦", "卵", "乳", "えび", "かに", "そば", "落花生"]

export default function HACCPPage() {
  const [compliance, setCompliance] = useState<HACCPComplianceRate | null>(null)
  const [monitoring, setMonitoring] = useState<MonitoringEntry[]>([])
  const [allergens, setAllergens] = useState<AllergenRow[]>([])

  useEffect(() => {
    fetchAPI<HACCPComplianceRate>("/api/v1/haccp/compliance").then(setCompliance)
    fetchAPI<MonitoringEntry[]>("/api/v1/haccp/monitoring").then(setMonitoring)
    fetchAPI<AllergenRow[]>("/api/v1/haccp/allergens").then(setAllergens)
  }, [])

  const rate = compliance?.compliance_rate ?? 0

  return (
    <div className="min-h-full bg-[#0a0e14] text-white/80 flex flex-col">
      <ContextHeader title="HACCP管理" description="食品衛生管理とアレルゲン情報" />

      <div className="px-5 py-5 space-y-5">
        {/* Compliance rate gauge */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-6 flex items-center gap-8">
          <div className="relative w-32 h-32 shrink-0">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              <circle cx="60" cy="60" r="50" fill="none" stroke={rate >= 95 ? "#22c55e" : rate >= 85 ? "#f59e0b" : "#ef4444"} strokeWidth="10" strokeDasharray={`${rate * 3.14} ${314 - rate * 3.14}`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`font-mono tabular-nums text-2xl font-bold ${rate >= 95 ? "text-emerald-400" : rate >= 85 ? "text-amber-400" : "text-red-400"}`}>{rate}%</span>
              <span className="text-[9px] text-white/40 uppercase tracking-wider">適合率</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">HACCP適合状況</div>
            <div className="text-[13px] text-white/60">総記録数: <span className="font-mono text-white/80">{compliance?.total_records?.toLocaleString()}</span></div>
            <div className="text-[13px] text-white/60">適合: <span className="font-mono text-emerald-400">{compliance?.compliant?.toLocaleString()}</span></div>
            <div className="text-[13px] text-white/60">不適合: <span className="font-mono text-red-400">{compliance ? (compliance.total_records - compliance.compliant).toLocaleString() : "-"}</span></div>
          </div>
        </div>

        <Tabs defaultValue="monitoring" className="w-full">
          <TabsList className="bg-white/[0.04] border border-white/[0.06]">
            <TabsTrigger value="monitoring" className="data-[state=active]:bg-white/[0.08] data-[state=active]:text-white text-white/50">モニタリング記録</TabsTrigger>
            <TabsTrigger value="allergens" className="data-[state=active]:bg-white/[0.08] data-[state=active]:text-white text-white/50">アレルゲン</TabsTrigger>
          </TabsList>

          <TabsContent value="monitoring" className="mt-4">
            <div className="rounded-lg border border-white/[0.06] overflow-hidden">
              <table className="w-full text-[13px]">
                <thead><tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">店舗</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">チェックポイント</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">記録値</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">基準</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">適合</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">記録日時</th>
                </tr></thead>
                <tbody>
                  {monitoring.map((m) => (
                    <tr key={m.id} className={`border-b border-white/[0.04] hover:bg-white/[0.02] ${!m.compliant ? "bg-red-500/[0.03]" : ""}`}>
                      <td className="px-4 py-3 text-white/80">{m.store_name}</td>
                      <td className="px-4 py-3 text-white/70">{m.checkpoint}</td>
                      <td className="px-4 py-3 font-mono text-white/80">{m.recorded_value}</td>
                      <td className="px-4 py-3 font-mono text-white/50 text-[12px]">{m.threshold}</td>
                      <td className="px-4 py-3">
                        {m.compliant
                          ? <span className="flex items-center gap-1 text-emerald-400 text-[11px]"><CheckCircle2 className="w-3.5 h-3.5" />適合</span>
                          : <span className="flex items-center gap-1 text-red-400 text-[11px]"><XCircle className="w-3.5 h-3.5" />不適合</span>}
                      </td>
                      <td className="px-4 py-3 text-white/40 font-mono text-[12px]">{new Date(m.recorded_at).toLocaleString("ja-JP")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="allergens" className="mt-4">
            <div className="rounded-lg border border-white/[0.06] overflow-hidden">
              <table className="w-full text-[13px]">
                <thead><tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">商品名</th>
                  {ALLERGENS.map((a) => (
                    <th key={a} className="text-center px-2 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">{a}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {allergens.map((row) => (
                    <tr key={row.product} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-white/80 font-medium">{row.product}</td>
                      {ALLERGENS.map((a) => (
                        <td key={a} className="text-center px-2 py-3">
                          {row.allergens[a]
                            ? <span className="inline-block w-5 h-5 rounded-full bg-red-400/20 text-red-400 text-[11px] leading-5 font-bold">●</span>
                            : <span className="text-white/15">-</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center gap-4 text-[10px] text-white/40">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400/20 text-red-400 text-center text-[8px] leading-3">●</span> 含有</span>
              <span className="flex items-center gap-1.5"><span className="text-white/15">-</span> 非含有</span>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
