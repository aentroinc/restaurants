"use client";

import { useState } from "react";
import { stores, storeIssues, todayAlerts, areaData } from "@/lib/mock-data";
import { Expandable, TabSwitcher } from "@/components/expandable";
import { LiveTicker, LiveDot, AnimatedNumber } from "@/components/live-sales";

function yen(n: number) { return `¥${n.toLocaleString()}`; }

export function HomeArea() {
  const area = areaData[0];
  const areaStores = stores.filter((s) => s.area === "東京23区");
  const pct = Math.round((area.todaySales / area.target) * 100);
  const areaIssues = storeIssues.filter((i) => areaStores.some((s) => s.id === i.storeId));
  const areaAlerts = todayAlerts.filter((a) => areaStores.some((s) => s.id === a.storeId));
  const [selectedStore, setSelectedStore] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">中村さん、おつかれさまです</p>

      {/* Live ticker */}
      <LiveTicker items={[
        { label: `${area.name}売上`, value: yen(area.todaySales), change: `${pct}%`, positive: pct >= 80 },
        { label: "原価率", value: `${area.costRate}%`, change: area.costRate <= 30.5 ? "◎" : "△", positive: area.costRate <= 30.5 },
        { label: "ロス変動", value: `▼${(Math.abs(area.wasteChange) / 10000).toFixed(0)}万`, positive: true },
      ]} />

      {/* Area summary */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] text-slate-400">{area.name} / {area.stores}店舗</p>
          <LiveDot />
        </div>
        <p className="text-3xl kpi-value"><AnimatedNumber value={area.todaySales} prefix="¥" /></p>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${pct >= 85 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-400" : "bg-red-400"}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <span className="text-xs kpi-value">{pct}%</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          {pct >= 85 ? "いい感じ！このペースなら目標いける" : pct >= 70 ? "もうちょっと。夜で巻き返せるかも" : "テコ入れ必要。問題店をチェック"}
        </p>
      </div>

      {/* Issues */}
      {areaIssues.length > 0 && (
        <Expandable title="気をつけるところ" badge={<span className="text-[9px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full">{areaIssues.length}</span>} defaultOpen>
          <div className="space-y-2">
            {areaIssues.map((issue, i) => (
              <div key={i} className={`rounded-lg p-2.5 ${
                issue.severity === "danger" ? "bg-red-50 border-l-2 border-red-400" : "bg-amber-50 border-l-2 border-amber-400"
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${issue.severity === "danger" ? "text-red-500" : "text-amber-500"}`}>
                    {issue.severity === "danger" ? "✕" : "△"}
                  </span>
                  <div>
                    <p className="text-xs font-bold">{issue.store}</p>
                    <p className="text-[11px] text-slate-600">{issue.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Expandable>
      )}

      {/* Alerts */}
      {areaAlerts.length > 0 && (
        <Expandable title="いまのおしらせ" defaultOpen={false}>
          <div className="space-y-2">
            {areaAlerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
                <span className="text-sm mt-0.5">{alert.icon}</span>
                <div>
                  <p className="text-xs font-medium">{alert.message}</p>
                  <p className="text-[10px] text-slate-400">{alert.time} / {stores.find((s) => s.id === alert.storeId)?.name}</p>
                </div>
              </div>
            ))}
          </div>
        </Expandable>
      )}

      {/* Store comparison - interactive tabs */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">店舗くらべ</p>
        <TabSwitcher tabs={[
          {
            label: "全体",
            content: (
              <div className="space-y-2">
                {areaStores.map((store) => {
                  const prog = Math.round((store.todaySales / store.targetSales) * 100);
                  const costOK = store.costRate <= store.costRateTarget + 0.5;
                  const laborOK = store.laborCostRate <= 28.5;
                  const wasteOK = store.wasteReduction >= 0;
                  const score = (costOK ? 1 : 0) + (laborOK ? 1 : 0) + (wasteOK ? 1 : 0) + (prog >= 80 ? 1 : 0);
                  const mark = score >= 4 ? "◎" : score >= 2 ? "△" : "✕";
                  const markColor = score >= 4 ? "text-emerald-600" : score >= 2 ? "text-amber-500" : "text-red-500";
                  const isSelected = selectedStore === store.id;

                  return (
                    <div key={store.id}>
                      <button
                        onClick={() => setSelectedStore(isSelected ? null : store.id)}
                        className="w-full text-left rounded-lg p-2.5 bg-slate-50 tap-scale"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-lg font-bold ${markColor}`}>{mark}</span>
                            <span className="text-xs font-medium">{store.name}</span>
                          </div>
                          <span className="text-xs kpi-value">{yen(store.todaySales)}</span>
                        </div>
                      </button>
                      {isSelected && (
                        <div className="animate-slide-down grid grid-cols-4 gap-1.5 text-center mt-1 mb-2">
                          {[
                            { label: "目標", value: `${prog}%`, ok: prog >= 80 },
                            { label: "原価", value: `${store.costRate}%`, ok: costOK },
                            { label: "人件費", value: `${store.laborCostRate}%`, ok: laborOK },
                            { label: "ロス", value: wasteOK ? "↓改善" : "↑悪化", ok: wasteOK },
                          ].map((m) => (
                            <div key={m.label} className="bg-white rounded px-1 py-2 shadow-sm">
                              <p className="text-[9px] text-slate-400">{m.label}</p>
                              <p className={`text-xs font-bold ${m.ok ? "text-emerald-600" : "text-red-500"}`}>{m.value}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ),
          },
          {
            label: "原価率",
            content: (
              <div className="space-y-2">
                {[...areaStores].sort((a, b) => b.costRate - a.costRate).map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <span className="text-xs w-24 truncate">{s.name}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div className={`h-full rounded-full ${s.costRate > 30.5 ? "bg-red-400" : "bg-emerald-500"}`}
                        style={{ width: `${(s.costRate / 35) * 100}%` }} />
                    </div>
                    <span className={`text-[11px] kpi-value w-10 text-right ${s.costRate > 30.5 ? "text-red-500" : "text-emerald-600"}`}>
                      {s.costRate}%
                    </span>
                  </div>
                ))}
                <div className="h-px bg-red-200 relative mt-1">
                  <span className="absolute -top-2.5 right-0 text-[9px] text-red-400">目標30%</span>
                </div>
              </div>
            ),
          },
          {
            label: "売上",
            content: (
              <div className="space-y-2">
                {[...areaStores].sort((a, b) => b.todaySales - a.todaySales).map((s, i) => {
                  const maxSales = Math.max(...areaStores.map((st) => st.todaySales));
                  return (
                    <div key={s.id} className="flex items-center gap-2">
                      <span className={`text-xs w-4 kpi-value ${i === 0 ? "text-amber-500" : "text-slate-400"}`}>{i + 1}</span>
                      <span className="text-xs w-20 truncate">{s.name}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-slate-700 h-full rounded-full" style={{ width: `${(s.todaySales / maxSales) * 100}%` }} />
                      </div>
                      <span className="text-[11px] kpi-value w-14 text-right">{yen(s.todaySales)}</span>
                    </div>
                  );
                })}
              </div>
            ),
          },
        ]} />
      </div>

      {/* Shift coverage */}
      <Expandable title="来週のシフト、足りてる?" defaultOpen={false}>
        {areaStores.map((store, i) => {
          const cov = [92, 88, 76][i] || 85;
          const mark = cov >= 90 ? "◎" : cov >= 80 ? "△" : "✕";
          const color = cov >= 90 ? "text-emerald-600" : cov >= 80 ? "text-amber-500" : "text-red-500";
          const bar = cov >= 90 ? "bg-emerald-500" : cov >= 80 ? "bg-amber-400" : "bg-red-400";
          return (
            <div key={store.id} className="mb-2.5 last:mb-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-bold ${color}`}>{mark}</span>
                  <span className="text-xs">{store.name}</span>
                </div>
                <span className={`text-xs kpi-value ${color}`}>{cov}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${bar}`} style={{ width: `${cov}%` }} />
              </div>
              {cov < 90 && <p className="text-[10px] text-slate-400 mt-0.5">{cov < 80 ? "ホール・キッチンどっちも足りない" : "金曜ディナーだけ足りない"}</p>}
            </div>
          );
        })}
      </Expandable>

      {/* LINE */}
      <Expandable title="LINEでとどくおしらせ" defaultOpen={false}>
        <p className="text-[10px] text-slate-400 mb-2">毎朝 7:00</p>
        <div className="bg-[#eef6ee] rounded-xl p-3 text-[13px] leading-relaxed whitespace-pre-line">
{`中村さん、おはようございます

きのうの東京23区 ${area.stores}店舗

◎ 新宿西口店 → 目標クリア
△ 渋谷センター街店 → あとちょっと
✕ 池袋東口店 → 原価率たかい

今日やること
→ 池袋の仕入れチェック
→ 渋谷の金曜シフト1人さがす`}
        </div>
      </Expandable>
    </div>
  );
}
