"use client";

import { useState } from "react";
import { stores, areaData } from "@/lib/mock-data";
import { TabSwitcher } from "@/components/expandable";
import { LiveDot } from "@/components/live-sales";

function yen(n: number) { return `¥${n.toLocaleString()}`; }
function man(n: number) { return `${(n / 10000).toFixed(0)}万`; }

export default function StoresPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedStore = stores.find((s) => s.id === selected);

  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-[10px] tracking-[0.15em] text-slate-400 font-medium uppercase">STORE OVERVIEW</p>
        <div className="flex items-center gap-2 mt-0.5">
          <h1 className="text-base font-bold text-slate-800">店舗一覧</h1>
          <LiveDot />
        </div>
      </div>

      <TabSwitcher tabs={[
        {
          label: "売上順",
          content: (
            <div className="space-y-1">
              {[...stores].sort((a, b) => b.todaySales - a.todaySales).map((store, i) => {
                const prog = Math.round((store.todaySales / store.targetSales) * 100);
                const isSelected = selected === store.id;
                return (
                  <div key={store.id}>
                    <button
                      onClick={() => setSelected(isSelected ? null : store.id)}
                      className="w-full text-left py-2.5 border-b border-slate-100 tap-scale"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-xs kpi-value w-4 ${i < 3 ? "text-amber-500" : "text-slate-300"}`}>{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="text-xs font-medium">{store.name}</span>
                            <span className="text-xs kpi-value">{yen(store.todaySales)}</span>
                          </div>
                          <div className="flex gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span>{store.area}</span>
                            <span className={prog >= 85 ? "text-emerald-600" : prog >= 70 ? "text-amber-500" : "text-red-500"}>
                              目標{prog}%
                            </span>
                          </div>
                        </div>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          className={`text-slate-300 transition-transform ${isSelected ? "rotate-180" : ""}`}>
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </div>
                    </button>
                    {isSelected && (
                      <div className="animate-slide-down bg-slate-50 rounded-lg p-3 mb-2">
                        <div className="grid grid-cols-3 gap-2 text-center mb-2">
                          <div>
                            <p className="text-[9px] text-slate-400">月売上</p>
                            <p className="text-xs kpi-value">{man(store.monthlySales)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400">原価率</p>
                            <p className={`text-xs kpi-value ${store.costRate > 30.5 ? "text-red-500" : "text-emerald-600"}`}>{store.costRate}%</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400">人件費率</p>
                            <p className={`text-xs kpi-value ${store.laborCostRate > 29 ? "text-red-500" : "text-emerald-600"}`}>{store.laborCostRate}%</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-[9px] text-slate-400">客数</p>
                            <p className="text-xs kpi-value">{store.customers}人</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400">客単価</p>
                            <p className="text-xs kpi-value">{yen(store.avgSpend)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400">ロス</p>
                            <p className={`text-xs kpi-value ${store.wasteReduction >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {store.wasteReduction >= 0 ? "▼" : "▲"}{yen(Math.abs(store.wasteReduction))}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ),
        },
        {
          label: "原価率順",
          content: (
            <div className="space-y-2">
              {[...stores].sort((a, b) => b.costRate - a.costRate).map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="text-[10px] w-20 truncate text-slate-600">{s.name}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div className={`h-full rounded-full ${s.costRate > 30.5 ? "bg-red-400" : s.costRate > 30 ? "bg-amber-400" : "bg-emerald-500"}`}
                      style={{ width: `${(s.costRate / 35) * 100}%` }} />
                  </div>
                  <span className={`text-[11px] kpi-value w-10 text-right ${s.costRate > 30.5 ? "text-red-500" : "text-emerald-600"}`}>
                    {s.costRate}%
                  </span>
                </div>
              ))}
              <div className="relative h-px bg-red-200 mt-1">
                <span className="absolute -top-2.5 right-0 text-[9px] text-red-400">目標30%</span>
              </div>
            </div>
          ),
        },
        {
          label: "エリア別",
          content: (
            <div className="space-y-3">
              {areaData.map((area) => {
                const areaStores = stores.filter((s) => s.area === area.name);
                return (
                  <div key={area.id}>
                    <p className="text-[10px] text-slate-400 tracking-wider font-medium mb-1">{area.name} ({area.stores}店舗)</p>
                    {areaStores.map((s) => {
                      const prog = Math.round((s.todaySales / s.targetSales) * 100);
                      return (
                        <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 pl-2">
                          <span className="text-xs">{s.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs kpi-value">{yen(s.todaySales)}</span>
                            <span className={`text-[10px] w-8 text-right ${prog >= 85 ? "text-emerald-600" : prog >= 70 ? "text-amber-500" : "text-red-500"}`}>{prog}%</span>
                          </div>
                        </div>
                      );
                    })}
                    {areaStores.length === 0 && <p className="text-[11px] text-slate-400 pl-2">表示対象なし (サンプルデータ)</p>}
                  </div>
                );
              })}
            </div>
          ),
        },
      ]} />
    </div>
  );
}
