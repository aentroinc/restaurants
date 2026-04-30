"use client";

import { stores, storeIssues, todayAlerts, areaData } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function yen(n: number) { return `¥${n.toLocaleString()}`; }
function man(n: number) { return `${(n / 10000).toFixed(0)}万`; }

export function HomeArea() {
  const area = areaData[0]; // 東京23区
  const areaStores = stores.filter((s) => s.area === "東京23区");
  const pct = Math.round((area.todaySales / area.target) * 100);
  const areaIssues = storeIssues.filter((i) => areaStores.some((s) => s.id === i.storeId));
  const areaAlerts = todayAlerts.filter((a) => areaStores.some((s) => s.id === a.storeId));

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">中村さん、おつかれさまです</p>

      {/* Area summary */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-[11px] text-slate-400 tracking-wider font-medium">{area.name} / {area.stores}店舗</p>
        <p className="text-3xl kpi-value mt-1">{yen(area.todaySales)}</p>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct >= 85 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-400" : "bg-red-400"}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <span className="text-xs kpi-value">{pct}%</span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          {pct >= 85 ? "いい感じです" : pct >= 70 ? "もうちょっと" : "要テコ入れ"}
        </p>
      </div>

      {/* Issues */}
      {areaIssues.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs font-bold text-slate-600">気をつけるところ</p>
            <Badge className="bg-red-50 text-red-600 border border-red-200 text-[10px] px-1.5">{areaIssues.length}</Badge>
          </div>
          <div className="space-y-2">
            {areaIssues.map((issue, i) => (
              <div
                key={i}
                className={`rounded-lg p-2.5 ${
                  issue.severity === "danger" ? "bg-red-50 border-l-2 border-red-400" : "bg-amber-50 border-l-2 border-amber-400"
                }`}
              >
                <p className="text-xs font-bold">{issue.store}</p>
                <p className="text-[11px] text-slate-600 mt-0.5">{issue.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts */}
      {areaAlerts.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-600 mb-3">いまのおしらせ</p>
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
        </div>
      )}

      {/* Store comparison - ◎△✕ */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">店舗くらべ</p>
        <div className="space-y-3">
          {areaStores.map((store) => {
            const prog = Math.round((store.todaySales / store.targetSales) * 100);
            const costOK = store.costRate <= store.costRateTarget + 0.5;
            const laborOK = store.laborCostRate <= 28.5;
            const wasteOK = store.wasteReduction >= 0;
            const score = (costOK ? 1 : 0) + (laborOK ? 1 : 0) + (wasteOK ? 1 : 0) + (prog >= 80 ? 1 : 0);
            const mark = score >= 4 ? "◎" : score >= 2 ? "△" : "✕";
            const markColor = score >= 4 ? "text-emerald-600" : score >= 2 ? "text-amber-500" : "text-red-500";
            const bg = score >= 4 ? "bg-emerald-50" : score >= 2 ? "bg-amber-50" : "bg-red-50";

            return (
              <div key={store.id} className={`${bg} rounded-lg p-3`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${markColor}`}>{mark}</span>
                    <span className="text-sm font-medium">{store.name}</span>
                  </div>
                  <span className="text-sm kpi-value">{yen(store.todaySales)}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {[
                    { label: "目標", value: `${prog}%`, ok: prog >= 80 },
                    { label: "原価", value: `${store.costRate}%`, ok: costOK },
                    { label: "人件費", value: `${store.laborCostRate}%`, ok: laborOK },
                    { label: "ロス", value: wasteOK ? "↓" : "↑", ok: wasteOK },
                  ].map((m) => (
                    <div key={m.label} className="bg-white/70 rounded px-1 py-1.5">
                      <p className="text-[9px] text-slate-400">{m.label}</p>
                      <p className={`text-xs font-bold ${m.ok ? "text-emerald-600" : "text-red-500"}`}>{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shift coverage */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">来週のシフト、足りてる?</p>
        {areaStores.map((store, i) => {
          const cov = [92, 88, 76][i] || 85;
          const emoji = cov >= 90 ? "◎" : cov >= 80 ? "△" : "✕";
          const color = cov >= 90 ? "text-emerald-600" : cov >= 80 ? "text-amber-500" : "text-red-500";
          const bar = cov >= 90 ? "bg-emerald-500" : cov >= 80 ? "bg-amber-400" : "bg-red-400";
          return (
            <div key={store.id} className="mb-2.5 last:mb-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-bold ${color}`}>{emoji}</span>
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
      </div>

      {/* LINE */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-2">LINEでとどくおしらせ</p>
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
      </div>
    </div>
  );
}
