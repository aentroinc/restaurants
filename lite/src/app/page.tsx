"use client";

import Link from "next/link";
import { todayKpi, shop, aiAdvice, hourlySales, inventory } from "@/lib/mock-data";
import {
  TrendingUp, TrendingDown, Users, DollarSign, Utensils,
  Clock, AlertTriangle, Lightbulb, ChevronRight, ArrowUpRight,
  ArrowDownRight, Package,
} from "lucide-react";

function fmt(n: number) {
  return n.toLocaleString();
}

function delta(current: number, prev: number) {
  const pct = ((current - prev) / prev * 100).toFixed(1);
  const positive = current >= prev;
  return { pct: `${positive ? "+" : ""}${pct}%`, positive };
}

export default function TodayPage() {
  const salesD = delta(todayKpi.sales, todayKpi.sales_forecast);
  const custD = delta(todayKpi.customers, todayKpi.customers_forecast);
  const ticketD = delta(todayKpi.avg_ticket, todayKpi.avg_ticket_prev);
  const urgentAdvice = aiAdvice.filter(a => a.priority === "high");
  const lowStock = inventory.filter(i => i.status !== "ok");

  return (
    <div className="px-4 pt-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{shop.name}</h1>
          <p className="text-xs text-gray-400 mt-0.5">5月1日(木) {todayKpi.updated_at}時点</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-gray-400">本日の予約</div>
          <div className="text-lg font-bold text-blue-600">{todayKpi.reservations_tonight}組</div>
          <div className="text-[10px] text-gray-400">ウォークイン{todayKpi.walk_in_pct}%</div>
        </div>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
            <DollarSign className="w-3.5 h-3.5" />本日売上
          </div>
          <div className="kpi-value text-2xl text-gray-900">¥{fmt(todayKpi.sales)}</div>
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${salesD.positive ? "text-emerald-600" : "text-red-500"}`}>
            {salesD.positive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            予測比{salesD.pct}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
            <Users className="w-3.5 h-3.5" />来店数
          </div>
          <div className="kpi-value text-2xl text-gray-900">{todayKpi.customers}人</div>
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${custD.positive ? "text-emerald-600" : "text-red-500"}`}>
            {custD.positive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            予測比{custD.pct}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
            <Utensils className="w-3.5 h-3.5" />客単価
          </div>
          <div className="kpi-value text-2xl text-gray-900">¥{fmt(todayKpi.avg_ticket)}</div>
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${ticketD.positive ? "text-emerald-600" : "text-red-500"}`}>
            {ticketD.positive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            前回比{ticketD.pct}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
            <TrendingDown className="w-3.5 h-3.5" />原価率
          </div>
          <div className={`kpi-value text-2xl ${todayKpi.food_cost_pct > todayKpi.food_cost_target ? "text-amber-600" : "text-gray-900"}`}>
            {todayKpi.food_cost_pct}%
          </div>
          <div className="text-xs text-gray-400 mt-1">目標 {todayKpi.food_cost_target}%</div>
        </div>
      </div>

      {/* Hourly chart */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">時間帯別売上</span>
          <span className="text-xs text-gray-400">本日</span>
        </div>
        <div className="flex items-end gap-1 h-[100px]">
          {hourlySales.map((h) => {
            const maxSales = Math.max(...hourlySales.map(x => x.sales));
            const pct = (h.sales / maxSales) * 100;
            const isPeak = h.sales === maxSales;
            return (
              <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-gray-400 kpi-value">{(h.sales / 10000).toFixed(1)}万</span>
                <div
                  className={`w-full rounded-t-md transition-all ${isPeak ? "bg-blue-500" : "bg-blue-200"}`}
                  style={{ height: `${pct}%` }}
                />
                <span className="text-[9px] text-gray-400">{h.hour.slice(0, 2)}時</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Urgent alerts */}
      {(urgentAdvice.length > 0 || lowStock.length > 0) && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">要対応</div>

          {lowStock.map((item) => (
            <Link
              key={item.name}
              href="/inventory"
              className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 tap-scale"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                item.status === "out" ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-500"
              }`}>
                <Package className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{item.name} — {item.status === "out" ? "在庫切れ" : "残りわずか"}</p>
                {item.order_suggestion && (
                  <p className="text-xs text-gray-400 mt-0.5">{item.order_suggestion}</p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
            </Link>
          ))}

          {urgentAdvice.slice(0, 2).map((adv) => (
            <Link
              key={adv.id}
              href="/advice"
              className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 tap-scale"
            >
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{adv.title}</p>
                <p className="text-xs text-emerald-600 mt-0.5">{adv.impact}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
