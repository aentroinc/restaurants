"use client";

import { reviewData } from "@/lib/mock-data";
import { useRole } from "@/lib/role-context";
import { Expandable, TabSwitcher } from "@/components/expandable";
import { AnimatedNumber } from "@/components/live-sales";

export default function ReviewsPage() {
  const { role } = useRole();
  const d = reviewData;
  const isManager = role === "manager";

  const starDisplay = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    return "★".repeat(full) + (half ? "☆" : "") + "☆".repeat(5 - full - (half ? 1 : 0));
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-[10px] tracking-[0.15em] text-slate-400 font-medium uppercase">REPUTATION</p>
        <h1 className="text-base font-bold text-slate-800 mt-0.5">
          {isManager ? "口コミ・評判" : "レピュテーション管理"}
        </h1>
        <p className="text-xs text-slate-400">4月度</p>
      </div>

      {/* Overall rating */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-4xl kpi-value">{isManager ? "3.88" : d.avgRating}</p>
            <p className="text-amber-400 text-sm tracking-wider">{starDisplay(isManager ? 3.88 : d.avgRating)}</p>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500">{isManager ? "渋谷センター街店" : "全店平均"}</span>
              <span className="text-emerald-600 text-[10px]">+{(d.avgRating - d.avgRatingLastMonth).toFixed(2)} vs先月</span>
            </div>
            <p className="text-[10px] text-slate-400">
              {isManager ? "480件のレビュー" : `${d.totalReviews.toLocaleString()}件 (今月+${d.newReviewsThisMonth}件)`}
            </p>
          </div>
        </div>

        {/* Sentiment bar */}
        <div className="mt-3">
          <div className="h-3 flex rounded-lg overflow-hidden">
            <div className="bg-emerald-500" style={{ width: `${d.sentimentBreakdown.positive}%` }} />
            <div className="bg-slate-300" style={{ width: `${d.sentimentBreakdown.neutral}%` }} />
            <div className="bg-red-400" style={{ width: `${d.sentimentBreakdown.negative}%` }} />
          </div>
          <div className="flex justify-between text-[9px] text-slate-400 mt-1">
            <span className="text-emerald-600">ポジティブ {d.sentimentBreakdown.positive}%</span>
            <span>ニュートラル {d.sentimentBreakdown.neutral}%</span>
            <span className="text-red-500">ネガティブ {d.sentimentBreakdown.negative}%</span>
          </div>
        </div>
      </div>

      {/* Alerts - bad reviews */}
      {d.recentAlerts.filter((a) => a.sentiment === "negative").length > 0 && (
        <Expandable
          title={isManager ? "気になる口コミ" : "要対応レビュー"}
          badge={<span className="text-[9px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full">
            {d.recentAlerts.filter((a) => a.sentiment === "negative").length}
          </span>}
          defaultOpen
        >
          <div className="space-y-2">
            {d.recentAlerts.filter((a) => a.sentiment === "negative").map((alert, i) => (
              <div key={i} className="bg-red-50 rounded-lg p-3 border-l-2 border-red-400">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{alert.store}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-amber-400 text-[10px]">{"★".repeat(alert.rating)}{"☆".repeat(5 - alert.rating)}</span>
                    <span className="text-[9px] text-slate-400">{alert.platform}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600">「{alert.text}」</p>
                <p className="text-[10px] text-slate-400 mt-1">{alert.date}</p>
              </div>
            ))}
          </div>
          {isManager && (
            <p className="text-[10px] text-slate-500 mt-2 bg-slate-50 p-2 rounded">
              返信すると評価が改善しやすい。丁寧に「ご不便おかけしました」と返そう
            </p>
          )}
        </Expandable>
      )}

      {/* Good reviews */}
      <Expandable title={isManager ? "うれしい口コミ" : "ポジティブレビュー"} defaultOpen={false}>
        {d.recentAlerts.filter((a) => a.sentiment === "positive").map((alert, i) => (
          <div key={i} className="bg-emerald-50 rounded-lg p-3 border-l-2 border-emerald-400 mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">{alert.store}</span>
              <span className="text-amber-400 text-[10px]">{"★".repeat(alert.rating)}</span>
            </div>
            <p className="text-xs text-slate-600">「{alert.text}」</p>
          </div>
        ))}
      </Expandable>

      {/* Keywords */}
      <Expandable title={isManager ? "よく言われること" : "キーワード分析"} defaultOpen>
        <div className="flex flex-wrap gap-1.5">
          {d.topKeywords.map((kw) => (
            <span
              key={kw.word}
              className={`text-xs px-2.5 py-1 rounded-full border ${
                kw.sentiment === "positive" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                kw.sentiment === "negative" ? "bg-red-50 text-red-700 border-red-200" :
                "bg-slate-50 text-slate-600 border-slate-200"
              }`}
            >
              {kw.word} <span className="kpi-value text-[10px]">{kw.count}</span>
            </span>
          ))}
        </div>
      </Expandable>

      {/* Platform breakdown */}
      {!isManager && (
        <Expandable title="プラットフォーム別" defaultOpen={false}>
          <div className="space-y-2">
            {d.platforms.map((p) => (
              <div key={p.name} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                <div>
                  <span className="text-xs font-medium">{p.name}</span>
                  <span className="text-[10px] text-slate-400 ml-1">{p.count}件</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 text-xs">{starDisplay(p.rating)}</span>
                  <span className="text-xs kpi-value">{p.rating}</span>
                  <span className={`text-[9px] ${(p.trend as string) === "up" ? "text-emerald-600" : (p.trend as string) === "down" ? "text-red-500" : "text-slate-400"}`}>
                    {(p.trend as string) === "up" ? "↑" : (p.trend as string) === "down" ? "↓" : "→"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Expandable>
      )}

      {/* Store ranking */}
      {!isManager && (
        <Expandable title="店舗別評価ランキング" defaultOpen={false}>
          <div className="space-y-1.5">
            {d.storeRanking.map((s, i) => (
              <div key={s.store} className="flex items-center gap-2">
                <span className={`text-[10px] kpi-value w-4 ${i < 3 ? "text-amber-500" : "text-slate-300"}`}>{i + 1}</span>
                <span className="text-xs flex-1 truncate">{s.store}</span>
                <span className="text-amber-400 text-[10px]">{starDisplay(s.rating)}</span>
                <span className={`text-xs kpi-value w-8 text-right ${s.rating >= 3.8 ? "text-emerald-600" : s.rating >= 3.5 ? "text-amber-500" : "text-red-500"}`}>
                  {s.rating}
                </span>
                <span className={`text-[9px] ${s.trend === "up" ? "text-emerald-600" : s.trend === "down" ? "text-red-500" : "text-slate-400"}`}>
                  {s.trend === "up" ? "↑" : s.trend === "down" ? "↓" : "→"}
                </span>
              </div>
            ))}
          </div>
        </Expandable>
      )}
    </div>
  );
}
