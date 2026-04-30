"use client";

import { stores, monthlyPL, monthlyTrendByStore, storeIssues } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function formatYen(n: number) {
  return `¥${n.toLocaleString()}`;
}

function formatMan(n: number) {
  return `${Math.round(n / 10000)}万`;
}

export function HomeOwner() {
  const totalToday = stores.reduce((s, st) => s + st.todaySales, 0);
  const totalYesterday = stores.reduce((s, st) => s + st.yesterdaySales, 0);
  const todayDiff = Math.round(((totalToday - totalYesterday) / totalYesterday) * 100);
  const totalWasteReduction = stores.reduce((s, st) => s + st.wasteReduction, 0);
  const dangerIssues = storeIssues.filter((i) => i.severity === "danger");
  const profitDiff = Math.round(((monthlyPL.profit - monthlyPL.profitLastYear) / monthlyPL.profitLastYear) * 100);

  const storeRanking = [...stores].sort((a, b) => b.todaySales - a.todaySales);

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div>
        <p className="text-xs text-gray-500">山本社長、おつかれさまです</p>
      </div>

      {/* Big numbers */}
      <Card className="border-0 shadow-sm bg-orange-50">
        <CardContent className="p-4">
          <p className="text-xs text-orange-700">全{stores.length}店舗 / 今日の売上</p>
          <p className="text-4xl font-bold text-orange-900 tracking-tight">
            {formatYen(totalToday)}
          </p>
          <p className={`text-sm mt-1 ${todayDiff >= 0 ? "text-green-600" : "text-red-500"}`}>
            {todayDiff >= 0 ? "⤴" : "⤵"} きのうより {Math.abs(todayDiff)}% {todayDiff >= 0 ? "おおい" : "すくない"}
          </p>
        </CardContent>
      </Card>

      {/* Monthly P/L Summary */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <h2 className="text-sm font-bold mb-3">今月のまとめ(4月)</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs text-gray-500">月の売上</p>
              <p className="text-2xl font-bold">{formatMan(monthlyPL.sales)}円</p>
              <p className="text-xs text-green-600">去年より +{Math.round(((monthlyPL.sales - monthlyPL.salesLastYear) / monthlyPL.salesLastYear) * 100)}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">月のもうけ</p>
              <p className="text-2xl font-bold text-green-700">{formatMan(monthlyPL.profit)}円</p>
              <p className="text-xs text-green-600">去年より +{profitDiff}%</p>
            </div>
          </div>
          <Separator className="my-3" />
          <div className="space-y-1.5">
            {[
              { label: "材料費", value: monthlyPL.costOfGoods, pct: Math.round((monthlyPL.costOfGoods / monthlyPL.sales) * 100) },
              { label: "人件費", value: monthlyPL.laborCost, pct: Math.round((monthlyPL.laborCost / monthlyPL.sales) * 100) },
              { label: "家賃", value: monthlyPL.rent, pct: Math.round((monthlyPL.rent / monthlyPL.sales) * 100) },
              { label: "光熱費", value: monthlyPL.utilities, pct: Math.round((monthlyPL.utilities / monthlyPL.sales) * 100) },
              { label: "その他", value: monthlyPL.other, pct: Math.round((monthlyPL.other / monthlyPL.sales) * 100) },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span>{formatMan(item.value)}円</span>
                  <span className="text-xs text-gray-400 w-8 text-right">{item.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Waste Reduction - the killer metric */}
      <Card className={`border-0 shadow-sm ${totalWasteReduction > 0 ? "bg-green-50" : "bg-red-50"}`}>
        <CardContent className="p-4">
          <p className="text-xs text-gray-500">今月、ムダを減らせた金額</p>
          <p className={`text-3xl font-bold ${totalWasteReduction > 0 ? "text-green-700" : "text-red-600"}`}>
            {totalWasteReduction > 0 ? "▼" : "▲"} {formatYen(Math.abs(totalWasteReduction))}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {totalWasteReduction > 0
              ? "いい調子です。先月よりムダが減っています"
              : "先月よりムダが増えています。要チェック"}
          </p>
          <div className="mt-2 space-y-1">
            {stores.map((s) => (
              <div key={s.id} className="flex justify-between text-xs">
                <span>{s.name}</span>
                <span className={s.wasteReduction >= 0 ? "text-green-600" : "text-red-500"}>
                  {s.wasteReduction >= 0 ? "▼" : "▲"} {formatYen(Math.abs(s.wasteReduction))}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Problem stores */}
      {dangerIssues.length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-2 flex items-center gap-1">
            ⚠ 気になるお店
            <Badge className="bg-red-500 text-white border-0 text-xs">{dangerIssues.length}</Badge>
          </h2>
          <div className="space-y-2">
            {dangerIssues.map((issue, i) => (
              <Card key={i} className="border-0 shadow-sm bg-red-50 border-l-4 border-l-red-400">
                <CardContent className="p-3">
                  <p className="text-sm font-medium">{issue.store}</p>
                  <p className="text-xs text-red-600">{issue.message}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Store Ranking */}
      <div>
        <h2 className="text-sm font-bold mb-2">今日の店舗ランキング</h2>
        <div className="space-y-2">
          {storeRanking.map((store, i) => {
            const progress = Math.round((store.todaySales / store.targetSales) * 100);
            return (
              <Card key={store.id} className="border-0 shadow-sm">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                    i === 0 ? "bg-yellow-400 text-white" :
                    i === 1 ? "bg-gray-300 text-white" :
                    i === 2 ? "bg-orange-300 text-white" :
                    "bg-gray-100 text-gray-500"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{store.name}</span>
                      <span className="text-sm font-bold">{formatYen(store.todaySales)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 mr-2">
                        <div
                          className={`h-1.5 rounded-full ${progress >= 80 ? "bg-green-500" : progress >= 50 ? "bg-yellow-500" : "bg-red-400"}`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">目標{progress}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Monthly trend mini chart */}
      <div>
        <h2 className="text-sm font-bold mb-2">半年間の売上うごき</h2>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            {monthlyTrendByStore.map((m) => {
              const total = stores.reduce((s, st) => s + (m[st.name as keyof typeof m] as number || 0), 0);
              const maxTotal = 75000000;
              return (
                <div key={m.month} className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs text-gray-500 w-8">{m.month}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4">
                    <div className="bg-orange-400 h-4 rounded-full" style={{ width: `${(total / maxTotal) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium w-12 text-right">{formatMan(total)}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Weekly LINE */}
      <div>
        <h2 className="text-sm font-bold mb-2">📱 社長への週次LINE</h2>
        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="p-4">
            <div className="bg-white rounded-xl p-3 shadow-sm text-sm whitespace-pre-line leading-relaxed">
              {`📊 山本社長、今週のまとめです

全6店舗 / 4月4週
売上: 1,520万円(目標の92%)
もうけ: 312万円

⤴ よかった店: 新宿店、吉祥寺店
⤵ 気になる店: 池袋店、赤羽店

ムダの削減: 12.6万円(先月比)

👉 気になる店の原因はコチラ
👉 月次レポートの全文をみる`}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
