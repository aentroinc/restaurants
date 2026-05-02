"use client"

import { useEffect, useState, useMemo } from "react"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import type { QSCAuditItem } from "@/lib/types"

function scoreColor(score: number): string {
  if (score >= 85) return "text-emerald-400"
  if (score >= 70) return "text-cyan-400"
  if (score >= 55) return "text-amber-400"
  return "text-red-400"
}

function barColor(score: number): string {
  if (score >= 85) return "bg-emerald-400"
  if (score >= 70) return "bg-cyan-400"
  if (score >= 55) return "bg-amber-400"
  return "bg-red-400"
}

export default function QSCPage() {
  const [audits, setAudits] = useState<QSCAuditItem[]>([])

  useEffect(() => {
    fetchAPI<QSCAuditItem[]>("/api/v1/qsc/audits").then((data) => {
      const sorted = [...data].sort((a, b) => b.overall_score - a.overall_score)
      setAudits(sorted)
    })
  }, [])

  const avgQ = useMemo(() => audits.length ? Math.round(audits.reduce((s, a) => s + a.quality_score, 0) / audits.length * 10) / 10 : 0, [audits])
  const avgS = useMemo(() => audits.length ? Math.round(audits.reduce((s, a) => s + a.service_score, 0) / audits.length * 10) / 10 : 0, [audits])
  const avgC = useMemo(() => audits.length ? Math.round(audits.reduce((s, a) => s + a.cleanliness_score, 0) / audits.length * 10) / 10 : 0, [audits])
  const avgO = useMemo(() => audits.length ? Math.round(audits.reduce((s, a) => s + a.overall_score, 0) / audits.length * 10) / 10 : 0, [audits])

  return (
    <div className="min-h-full bg-[#0a0e14] text-white/80 flex flex-col">
      <ContextHeader title="QSC監査" description="品質・サービス・清潔度の監査結果" />

      <div className="px-5 py-5 space-y-5">
        {/* Average scores */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Q平均（品質）", value: avgQ },
            { label: "S平均（サービス）", value: avgS },
            { label: "C平均（清潔度）", value: avgC },
            { label: "総合平均", value: avgO },
          ].map((card) => (
            <div key={card.label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">{card.label}</div>
              <div className={`font-mono tabular-nums text-2xl font-semibold ${scoreColor(card.value)}`}>{card.value}</div>
              <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div className={`h-full rounded-full ${barColor(card.value)}`} style={{ width: `${card.value}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Audit table */}
        <div className="rounded-lg border border-white/[0.06] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead><tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">店舗名</th>
              <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">監査日</th>
              <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium w-[120px]">Q（品質）</th>
              <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium w-[120px]">S（サービス）</th>
              <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium w-[120px]">C（清潔度）</th>
              <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">総合</th>
            </tr></thead>
            <tbody>
              {audits.map((a) => (
                <tr key={a.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-white/80">{a.store_name}</td>
                  <td className="px-4 py-3 text-white/50 font-mono text-[12px]">{a.audit_date}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className={`h-full rounded-full ${barColor(a.quality_score)}`} style={{ width: `${a.quality_score}%` }} />
                      </div>
                      <span className={`font-mono tabular-nums text-[12px] w-8 text-right ${scoreColor(a.quality_score)}`}>{a.quality_score}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className={`h-full rounded-full ${barColor(a.service_score)}`} style={{ width: `${a.service_score}%` }} />
                      </div>
                      <span className={`font-mono tabular-nums text-[12px] w-8 text-right ${scoreColor(a.service_score)}`}>{a.service_score}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className={`h-full rounded-full ${barColor(a.cleanliness_score)}`} style={{ width: `${a.cleanliness_score}%` }} />
                      </div>
                      <span className={`font-mono tabular-nums text-[12px] w-8 text-right ${scoreColor(a.cleanliness_score)}`}>{a.cleanliness_score}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-mono tabular-nums text-lg font-semibold ${scoreColor(a.overall_score)}`}>{a.overall_score}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
