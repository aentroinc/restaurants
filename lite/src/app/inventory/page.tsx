"use client";

import { useState } from "react";
import { inventory, todayKpi } from "@/lib/mock-data";
import { Package, AlertTriangle, CheckCircle, XCircle, ShoppingCart } from "lucide-react";

export default function InventoryPage() {
  const [filter, setFilter] = useState<"all" | "alert">("all");

  const displayed = filter === "alert"
    ? inventory.filter(i => i.status !== "ok")
    : inventory;

  const alertCount = inventory.filter(i => i.status !== "ok").length;

  return (
    <div className="px-4 pt-4 space-y-4">
      <h1 className="text-lg font-bold text-gray-900">食材・在庫</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-400 mb-1">本日廃棄</div>
          <div className={`kpi-value text-xl ${todayKpi.waste_yen > todayKpi.waste_prev_avg ? "text-amber-600" : "text-emerald-600"}`}>
            ¥{todayKpi.waste_yen.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">平均 ¥{todayKpi.waste_prev_avg.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-400 mb-1">要発注アラート</div>
          <div className={`kpi-value text-xl ${alertCount > 0 ? "text-red-500" : "text-emerald-600"}`}>
            {alertCount}件
          </div>
          <div className="text-xs text-gray-400 mt-0.5">全{inventory.length}品目中</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(["all", "alert"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              filter === f ? "bg-blue-100 text-blue-600 font-medium" : "bg-gray-100 text-gray-400"
            }`}
          >
            {f === "all" ? "すべて" : `要対応 (${alertCount})`}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
        {displayed.map((item) => {
          const statusConfig = {
            ok: { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50", label: "OK" },
            low: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50", label: "残少" },
            out: { icon: XCircle, color: "text-red-500", bg: "bg-red-50", label: "切れ" },
          };
          const s = statusConfig[item.status];
          const Icon = s.icon;

          return (
            <div key={item.name} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full ${s.bg} ${s.color} flex items-center justify-center shrink-0`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{item.name}</span>
                    <span className="text-[10px] text-gray-400">{item.category}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    <span>在庫: {item.stock}</span>
                    <span>残{item.days_left}日分</span>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.bg} ${s.color}`}>
                  {s.label}
                </span>
              </div>
              {item.order_suggestion && (
                <div className="mt-2 ml-12 flex items-start gap-2 bg-blue-50 rounded-lg px-3 py-2">
                  <ShoppingCart className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700">{item.order_suggestion}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
