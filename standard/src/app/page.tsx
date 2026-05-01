"use client";

import { useState } from "react";
import Link from "next/link";
import { ContextHeader } from "@/components/context-header";
import { AIPanel, type AIInsight } from "@/components/ai-panel";
import {
  stores, totalKpi, alerts, chain,
} from "@/lib/mock-data";
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  ChevronRight, Bell,
} from "lucide-react";

const trendIcon = {
  up: <TrendingUp className="w-4 h-4 text-emerald-400" />,
  down: <TrendingDown className="w-4 h-4 text-red-400" />,
  flat: <Minus className="w-4 h-4 text-white/30" />,
};

const trendColor = {
  up: "text-emerald-400",
  down: "text-red-400",
  flat: "text-white/40",
};

const fmt = (n: number) => n.toLocaleString("ja-JP");
const fmtYen = (n: number) => `¥${fmt(n)}`;

const aiInsights: AIInsight[] = [
  {
    id: "ins-1",
    finding: "自由が丘店の原価率が33.8%で全店最悪。カルビ仕入値の上昇と廃棄増加が主因。",
    evidence: [
      "原価率: 33.8%（目標32%を1.8pt超過）",
      "カルビ仕入値: 前月比+8%上昇",
      "廃棄率: 4.5%（全店平均3.1%）",
    ],
    recommended_action: "カルビの仕入先を武蔵小杉店と同じ「肉の山崎」に変更。副菜の仕込み量を20%削減。",
    expected_impact: "原価率33.8%→31.5%（月間-¥52,000）",
    confidence: "High",
    requires_approval: true,
    generated_at: "14:30",
  },
  {
    id: "ins-2",
    finding: "チーズトッポギが全店で+22%の伸び。武蔵小杉店が牽引。SNS投稿の増加が追い風。",
    evidence: [
      "全店注文数: 前月比+22%",
      "武蔵小杉店: +35%で最大の伸び",
      "Instagram #炎チーズトッポギ 投稿数: 3倍増",
    ],
    recommended_action: "全店でSNS映えを意識した盛り付けに統一。卓上POPを作成して全店配布。",
    expected_impact: "全店売上+¥25,000/週",
    confidence: "Medium",
    requires_approval: false,
    generated_at: "13:45",
  },
  {
    id: "ins-3",
    finding: "三軒茶屋店の水曜客数が4週連続で減少。近隣の新規韓国料理店への流出が推測。",
    evidence: [
      "水曜客数: 4週前58→今週42人(-28%)",
      "近隣「韓の家」が3月オープン",
      "水曜の売上: ¥180,000→¥135,000",
    ],
    recommended_action: "水曜限定「炎の焼肉食べ放題¥3,980」を試験導入。",
    expected_impact: "水曜客数42→55人（+¥58,000/週）",
    confidence: "Medium",
    requires_approval: true,
    generated_at: "12:00",
  },
];

export default function DashboardPage() {
  const [showAI, setShowAI] = useState(true);

  const salesChange = ((totalKpi.monthly_sales - totalKpi.monthly_prev) / totalKpi.monthly_prev * 100).toFixed(1);
  const profitChange = ((totalKpi.profit_estimate - totalKpi.profit_prev) / totalKpi.profit_prev * 100).toFixed(1);

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col overflow-hidden">
        <ContextHeader
          title="全店ダッシュボード"
          subtitle={`${chain.name} — ${chain.area}`}
          storeCount={chain.store_count}
        />

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top KPI row */}
          <div className="grid grid-cols-5 gap-4">
            <div className="rounded-xl border border-white/[0.06] bg-[#0f1419] p-5">
              <div className="text-[11px] font-bold tracking-[0.1em] text-white/40 uppercase">本日売上 Daily Sales</div>
              <div className="kpi-value text-[28px] text-orange-400 mt-2">{fmtYen(totalKpi.daily_sales)}</div>
              <div className="text-[11px] text-white/30 mt-1">5店舗合計</div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-[#0f1419] p-5">
              <div className="text-[11px] font-bold tracking-[0.1em] text-white/40 uppercase">月間売上 Monthly</div>
              <div className="kpi-value text-[28px] text-white/90 mt-2">{fmtYen(totalKpi.monthly_sales)}</div>
              <div className={`text-[12px] mt-1 ${Number(salesChange) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                前月比 {Number(salesChange) >= 0 ? "+" : ""}{salesChange}%
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-[#0f1419] p-5">
              <div className="text-[11px] font-bold tracking-[0.1em] text-white/40 uppercase">本日客数 Customers</div>
              <div className="kpi-value text-[28px] text-white/90 mt-2">{fmt(totalKpi.total_customers)}<span className="text-[15px] text-white/40 ml-1">人</span></div>
              <div className="text-[11px] text-white/30 mt-1">客単価 {fmtYen(totalKpi.avg_ticket)}</div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-[#0f1419] p-5">
              <div className="text-[11px] font-bold tracking-[0.1em] text-white/40 uppercase">月間利益 Profit</div>
              <div className="kpi-value text-[28px] text-emerald-400 mt-2">{fmtYen(totalKpi.profit_estimate)}</div>
              <div className={`text-[12px] mt-1 ${Number(profitChange) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                前月比 +{profitChange}%
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-[#0f1419] p-5">
              <div className="text-[11px] font-bold tracking-[0.1em] text-white/40 uppercase">アラート Alerts</div>
              <div className="kpi-value text-[28px] text-red-400 mt-2">{totalKpi.alert_count}<span className="text-[15px] text-white/40 ml-1">件</span></div>
              <div className="text-[11px] text-white/30 mt-1">
                更新 {totalKpi.updated_at}
              </div>
            </div>
          </div>

          {/* Cost indicators */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-white/[0.06] bg-[#0f1419] p-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-white/40">平均原価率 Food Cost</div>
                <div className={`kpi-value text-[24px] mt-1 ${totalKpi.avg_food_cost > 32 ? "text-red-400" : "text-white/90"}`}>{totalKpi.avg_food_cost}%</div>
              </div>
              <div className="text-[11px] text-white/30">目標 32%</div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-[#0f1419] p-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-white/40">平均人件費率 Labor</div>
                <div className="kpi-value text-[24px] text-white/90 mt-1">{totalKpi.avg_labor_cost}%</div>
              </div>
              <div className="text-[11px] text-white/30">目標 30%</div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-[#0f1419] p-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-white/40">平均廃棄率 Waste</div>
                <div className={`kpi-value text-[24px] mt-1 ${totalKpi.total_waste_pct > 3 ? "text-amber-400" : "text-white/90"}`}>{totalKpi.total_waste_pct}%</div>
              </div>
              <div className="text-[11px] text-white/30">目標 2.5%</div>
            </div>
          </div>

          {/* Store cards grid */}
          <div>
            <div className="section-title mb-3">店舗一覧 STORE OVERVIEW</div>
            <div className="grid grid-cols-5 gap-4">
              {stores.map(store => {
                const storeAlerts = alerts.filter(a => a.store_id === store.id);
                return (
                  <Link
                    key={store.id}
                    href="/compare"
                    className="group rounded-xl border border-white/[0.06] bg-[#0f1419] p-5 hover:border-orange-400/30 hover:bg-orange-400/[0.03] transition-all tap-scale cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-[14px] font-bold text-white/90">{store.name}</div>
                        <div className="text-[11px] text-white/30 mt-0.5">{store.area} · {store.seats}席</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {storeAlerts.length > 0 && (
                          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
                            <Bell className="w-3 h-3" />
                            {storeAlerts.length}
                          </span>
                        )}
                        {trendIcon[store.trend]}
                      </div>
                    </div>

                    <div className="kpi-value text-[22px] text-white/90">{fmtYen(store.daily_sales)}</div>
                    <div className="text-[11px] text-white/40 mt-1">客単価 {fmtYen(store.avg_ticket)}</div>

                    <div className="mt-3 pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-y-2 text-[11px]">
                      <div>
                        <span className="text-white/30">原価率</span>
                        <span className={`ml-2 font-medium ${store.food_cost_pct > 32 ? "text-red-400" : "text-white/70"}`}>{store.food_cost_pct}%</span>
                      </div>
                      <div>
                        <span className="text-white/30">人件費</span>
                        <span className={`ml-2 font-medium ${store.labor_cost_pct > 30 ? "text-amber-400" : "text-white/70"}`}>{store.labor_cost_pct}%</span>
                      </div>
                      <div>
                        <span className="text-white/30">廃棄率</span>
                        <span className={`ml-2 font-medium ${store.waste_pct > 3.5 ? "text-red-400" : "text-white/70"}`}>{store.waste_pct}%</span>
                      </div>
                      <div>
                        <span className="text-white/30">充足率</span>
                        <span className={`ml-2 font-medium ${store.staff_coverage < 0.9 ? "text-amber-400" : "text-emerald-400"}`}>{Math.round(store.staff_coverage * 100)}%</span>
                      </div>
                    </div>

                    {store.issues.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {store.issues.map((issue, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[10px] text-amber-400/80">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            {issue}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-end mt-3 text-[11px] text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      比較する <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recent alerts preview */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="section-title">最新アラート RECENT ALERTS</div>
              <Link href="/alerts" className="text-[11px] text-orange-400 hover:text-orange-300 flex items-center gap-1">
                すべて見る <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-2">
              {alerts.slice(0, 3).map(alert => (
                <Link
                  key={alert.id}
                  href="/alerts"
                  className="flex items-center gap-4 px-5 py-3.5 rounded-xl border border-white/[0.06] bg-[#0f1419] hover:border-orange-400/20 transition-all tap-scale"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    alert.severity === "high" ? "bg-red-500" : alert.severity === "medium" ? "bg-amber-500" : "bg-blue-400"
                  }`} />
                  <span className="text-[11px] text-white/40 w-16 shrink-0">{alert.store_name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded shrink-0 ${
                    alert.severity === "high" ? "bg-red-500/10 text-red-400" : alert.severity === "medium" ? "bg-amber-500/10 text-amber-400" : "bg-blue-400/10 text-blue-400"
                  }`}>{alert.type}</span>
                  <span className="text-[13px] text-white/70 flex-1">{alert.title}</span>
                  <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Panel */}
      {showAI && <AIPanel insights={aiInsights} />}
    </div>
  );
}
