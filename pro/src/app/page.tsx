"use client";

import { useState } from "react";
import { ContextHeader } from "@/components/context-header";
import { AIPanel, type AIInsight } from "@/components/ai-panel";
import { totalKpi, areas, stores, signals } from "@/lib/mock-data";
import {
  TrendingUp, TrendingDown, Minus, Users, Receipt,
  Wallet, AlertTriangle, ChevronDown, ChevronUp,
} from "lucide-react";

const fmt = (n: number) => n.toLocaleString("ja-JP");
const pct = (cur: number, prev: number) => {
  const v = ((cur - prev) / prev) * 100;
  return { value: v, label: (v >= 0 ? "+" : "") + v.toFixed(1) + "%" };
};

const insights: AIInsight[] = [
  {
    id: "INS-1",
    finding: "渋谷店の売上が3日連続で予測比-22%。競合出店の影響が疑われます。即時のクーポン施策を推奨。",
    evidence: [
      "火-木の売上: ¥143,000/日 (予測: ¥185,000)",
      "客数-18%, 客単価-5%",
      "5/1に「松のや渋谷店」がオープン",
    ],
    recommended_action: "ランチセット¥100引きクーポンを渋谷店限定で即日配布。佐々木SVが明日訪店。",
    expected_impact: "月間売上-¥180,000の損失を回避",
    confidence: "High",
    requires_approval: true,
    generated_at: "15:30",
  },
  {
    id: "INS-2",
    finding: "海老フライ定食キャンペーンが好調(+12.4%)。5/6終了予定だが延長すれば追加売上+¥220万の見込み。",
    evidence: [
      "開始3日で全店平均売上リフト+12.4%",
      "商業施設型で特に好調(+18%)",
      "海老の追加発注は5/4がデッドライン",
    ],
    recommended_action: "5/15まで10日間延長。海老の追加発注を5/4までに実施。",
    expected_impact: "追加売上+¥2,200,000(10日間)",
    confidence: "High",
    requires_approval: true,
    generated_at: "14:15",
  },
];

const trendIcon = (t: "up" | "flat" | "down") => {
  if (t === "up") return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (t === "down") return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-white/30" />;
};

export default function DashboardPage() {
  const [showBottom, setShowBottom] = useState(false);

  const sorted = [...stores].sort((a, b) => b.daily_sales - a.daily_sales);
  const top5 = sorted.slice(0, 5);
  const bottom5 = sorted.slice(-5).reverse();
  const displayed = showBottom ? bottom5 : top5;

  const salesChange = pct(totalKpi.monthly_sales, totalKpi.monthly_prev);

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col overflow-hidden">
        <ContextHeader
          title="全社ダッシュボード"
          subtitle="とんかつ かつ善"
          storeCount={28}
        />
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top KPIs */}
          <div className="grid grid-cols-4 gap-4">
            {[
              {
                label: "月間売上",
                value: `¥${fmt(totalKpi.monthly_sales)}`,
                sub: salesChange.label,
                color: salesChange.value >= 0 ? "text-emerald-400" : "text-red-400",
                icon: Wallet,
              },
              {
                label: "1日あたり客数",
                value: fmt(totalKpi.total_customers),
                sub: "全28店舗合計",
                color: "text-white/40",
                icon: Users,
              },
              {
                label: "平均客単価",
                value: `¥${fmt(totalKpi.avg_ticket)}`,
                sub: `原価率 ${totalKpi.avg_food_cost}%`,
                color: "text-white/40",
                icon: Receipt,
              },
              {
                label: "月間営業利益(推定)",
                value: `¥${fmt(totalKpi.profit_estimate)}`,
                sub: `人件費率 ${totalKpi.avg_labor_cost}%`,
                color: "text-white/40",
                icon: TrendingUp,
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-lg border border-white/[0.06] bg-[#0f1419] p-5 hover:border-white/[0.12] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-3">
                  <kpi.icon className="w-4 h-4 text-white/30" strokeWidth={1.5} />
                  <span className="text-[11px] font-bold tracking-[0.08em] text-white/40 uppercase">
                    {kpi.label}
                  </span>
                </div>
                <div className="kpi-value text-[24px] text-white/90">{kpi.value}</div>
                <div className={`text-[12px] mt-1 ${kpi.color}`}>{kpi.sub}</div>
              </div>
            ))}
          </div>

          {/* Area Cards + Signal Badge */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title">エリア別サマリ</h2>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 cursor-pointer hover:bg-amber-500/15 transition-colors">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[12px] text-amber-400 font-medium">
                  {totalKpi.alert_count} シグナル
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {areas.map((area) => {
                const change = pct(area.monthly_sales, area.monthly_prev);
                return (
                  <div
                    key={area.id}
                    className="rounded-lg border border-white/[0.06] bg-[#0f1419] p-5 hover:border-emerald-400/30 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-[14px] font-semibold text-white/80 group-hover:text-emerald-400 transition-colors">
                          {area.name}
                        </div>
                        <div className="text-[11px] text-white/30 mt-0.5">
                          {area.manager} / {area.store_count}店舗
                        </div>
                      </div>
                      {area.alert_count > 0 && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">
                          {area.alert_count}件
                        </span>
                      )}
                    </div>
                    <div className="kpi-value text-[20px] text-white/90 mb-2">
                      ¥{fmt(area.monthly_sales)}
                    </div>
                    <div className="flex items-center gap-4 text-[12px]">
                      <span className={change.value >= 0 ? "text-emerald-400" : "text-red-400"}>
                        {change.label}
                      </span>
                      <span className="text-white/30">原価 {area.avg_food_cost}%</span>
                      <span className="text-white/30">人件費 {area.avg_labor_cost}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Store Ranking */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="section-title">店舗ランキング</h2>
              <button
                onClick={() => setShowBottom(!showBottom)}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-white/[0.06] text-white/50 hover:text-white/80 transition-colors"
              >
                {showBottom ? (
                  <>
                    <ChevronDown className="w-3 h-3" /> 下位5店
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-3 h-3" /> 上位5店
                  </>
                )}
              </button>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-[#0f1419] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {["#", "店舗名", "タイプ", "日商", "客数", "客単価", "原価率", "トレンド"].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-[11px] font-bold tracking-[0.06em] text-white/30 uppercase px-4 py-3 text-left"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((store, i) => {
                    const rank = showBottom
                      ? stores.length - (bottom5.length - 1 - i)
                      : i + 1;
                    return (
                      <tr
                        key={store.id}
                        className="border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-[13px] font-mono text-white/30">
                          {rank}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-white/80 font-medium">
                          {store.name}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-white/40">
                          {store.type}
                        </td>
                        <td className="px-4 py-3 text-[13px] font-mono text-white/80">
                          ¥{fmt(store.daily_sales)}
                        </td>
                        <td className="px-4 py-3 text-[13px] font-mono text-white/60">
                          {store.customers}
                        </td>
                        <td className="px-4 py-3 text-[13px] font-mono text-white/60">
                          ¥{fmt(store.avg_ticket)}
                        </td>
                        <td className="px-4 py-3 text-[13px] font-mono text-white/60">
                          <span
                            className={
                              store.food_cost_pct > 32
                                ? "text-red-400"
                                : store.food_cost_pct > 31
                                ? "text-amber-400"
                                : "text-white/60"
                            }
                          >
                            {store.food_cost_pct}%
                          </span>
                        </td>
                        <td className="px-4 py-3">{trendIcon(store.trend)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* AI Panel */}
      <AIPanel insights={insights} />
    </div>
  );
}
