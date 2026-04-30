"use client";

import { deliveryData } from "@/lib/mock-data";
import { useRole } from "@/lib/role-context";
import { Expandable, TabSwitcher } from "@/components/expandable";

function yen(n: number) { return `¥${n.toLocaleString()}`; }
function man(n: number) { return `${(n / 10000).toFixed(0)}万`; }

export default function DeliveryPage() {
  const { role } = useRole();
  const d = deliveryData;
  const isOwner = role === "owner";
  const isManager = role === "manager";

  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-[10px] tracking-[0.15em] text-slate-400 font-medium uppercase">CHANNEL MIX</p>
        <h1 className="text-base font-bold text-slate-800 mt-0.5">
          {isManager ? "イートイン・テイクアウト" : "チャネル別収益分析"}
        </h1>
        <p className="text-xs text-slate-400">4月度</p>
      </div>

      {/* Channel breakdown bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">{isManager ? "売れ方のわりあい" : "チャネル構成比"}</p>
        <div className="h-6 flex rounded-lg overflow-hidden mb-3">
          <div className="bg-slate-700 flex items-center justify-center text-[9px] text-white" style={{ width: `${d.channels[0].pct}%` }}>店内</div>
          <div className="bg-blue-400 flex items-center justify-center text-[9px] text-white" style={{ width: `${d.channels[1].pct}%` }}>TO</div>
          <div className="bg-emerald-500 flex items-center justify-center text-[9px] text-white" style={{ width: `${d.channels[2].pct}%` }}>UE</div>
          <div className="bg-red-400 flex items-center justify-center text-[9px] text-white" style={{ width: `${d.channels[3].pct}%` }}>出前</div>
          <div className="bg-purple-400 flex items-center justify-center text-[9px] text-white" style={{ width: `${d.channels[4].pct}%` }}>自社</div>
        </div>
        <div className="space-y-2">
          {d.channels.map((ch) => (
            <div key={ch.name} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
              <div>
                <span className="text-xs font-medium">{ch.name}</span>
                {"commission" in ch && (
                  <span className="text-[9px] text-red-500 ml-1">手数料{(ch as {commission: number}).commission}%</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="kpi-value">{isManager ? yen(Math.round(ch.sales / 48)) : man(ch.sales)}</span>
                <span className={`w-10 text-right ${ch.margin >= 15 ? "text-emerald-600" : ch.margin >= 10 ? "text-amber-500" : "text-red-500"}`}>
                  {ch.margin}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isOwner && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs font-bold text-red-700 mb-1">デリバリー手数料の影響</p>
          <div className="grid grid-cols-3 gap-2 text-center mt-2">
            <div>
              <p className="text-[9px] text-red-600">手数料総額/月</p>
              <p className="text-sm kpi-value text-red-700">{man(d.commissionImpact.totalCommission)}</p>
            </div>
            <div>
              <p className="text-[9px] text-red-600">自社配達なら</p>
              <p className="text-sm kpi-value text-slate-600">{man(d.commissionImpact.ifSelfDelivery)}</p>
            </div>
            <div>
              <p className="text-[9px] text-emerald-600">削減ポテンシャル</p>
              <p className="text-sm kpi-value text-emerald-600">{man(d.commissionImpact.potentialSaving)}</p>
            </div>
          </div>
          <p className="text-[10px] text-red-600 mt-2">
            自社デリバリー比率を上げることで年間約{man(d.commissionImpact.potentialSaving * 12)}円の利益改善余地
          </p>
        </div>
      )}

      {/* Trend */}
      <Expandable title={isManager ? "半年間のうごき" : "チャネル構成推移"} defaultOpen>
        <div className="space-y-1.5">
          {d.monthlyTrend.map((m) => (
            <div key={m.month} className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 w-7 kpi-value">{m.month.replace("月", "")}</span>
              <div className="flex-1 flex h-4 rounded overflow-hidden">
                <div className="bg-slate-600" style={{ width: `${m.eatin}%` }} />
                <div className="bg-blue-400" style={{ width: `${m.takeout}%` }} />
                <div className="bg-emerald-500" style={{ width: `${m.delivery}%` }} />
              </div>
            </div>
          ))}
          <div className="flex gap-3 mt-1 text-[9px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-slate-600 rounded" />店内</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-400 rounded" />TO</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded" />配達</span>
          </div>
        </div>
      </Expandable>

      {/* Store mix */}
      <Expandable title={isManager ? "ウチのわりあい" : "店舗別チャネル構成"} defaultOpen={false}>
        <div className="space-y-2">
          {d.storeDeliveryRatio.map((s) => (
            <div key={s.store}>
              <p className="text-xs text-slate-600 mb-0.5">{s.store}</p>
              <div className="flex h-3 rounded overflow-hidden">
                <div className="bg-slate-600" style={{ width: `${s.eatin}%` }} />
                <div className="bg-blue-400" style={{ width: `${s.takeout}%` }} />
                <div className="bg-emerald-500" style={{ width: `${s.delivery}%` }} />
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                <span>店内{s.eatin}%</span>
                <span>TO{s.takeout}%</span>
                <span>配達{s.delivery}%</span>
              </div>
            </div>
          ))}
        </div>
      </Expandable>

      {isManager && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs font-bold text-amber-800">ヒント</p>
          <p className="text-xs text-amber-700 mt-0.5">テイクアウトはデリバリーより利益率が高い。「お持ち帰りもできます」の声かけで切り替えを促そう</p>
        </div>
      )}
    </div>
  );
}
