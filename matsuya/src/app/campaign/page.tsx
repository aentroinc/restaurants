"use client";

import { useState } from "react";
import { ContextHeader } from "@/components/context-header";
import { AIPanel, type AIInsight } from "@/components/ai-panel";
import { campaigns, menuItems, stores, brands } from "@/lib/mock-data";
import {
  BarChart3, TrendingUp, Users, DollarSign, Filter, ArrowUpRight,
} from "lucide-react";

const campInsights: AIInsight[] = [
  {
    id: "camp-1",
    finding: "牛めしバーガーはロードサイド店舗で昼帯に客単価+12%だが、駅前店舗の夜帯では構成比2.1%と低迷。",
    evidence: [
      "ロードサイド昼帯: 構成比14.2%、客単価+12.3%",
      "駅前夜帯: 構成比2.1%、客単価影響なし",
      "全体売上リフト: +18.3% (目標+15%を上回る)",
    ],
    recommended_action: "駅前店舗の夜帯にセット訴求POP追加。券売機表示順を3位→1位に変更。並行して夜帯限定割引を検討。",
    expected_impact: "駅前夜帯構成比2.1%→5%、全体リフト+20%超",
    confidence: "Medium",
    requires_approval: true,
    generated_at: "14:30",
  },
  {
    id: "camp-2",
    finding: "春のランチ強化キャンペーンの効果が首都圏に偏在。地方ロードサイドでは客数リフトが+1.2%に留まる。",
    evidence: [
      "首都圏駅前: 客数リフト+8.7%",
      "地方ロードサイド: 客数リフト+1.2%",
      "地方の認知率: 推定28% (首都圏65%)",
    ],
    recommended_action: "地方ロードサイド店舗向けにPOP・のぼり追加配布。券売機のランチセット表示を強化。",
    expected_impact: "地方リフト+1.2%→+4.5%",
    confidence: "Low",
    requires_approval: false,
    generated_at: "10:00",
  },
];

const locationTypes = ["駅前","ロードサイド","商業施設","住宅地"] as const;
const timeSlots = ["朝 (6-10)", "昼 (11-14)", "午後 (14-17)", "夜 (17-21)", "深夜 (21-2)"];

// Simulated performance data per campaign
const campaignPerformance = campaigns.map(c => ({
  ...c,
  byRegion: [
    { region: "首都圏", lift: c.sales_lift_pct * (0.9 + Math.random() * 0.3), customers: Math.round(c.customer_lift_pct * (0.8 + Math.random() * 0.4) * 100) / 100 },
    { region: "関西", lift: c.sales_lift_pct * (0.5 + Math.random() * 0.4), customers: Math.round(c.customer_lift_pct * (0.5 + Math.random() * 0.3) * 100) / 100 },
    { region: "東海", lift: c.sales_lift_pct * (0.4 + Math.random() * 0.3), customers: Math.round(c.customer_lift_pct * (0.3 + Math.random() * 0.4) * 100) / 100 },
    { region: "九州", lift: c.sales_lift_pct * (0.3 + Math.random() * 0.3), customers: Math.round(c.customer_lift_pct * (0.2 + Math.random() * 0.3) * 100) / 100 },
  ],
  byLocationType: locationTypes.map(lt => ({
    type: lt,
    lift: Math.round(c.sales_lift_pct * (lt === "駅前" ? 1.1 : lt === "ロードサイド" ? 0.8 : lt === "商業施設" ? 0.9 : 0.5) * 100) / 100,
  })),
  byTime: timeSlots.map((slot, i) => ({
    slot,
    lift: Math.round(c.sales_lift_pct * (i === 1 ? 1.3 : i === 3 ? 0.7 : 0.5 + Math.random() * 0.5) * 100) / 100,
  })),
}));

export default function CampaignPage() {
  const [selectedCampaign, setSelectedCampaign] = useState(campaignPerformance[0]);

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col min-w-0">
        <ContextHeader title="Campaign & Menu Performance" subtitle="新商品・販促の効果分析" />

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Campaign selector */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {campaignPerformance.map((c) => (
              <button
                key={c.campaign_id}
                onClick={() => setSelectedCampaign(c)}
                className={`shrink-0 rounded-lg border px-4 py-2.5 text-left transition-colors ${
                  selectedCampaign.campaign_id === c.campaign_id
                    ? "border-blue-400/30 bg-blue-500/10"
                    : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <div className="text-[12px] text-white/70 font-medium">{c.name}</div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-white/40">
                  <span>{c.start_date} ~ {c.end_date}</span>
                  <span className="text-emerald-400">+{c.sales_lift_pct}%</span>
                </div>
              </button>
            ))}
          </div>

          {/* Campaign summary */}
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] text-white/40">売上リフト</span>
              </div>
              <div className="kpi-value text-xl text-emerald-400">+{selectedCampaign.sales_lift_pct}%</div>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] text-white/40">客数リフト</span>
              </div>
              <div className="kpi-value text-xl text-blue-400">+{selectedCampaign.customer_lift_pct}%</div>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-white/50" />
                <span className="text-[10px] text-white/40">対象セグメント</span>
              </div>
              <div className="text-[13px] text-white/70 font-medium mt-1">{selectedCampaign.target_segment}</div>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-white/50" />
                <span className="text-[10px] text-white/40">対象メニュー</span>
              </div>
              <div className="space-y-0.5 mt-1">
                {selectedCampaign.target_menu.map(mid => {
                  const menu = menuItems.find(m => m.menu_id === mid);
                  return menu ? (
                    <div key={mid} className="text-[11px] text-white/50">{menu.name}</div>
                  ) : null;
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* By region */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <div className="px-4 py-2 border-b border-white/[0.06]">
                <span className="section-title">Region Breakdown</span>
              </div>
              <div className="p-4 space-y-3">
                {selectedCampaign.byRegion.map((r) => (
                  <div key={r.region}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-white/60">{r.region}</span>
                      <span className="text-[11px] font-mono text-emerald-400">+{r.lift.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-400/50"
                        style={{ width: `${Math.min(100, (r.lift / selectedCampaign.sales_lift_pct) * 80)}%` }}
                      />
                    </div>
                    <div className="text-[9px] text-white/30 mt-0.5">客数: +{r.customers}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* By location type */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <div className="px-4 py-2 border-b border-white/[0.06]">
                <span className="section-title">Location Type</span>
              </div>
              <div className="p-4 space-y-3">
                {selectedCampaign.byLocationType.map((lt) => (
                  <div key={lt.type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-white/60">{lt.type}</span>
                      <span className={`text-[11px] font-mono ${lt.lift > selectedCampaign.sales_lift_pct * 0.8 ? "text-emerald-400" : "text-amber-400"}`}>
                        +{lt.lift}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${lt.lift > selectedCampaign.sales_lift_pct * 0.8 ? "bg-emerald-400/50" : "bg-amber-400/40"}`}
                        style={{ width: `${Math.min(100, (lt.lift / selectedCampaign.sales_lift_pct) * 80)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* By time slot */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <div className="px-4 py-2 border-b border-white/[0.06]">
                <span className="section-title">Time Slot Performance</span>
              </div>
              <div className="p-4 space-y-3">
                {selectedCampaign.byTime.map((t) => (
                  <div key={t.slot}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-white/60">{t.slot}</span>
                      <span className={`text-[11px] font-mono ${t.lift > selectedCampaign.sales_lift_pct * 0.8 ? "text-emerald-400" : t.lift < selectedCampaign.sales_lift_pct * 0.4 ? "text-red-400" : "text-amber-400"}`}>
                        +{t.lift}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          t.lift > selectedCampaign.sales_lift_pct * 0.8 ? "bg-emerald-400/50" :
                          t.lift < selectedCampaign.sales_lift_pct * 0.4 ? "bg-red-400/40" : "bg-amber-400/40"
                        }`}
                        style={{ width: `${Math.min(100, (t.lift / selectedCampaign.sales_lift_pct) * 70)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* New menu performance */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <div className="px-4 py-2 border-b border-white/[0.06]">
              <span className="section-title">New Menu Items Performance</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-white/30 border-b border-white/[0.06]">
                    <th className="text-left px-4 py-2 font-medium">メニュー</th>
                    <th className="text-left px-3 py-2 font-medium">ブランド</th>
                    <th className="text-right px-3 py-2 font-medium">価格</th>
                    <th className="text-right px-3 py-2 font-medium">粗利推定</th>
                    <th className="text-right px-3 py-2 font-medium">駅前昼</th>
                    <th className="text-right px-3 py-2 font-medium">駅前夜</th>
                    <th className="text-right px-3 py-2 font-medium">RS昼</th>
                    <th className="text-right px-3 py-2 font-medium">RS夜</th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.filter(m => m.is_new).map((menu) => {
                    const brand = brands.find(b => b.brand_id === menu.brand);
                    return (
                      <tr key={menu.menu_id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="px-4 py-2 text-white/70 font-medium">{menu.name}</td>
                        <td className="px-3 py-2 text-white/50">{brand?.name}</td>
                        <td className="px-3 py-2 text-right font-mono text-white/50">¥{menu.price}</td>
                        <td className="px-3 py-2 text-right font-mono text-white/50">{(menu.gross_margin_estimate * 100).toFixed(0)}%</td>
                        <td className="px-3 py-2 text-right font-mono text-emerald-400">
                          <span className="flex items-center justify-end gap-0.5"><ArrowUpRight className="w-3 h-3" />{(8 + Math.random() * 6).toFixed(1)}%</span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-amber-400">
                          {(1 + Math.random() * 3).toFixed(1)}%
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-emerald-400">
                          <span className="flex items-center justify-end gap-0.5"><ArrowUpRight className="w-3 h-3" />{(10 + Math.random() * 8).toFixed(1)}%</span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-white/40">
                          {(2 + Math.random() * 4).toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <AIPanel insights={campInsights} />
    </div>
  );
}
