"use client";

import { promotionData } from "@/lib/mock-data";
import { useRole } from "@/lib/role-context";
import { Expandable, TabSwitcher } from "@/components/expandable";

function yen(n: number) { return `¥${n.toLocaleString()}`; }
function man(n: number) { return `${(n / 10000).toFixed(0)}万`; }

export default function PromotionsPage() {
  const { role } = useRole();
  const d = promotionData;
  const isManager = role === "manager";

  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-[10px] tracking-[0.15em] text-slate-400 font-medium uppercase">PROMOTIONS</p>
        <h1 className="text-base font-bold text-slate-800 mt-0.5">
          {isManager ? "いまのキャンペーン" : "販促・キャンペーン効果"}
        </h1>
        <p className="text-xs text-slate-400">4月度</p>
      </div>

      {/* Active campaigns */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">
          {isManager ? "いまやってるキャンペーン" : "実施中キャンペーン"}
        </p>
        <div className="space-y-3">
          {d.activeCampaigns.map((c) => (
            <div key={c.id} className="border border-slate-100 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">{c.name}</span>
                <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">{c.status}</span>
              </div>
              <p className="text-[10px] text-slate-400">{c.period} / {c.type} / {c.targetStores}</p>
              {!isManager && (
                <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                  <div className="bg-slate-50 rounded p-1.5">
                    <p className="text-[9px] text-slate-400">売上貢献</p>
                    <p className="text-xs kpi-value">{man(c.sales)}</p>
                  </div>
                  <div className="bg-slate-50 rounded p-1.5">
                    <p className="text-[9px] text-slate-400">売上増加率</p>
                    <p className="text-xs kpi-value text-emerald-600">+{c.uplift}%</p>
                  </div>
                  <div className="bg-slate-50 rounded p-1.5">
                    <p className="text-[9px] text-slate-400">ROI</p>
                    <p className="text-xs kpi-value">{c.roi}x</p>
                  </div>
                </div>
              )}
              {isManager && (
                <div className="mt-2 bg-emerald-50 rounded p-2">
                  <p className="text-xs text-emerald-700">売上 +{c.uplift}% アップ中</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Coupon */}
      <Expandable title={isManager ? "クーポンのつかわれかた" : "クーポン利用状況"} defaultOpen>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-slate-50 rounded-lg p-2.5 text-center">
            <p className="text-[9px] text-slate-400">{isManager ? "くばった数" : "発行数"}</p>
            <p className="text-sm kpi-value">{d.couponRedemption.issued.toLocaleString()}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5 text-center">
            <p className="text-[9px] text-slate-400">{isManager ? "つかわれた数" : "利用数"}</p>
            <p className="text-sm kpi-value">{d.couponRedemption.redeemed.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-slate-500">{isManager ? "つかわれた割合" : "利用率"}</span>
          <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${d.couponRedemption.rate}%` }} />
          </div>
          <span className="text-xs kpi-value">{d.couponRedemption.rate}%</span>
        </div>
        {!isManager && (
          <div className="bg-emerald-50 rounded p-2 text-[10px] text-emerald-700">
            クーポンによる追加売上: {man(d.couponRedemption.incrementalSales)}円 (平均値引{yen(d.couponRedemption.avgDiscount)}/枚)
          </div>
        )}
      </Expandable>

      {/* Channel ROI - owner/area only */}
      {!isManager && (
        <Expandable title="チャネル別 広告ROI" defaultOpen>
          <div className="space-y-2">
            {d.channelROI.sort((a, b) => b.roi - a.roi).map((ch) => (
              <div key={ch.channel} className="flex items-center gap-2">
                <span className="text-xs w-20">{ch.channel}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div className={`h-full rounded-full ${ch.roi >= 5 ? "bg-emerald-500" : ch.roi >= 3 ? "bg-amber-400" : "bg-red-400"}`}
                    style={{ width: `${Math.min((ch.roi / 10) * 100, 100)}%` }} />
                </div>
                <span className={`text-[11px] kpi-value w-10 text-right ${ch.roi >= 5 ? "text-emerald-600" : ch.roi >= 3 ? "text-amber-500" : "text-red-500"}`}>
                  {ch.roi}x
                </span>
              </div>
            ))}
            <p className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded mt-1">
              LINE配信のROIが最も高い。チラシは費用対効果が低いため縮小検討
            </p>
          </div>
        </Expandable>
      )}

      {/* Past campaigns */}
      {!isManager && (
        <Expandable title="過去のキャンペーン" defaultOpen={false}>
          <div className="space-y-2">
            {d.pastCampaigns.map((c) => (
              <div key={c.id} className="border border-slate-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">{c.name}</span>
                  <span className="text-[9px] text-slate-400">{c.period}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[9px] text-slate-400">売上貢献</p>
                    <p className="text-[11px] kpi-value">{man(c.sales)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400">増加率</p>
                    <p className="text-[11px] kpi-value text-emerald-600">+{c.uplift}%</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400">ROI</p>
                    <p className={`text-[11px] kpi-value ${c.roi >= 5 ? "text-emerald-600" : c.roi >= 3 ? "text-amber-500" : "text-red-500"}`}>{c.roi}x</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Expandable>
      )}

      {isManager && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs font-bold text-amber-800">今日やること</p>
          <p className="text-xs text-amber-700 mt-0.5">GWスパイスフェアの限定メニュー、お客さんに声かけしよう。テイクアウトでもOKって伝えてね</p>
        </div>
      )}
    </div>
  );
}
