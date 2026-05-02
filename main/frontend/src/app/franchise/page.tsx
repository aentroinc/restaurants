"use client"

import { useEffect, useState, useMemo } from "react"
import { ContextHeader } from "@/components/context-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fetchAPI } from "@/lib/api"
import type { FranchiseAgreementItem, RoyaltyCalcItem } from "@/lib/types"

const agreementBadge: Record<string, string> = {
  "直営": "text-blue-400 bg-blue-400/10 border-blue-400/20",
  FC: "text-orange-400 bg-orange-400/10 border-orange-400/20",
}

const royaltyStatusBadge: Record<string, string> = {
  confirmed: "text-emerald-400 bg-emerald-400/10",
  pending: "text-amber-400 bg-amber-400/10",
  paid: "text-blue-400 bg-blue-400/10",
  overdue: "text-red-400 bg-red-400/10",
}

function formatRoyaltyStructure(rs: any): string {
  if (!rs || rs.type === "none") return "-"
  if (rs.type === "revenue_share") return `売上の${rs.rate}%`
  if (rs.type === "fixed_plus_rate") return `固定¥${(rs.fixed || 0).toLocaleString()} + ${rs.rate}%`
  return JSON.stringify(rs)
}

export default function FranchisePage() {
  const [agreements, setAgreements] = useState<FranchiseAgreementItem[]>([])
  const [royalties, setRoyalties] = useState<RoyaltyCalcItem[]>([])

  useEffect(() => {
    fetchAPI<FranchiseAgreementItem[]>("/api/v1/vertical/franchise/agreements").then(setAgreements)
    fetchAPI<RoyaltyCalcItem[]>("/api/v1/vertical/franchise/royalties").then(setRoyalties)
  }, [])

  const currentPeriodRoyalties = useMemo(() => royalties.filter((r) => r.period === "2026-04"), [royalties])
  const totalRoyalty = useMemo(() => currentPeriodRoyalties.reduce((s, r) => s + r.royalty_amount, 0), [currentPeriodRoyalties])

  return (
    <div className="min-h-full bg-[#0a0e14] text-white/80 flex flex-col">
      <ContextHeader title="FC会計" description="フランチャイズ契約・ロイヤリティ管理" />

      <div className="px-5 py-5">
        <Tabs defaultValue="agreements" className="w-full">
          <TabsList className="bg-white/[0.04] border border-white/[0.06]">
            <TabsTrigger value="agreements" className="data-[state=active]:bg-white/[0.08] data-[state=active]:text-white text-white/50">契約一覧</TabsTrigger>
            <TabsTrigger value="royalties" className="data-[state=active]:bg-white/[0.08] data-[state=active]:text-white text-white/50">ロイヤリティ計算</TabsTrigger>
          </TabsList>

          <TabsContent value="agreements" className="mt-4">
            <div className="rounded-lg border border-white/[0.06] overflow-hidden">
              <table className="w-full text-[13px]">
                <thead><tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">店舗名</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">契約形態</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">ロイヤリティ構造</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">有効期間</th>
                </tr></thead>
                <tbody>
                  {agreements.map((a) => (
                    <tr key={a.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-white/80">{a.store_name}</td>
                      <td className="px-4 py-3"><span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${agreementBadge[a.agreement_type] || ""}`}>{a.agreement_type}</span></td>
                      <td className="px-4 py-3 text-white/60 text-[12px]">{formatRoyaltyStructure(a.royalty_structure)}</td>
                      <td className="px-4 py-3 font-mono text-white/50 text-[12px]">{a.effective_from}~</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="royalties" className="mt-4 space-y-4">
            {/* Summary */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">月次ロイヤリティ合計（2026年4月）</div>
              <div className="font-mono tabular-nums text-2xl font-semibold text-white/90">¥{totalRoyalty.toLocaleString()}</div>
              <div className="text-[11px] text-white/40 mt-1">{currentPeriodRoyalties.length}店舗</div>
            </div>

            <div className="rounded-lg border border-white/[0.06] overflow-hidden">
              <table className="w-full text-[13px]">
                <thead><tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">店舗名</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">期間</th>
                  <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">売上</th>
                  <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">ロイヤリティ額</th>
                  <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">純支払額</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">ステータス</th>
                </tr></thead>
                <tbody>
                  {royalties.map((r) => (
                    <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-white/80">{r.store_name}</td>
                      <td className="px-4 py-3 font-mono text-white/50 text-[12px]">{r.period}</td>
                      <td className="px-4 py-3 font-mono tabular-nums text-white/70 text-right">¥{r.gross_revenue.toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono tabular-nums text-amber-400 text-right">¥{r.royalty_amount.toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono tabular-nums text-white/80 text-right">¥{r.net_payable.toLocaleString()}</td>
                      <td className="px-4 py-3"><span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${royaltyStatusBadge[r.status] || ""}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
