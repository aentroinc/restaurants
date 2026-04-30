"use client";

import { stores, storeIssues, todayAlerts } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

function formatYen(n: number) {
  return `¥${n.toLocaleString()}`;
}

export function HomeArea() {
  const areaStores = stores.filter((s) => s.area === "城西");
  const totalToday = areaStores.reduce((s, st) => s + st.todaySales, 0);
  const totalTarget = areaStores.reduce((s, st) => s + st.targetSales, 0);
  const totalProgress = Math.round((totalToday / totalTarget) * 100);
  const areaIssues = storeIssues.filter((i) =>
    areaStores.some((s) => s.id === i.storeId)
  );
  const areaAlerts = todayAlerts.filter((a) =>
    areaStores.some((s) => s.id === a.storeId)
  );

  return (
    <div className="space-y-4">
      {/* Greeting - Fラン卒: friendly, casual but respectful */}
      <p className="text-sm text-gray-600">中村さん、おつかれさまです 👋</p>
      <p className="text-xs text-gray-400">城西エリア {areaStores.length}店舗のようすです</p>

      {/* Big number - simple, emoji-driven */}
      <Card className="border-0 shadow-sm bg-orange-50">
        <CardContent className="p-4">
          <p className="text-xs text-orange-700">きょうの城西エリア</p>
          <p className="text-4xl font-bold text-orange-900 tracking-tight">
            {formatYen(totalToday)}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 bg-orange-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${totalProgress >= 80 ? "bg-green-500" : "bg-yellow-500"}`}
                style={{ width: `${Math.min(totalProgress, 100)}%` }}
              />
            </div>
            <span className="text-sm font-bold">{totalProgress}%</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {totalProgress >= 80
              ? "👍 いい感じ！このペースなら目標いけそう"
              : totalProgress >= 60
                ? "🤔 もうちょっとがんばりたい"
                : "😰 ちょっとキビシイかも…"}
          </p>
        </CardContent>
      </Card>

      {/* Issues - color-coded ◎△✕, not percentages */}
      {areaIssues.length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-2">
            🚨 いま気をつけること
          </h2>
          <div className="space-y-2">
            {areaIssues.map((issue, i) => (
              <Card
                key={i}
                className={`border-0 shadow-sm ${
                  issue.severity === "danger"
                    ? "bg-red-50 border-l-4 border-l-red-400"
                    : "bg-yellow-50 border-l-4 border-l-yellow-400"
                }`}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{issue.severity === "danger" ? "✕" : "△"}</span>
                      <div>
                        <p className="text-sm font-bold">{issue.store}</p>
                        <p className="text-xs text-gray-600">{issue.message}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Today's alerts */}
      {areaAlerts.length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-2">📢 今日のできごと</h2>
          <div className="space-y-2">
            {areaAlerts.map((alert) => (
              <Card key={alert.id} className="border-0 shadow-sm bg-gray-50">
                <CardContent className="p-3 flex items-start gap-2">
                  <span className="text-lg">{alert.icon}</span>
                  <div>
                    <p className="text-sm">{alert.message}</p>
                    <p className="text-xs text-gray-400">{alert.time} / {stores.find((s) => s.id === alert.storeId)?.name}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Per-store - visual ◎△✕ based, not number-heavy */}
      <div>
        <h2 className="text-sm font-bold mb-2">🏪 お店のようす</h2>
        <div className="space-y-3">
          {areaStores.map((store) => {
            const progress = Math.round((store.todaySales / store.targetSales) * 100);
            const monthProgress = Math.round((store.monthlySales / store.monthlyTarget) * 100);
            const costOK = store.costRate <= store.costRateTarget + 1;
            const laborOK = store.laborCostRate <= 29;
            const wasteOK = store.wasteReduction >= 0;

            const overallScore = (costOK ? 1 : 0) + (laborOK ? 1 : 0) + (wasteOK ? 1 : 0) + (progress >= 70 ? 1 : 0);
            const overallEmoji = overallScore >= 4 ? "◎" : overallScore >= 2 ? "△" : "✕";
            const overallColor = overallScore >= 4 ? "text-green-600" : overallScore >= 2 ? "text-yellow-600" : "text-red-500";
            const overallBg = overallScore >= 4 ? "bg-green-50" : overallScore >= 2 ? "bg-yellow-50" : "bg-red-50";

            return (
              <Card key={store.id} className={`border-0 shadow-sm ${overallBg}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${overallColor}`}>{overallEmoji}</span>
                      <h3 className="font-bold">{store.name}</h3>
                    </div>
                    <span className="text-lg font-bold">{formatYen(store.todaySales)}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-white/60 rounded-lg p-2">
                      <p className="text-xs text-gray-500">目標</p>
                      <p className={`text-sm font-bold ${progress >= 80 ? "text-green-600" : progress >= 60 ? "text-yellow-600" : "text-red-500"}`}>
                        {progress >= 80 ? "◎" : progress >= 60 ? "△" : "✕"}
                      </p>
                      <p className="text-xs text-gray-400">{progress}%</p>
                    </div>
                    <div className="bg-white/60 rounded-lg p-2">
                      <p className="text-xs text-gray-500">材料費</p>
                      <p className={`text-sm font-bold ${costOK ? "text-green-600" : "text-red-500"}`}>
                        {costOK ? "◎" : "✕"}
                      </p>
                      <p className="text-xs text-gray-400">{store.costRate}%</p>
                    </div>
                    <div className="bg-white/60 rounded-lg p-2">
                      <p className="text-xs text-gray-500">人件費</p>
                      <p className={`text-sm font-bold ${laborOK ? "text-green-600" : "text-red-500"}`}>
                        {laborOK ? "◎" : "✕"}
                      </p>
                      <p className="text-xs text-gray-400">{store.laborCostRate}%</p>
                    </div>
                    <div className="bg-white/60 rounded-lg p-2">
                      <p className="text-xs text-gray-500">ムダ</p>
                      <p className={`text-sm font-bold ${wasteOK ? "text-green-600" : "text-red-500"}`}>
                        {wasteOK ? "◎" : "✕"}
                      </p>
                      <p className="text-xs text-gray-400">{wasteOK ? "へった" : "ふえた"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Shift coverage */}
      <div>
        <h2 className="text-sm font-bold mb-2">📅 来週のシフト、足りてる?</h2>
        <div className="space-y-2">
          {areaStores.map((store, i) => {
            const coverages = [92, 85, 78, 95];
            const coverage = coverages[i] || 80;
            const emoji = coverage >= 90 ? "👍" : coverage >= 80 ? "🤔" : "😰";
            return (
              <Card key={store.id} className="border-0 shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>{emoji}</span>
                      <span className="text-sm">{store.name}</span>
                    </div>
                    <span className={`text-sm font-bold ${coverage >= 90 ? "text-green-600" : coverage >= 80 ? "text-yellow-600" : "text-red-500"}`}>
                      {coverage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${coverage >= 90 ? "bg-green-500" : coverage >= 80 ? "bg-yellow-500" : "bg-red-400"}`}
                      style={{ width: `${coverage}%` }}
                    />
                  </div>
                  {coverage < 90 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {coverage < 80 ? "⚠ ホール・キッチンどっちもたりない！" : "⚠ 金曜のディナーだけたりない"}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* LINE preview - Fラン: casual, emoji-heavy */}
      <div>
        <h2 className="text-sm font-bold mb-2">📱 エリアマネージャーへのLINE</h2>
        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">毎朝 7:00 にとどきます</p>
            <div className="bg-white rounded-xl p-3 shadow-sm text-sm whitespace-pre-line leading-relaxed">
{`📋 中村さん、おはようございます！

きのうの城西エリア 4店舗

◎ 新宿店 → 目標クリア！すごい
△ 渋谷店 → あとちょっとだった
△ 吉祥寺店 → まあまあ
✕ 立川店 → 材料費ちょっと高かった

今日やること
🛒 立川店の仕入れチェック
📅 渋谷店の金曜シフト、1人さがす

👉 くわしくみる`}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
