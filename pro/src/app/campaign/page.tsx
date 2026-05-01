"use client";

import { useState } from "react";
import { ContextHeader } from "@/components/context-header";
import { campaigns } from "@/lib/mock-data";
import {
  ChevronDown, ChevronRight, TrendingUp, Users,
  Calendar, Store, FileText,
} from "lucide-react";

const statusStyle: Record<string, string> = {
  "実施中": "bg-emerald-500/15 text-emerald-400",
  "終了": "bg-white/[0.06] text-white/30",
  "計画中": "bg-blue-500/15 text-blue-400",
};

const planningNotes: Record<string, string> = {
  C03: "新メニュー「チーズメンチカツ」のテスト販売。東京東部5店舗で先行実施後、全店展開の判断を行う。ターゲットは20-30代男性。価格帯¥1,280-1,380を検討中。",
};

export default function CampaignPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-screen">
      <ContextHeader title="キャンペーン分析" subtitle="実施中・終了・計画中" />
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-2">
          {[
            { label: "実施中", count: campaigns.filter((c) => c.status === "実施中").length, color: "text-emerald-400" },
            { label: "計画中", count: campaigns.filter((c) => c.status === "計画中").length, color: "text-blue-400" },
            { label: "終了", count: campaigns.filter((c) => c.status === "終了").length, color: "text-white/40" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-white/[0.06] bg-[#0f1419] p-4 cursor-pointer hover:border-white/[0.12] transition-colors">
              <div className="text-[11px] font-bold tracking-[0.08em] text-white/40 uppercase mb-1">{s.label}</div>
              <div className={`kpi-value text-[28px] ${s.color}`}>{s.count}</div>
            </div>
          ))}
        </div>

        {/* Campaign List */}
        {campaigns.map((campaign) => {
          const expanded = expandedId === campaign.id;
          return (
            <div
              key={campaign.id}
              className="rounded-lg border border-white/[0.06] bg-[#0f1419] overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(expanded ? null : campaign.id)}
                className="w-full flex items-center justify-between px-6 py-5 hover:bg-white/[0.02] transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  {expanded ? (
                    <ChevronDown className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
                  )}
                  <div>
                    <div className="text-[15px] font-semibold text-white/90">{campaign.name}</div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className={`text-[11px] px-2.5 py-0.5 rounded font-medium ${statusStyle[campaign.status]}`}>
                        {campaign.status}
                      </span>
                      <span className="text-[11px] text-white/30 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {campaign.period}
                      </span>
                      <span className="text-[11px] text-white/30 flex items-center gap-1">
                        <Store className="w-3 h-3" />
                        {campaign.target_stores}店舗
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {campaign.status !== "計画中" && (
                    <>
                      <div className="text-right">
                        <div className="text-[12px] text-white/25 mb-0.5">売上リフト</div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="kpi-value text-[18px] text-emerald-400">
                            +{campaign.sales_lift_pct}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[12px] text-white/25 mb-0.5">客数リフト</div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-blue-400" />
                          <span className="kpi-value text-[18px] text-blue-400">
                            +{campaign.customer_lift_pct}%
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                  {campaign.status === "計画中" && (
                    <span className="text-[12px] text-blue-400/60 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      計画詳細あり
                    </span>
                  )}
                </div>
              </button>

              {expanded && (
                <div className="border-t border-white/[0.06] px-6 py-5 space-y-4 animate-slide-down bg-white/[0.01]">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[12px] font-bold tracking-[0.08em] text-white/25 uppercase mb-1">
                        キャンペーンID
                      </div>
                      <div className="text-[13px] text-white/60 font-mono">{campaign.id}</div>
                    </div>
                    <div>
                      <div className="text-[12px] font-bold tracking-[0.08em] text-white/25 uppercase mb-1">
                        対象店舗数
                      </div>
                      <div className="text-[13px] text-white/60">{campaign.target_stores}店舗（{campaign.target_stores === 28 ? "全店" : "一部"}）</div>
                    </div>
                    <div>
                      <div className="text-[12px] font-bold tracking-[0.08em] text-white/25 uppercase mb-1">
                        実施期間
                      </div>
                      <div className="text-[13px] text-white/60">{campaign.period}</div>
                    </div>
                    <div>
                      <div className="text-[12px] font-bold tracking-[0.08em] text-white/25 uppercase mb-1">
                        ステータス
                      </div>
                      <span className={`text-[12px] px-2.5 py-0.5 rounded font-medium ${statusStyle[campaign.status]}`}>
                        {campaign.status}
                      </span>
                    </div>
                  </div>

                  {campaign.status !== "計画中" && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-4">
                        <div className="text-[12px] font-bold tracking-[0.08em] text-white/25 uppercase mb-2">
                          売上リフト
                        </div>
                        <div className="kpi-value text-[24px] text-emerald-400">+{campaign.sales_lift_pct}%</div>
                      </div>
                      <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-4">
                        <div className="text-[12px] font-bold tracking-[0.08em] text-white/25 uppercase mb-2">
                          客数リフト
                        </div>
                        <div className="kpi-value text-[24px] text-blue-400">+{campaign.customer_lift_pct}%</div>
                      </div>
                    </div>
                  )}

                  {planningNotes[campaign.id] && (
                    <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.04] p-4">
                      <div className="text-[12px] font-bold tracking-[0.08em] text-blue-400/60 uppercase mb-2">
                        計画メモ
                      </div>
                      <p className="text-[13px] text-white/60 leading-relaxed">{planningNotes[campaign.id]}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
