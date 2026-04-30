"use client";

import { stores, monthlyPL, monthlyTrendByStore, storeIssues } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

function formatYen(n: number) {
  return `¥${n.toLocaleString()}`;
}
function formatMan(n: number) {
  return `${(n / 10000).toFixed(0)}万`;
}

export function HomeOwner() {
  const totalToday = stores.reduce((s, st) => s + st.todaySales, 0);
  const totalYesterday = stores.reduce((s, st) => s + st.yesterdaySales, 0);
  const todayDiff = Math.round(((totalToday - totalYesterday) / totalYesterday) * 100);
  const totalWasteReduction = stores.reduce((s, st) => s + st.wasteReduction, 0);
  const dangerIssues = storeIssues.filter((i) => i.severity === "danger");
  const salesGrowth = Math.round(((monthlyPL.sales - monthlyPL.salesLastYear) / monthlyPL.salesLastYear) * 100);
  const profitGrowth = Math.round(((monthlyPL.profit - monthlyPL.profitLastYear) / monthlyPL.profitLastYear) * 100);
  const costRatio = ((monthlyPL.costOfGoods / monthlyPL.sales) * 100).toFixed(1);
  const laborRatio = ((monthlyPL.laborCost / monthlyPL.sales) * 100).toFixed(1);
  const profitRatio = ((monthlyPL.profit / monthlyPL.sales) * 100).toFixed(1);

  const storeRanking = [...stores].sort((a, b) => b.todaySales - a.todaySales);

  return (
    <div className="space-y-4">
      {/* Greeting - MARCH grad: respectful but professional */}
      <p className="text-sm text-gray-600">山本社長、お疲れさまです。本日の経営状況です。</p>

      {/* KPI Overview - data-dense, MARCH grad can handle it */}
      <Card className="border-0 shadow-sm bg-orange-50">
        <CardContent className="p-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs text-orange-700">全{stores.length}店舗 本日売上</p>
              <p className="text-4xl font-bold text-orange-900 tracking-tight">
                {formatYen(totalToday)}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-lg font-bold ${todayDiff >= 0 ? "text-green-600" : "text-red-500"}`}>
                {todayDiff >= 0 ? "+" : ""}{todayDiff}%
              </p>
              <p className="text-xs text-gray-500">前日比</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* P/L - MARCH grad understands these terms */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-bold">4月度 損益サマリー</h2>
            <Link href="/report" className="text-xs text-orange-600">くわしく →</Link>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-500">売上高</p>
              <p className="text-lg font-bold">{formatMan(monthlyPL.sales)}</p>
              <p className="text-xs text-green-600">+{salesGrowth}% YoY</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-500">営業利益</p>
              <p className="text-lg font-bold text-green-700">{formatMan(monthlyPL.profit)}</p>
              <p className="text-xs text-green-600">+{profitGrowth}% YoY</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-500">利益率</p>
              <p className="text-lg font-bold">{profitRatio}%</p>
            </div>
          </div>

          {/* Cost breakdown bar */}
          <div className="mb-2">
            <div className="flex h-6 rounded-full overflow-hidden text-xs text-white">
              <div className="bg-red-400 flex items-center justify-center" style={{ width: `${costRatio}%` }}>原価{costRatio}%</div>
              <div className="bg-blue-400 flex items-center justify-center" style={{ width: `${laborRatio}%` }}>人件費{laborRatio}%</div>
              <div className="bg-green-400 flex items-center justify-center" style={{ width: `${profitRatio}%` }}>利益{profitRatio}%</div>
              <div className="bg-gray-300 flex-1 flex items-center justify-center">他</div>
            </div>
          </div>

          <div className="space-y-1">
            {[
              { label: "原材料費", value: monthlyPL.costOfGoods, target: 30, actual: Number(costRatio) },
              { label: "人件費", value: monthlyPL.laborCost, target: 28, actual: Number(laborRatio) },
              { label: "賃料", value: monthlyPL.rent, target: null, actual: null },
              { label: "水道光熱費", value: monthlyPL.utilities, target: null, actual: null },
              { label: "その他経費", value: monthlyPL.other, target: null, actual: null },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatMan(item.value)}</span>
                  {item.target && (
                    <span className={`text-xs px-1 rounded ${
                      item.actual! > item.target ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                    }`}>
                      {item.actual!.toFixed(1)}% {item.actual! > item.target ? "↑" : "✓"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Waste - the churn prevention metric */}
      <Card className={`border-0 shadow-sm ${totalWasteReduction > 0 ? "bg-green-50" : "bg-red-50"}`}>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-bold">食材ロス削減実績</h2>
            <Link href="/waste" className="text-xs text-orange-600">くわしく →</Link>
          </div>
          <p className={`text-3xl font-bold ${totalWasteReduction > 0 ? "text-green-700" : "text-red-600"}`}>
            {totalWasteReduction > 0 ? "▼" : "▲"} {formatYen(Math.abs(totalWasteReduction))}/月
          </p>
          <p className="text-xs text-gray-500 mt-1">
            前月比。導入前比では月額約48万円の削減効果
          </p>
          <div className="mt-3 space-y-1">
            {stores.map((s) => (
              <div key={s.id} className="flex justify-between text-xs">
                <span className="text-gray-600">{s.name}</span>
                <span className={s.wasteReduction >= 0 ? "text-green-600" : "text-red-500 font-medium"}>
                  {s.wasteReduction >= 0 ? "▼" : "▲"}{formatYen(Math.abs(s.wasteReduction))}
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
            要対応店舗
            <Badge className="bg-red-500 text-white border-0 text-xs">{dangerIssues.length}</Badge>
          </h2>
          <div className="space-y-2">
            {dangerIssues.map((issue, i) => (
              <Card key={i} className="border-0 shadow-sm bg-red-50 border-l-4 border-l-red-400">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{issue.store}</p>
                    <p className="text-xs text-red-600">{issue.message}</p>
                  </div>
                  <span className="text-xs text-orange-600">対策 →</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Store Ranking */}
      <div>
        <h2 className="text-sm font-bold mb-2">店舗別 本日実績</h2>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="grid grid-cols-5 gap-1 text-xs text-gray-500 font-medium border-b pb-2 mb-1">
              <span></span>
              <span>売上</span>
              <span>達成率</span>
              <span>原価率</span>
              <span>人件費率</span>
            </div>
            {storeRanking.map((store, i) => {
              const progress = Math.round((store.todaySales / store.targetSales) * 100);
              return (
                <div key={store.id} className="grid grid-cols-5 gap-1 text-xs py-1.5 border-b border-gray-50 items-center">
                  <span className="font-medium">{store.name}</span>
                  <span className="font-bold">{Math.round(store.todaySales / 10000)}万</span>
                  <span className={progress >= 80 ? "text-green-600" : progress >= 60 ? "text-yellow-600" : "text-red-500"}>
                    {progress}%
                  </span>
                  <span className={store.costRate > 31 ? "text-red-500" : "text-green-600"}>
                    {store.costRate}%
                  </span>
                  <span className={store.laborCostRate > 30 ? "text-red-500" : "text-green-600"}>
                    {store.laborCostRate}%
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Half-year trend */}
      <div>
        <h2 className="text-sm font-bold mb-2">半期売上推移</h2>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            {monthlyTrendByStore.map((m) => {
              const total = stores.reduce((s, st) => s + ((m as Record<string, unknown>)[st.name] as number || 0), 0);
              const maxTotal = 80000000;
              return (
                <div key={m.month} className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs text-gray-500 w-8">{m.month}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4">
                    <div className="bg-orange-400 h-4 rounded-full" style={{ width: `${(total / maxTotal) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium w-14 text-right">{formatMan(total)}</span>
                </div>
              );
            })}
            <p className="text-xs text-gray-500 mt-2">12月にピーク(忘年会需要)。1月の落ち込みは例年通り。3月以降は回復基調。</p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Weekly LINE for CEO */}
      <div>
        <h2 className="text-sm font-bold mb-2">📱 社長向け週次LINE(毎週月曜 朝8時)</h2>
        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="p-4">
            <div className="bg-white rounded-xl p-3 shadow-sm text-sm whitespace-pre-line leading-relaxed">
{`📊 山本社長、先週のまとめです

全6店舗 / 4月4週目
売上: 1,520万円(目標比92%)
営業利益: 312万円(利益率20.5%)

◎ 好調: 新宿店(目標達成)、吉祥寺店
△ 注意: 池袋店(原価率33.1%)
✕ 要改善: 赤羽店(原価率34.2%/ロス増)

食材ロス削減累計: ▼48万円/月

次週の注目: GW商戦(5/3-6)
全店の仕入れ増量を手配済みです`}
            </div>
            <div className="flex gap-2 mt-2">
              <button className="flex-1 bg-green-500 text-white rounded-lg py-2 text-xs font-medium">
                👉 月次レポート全文
              </button>
              <button className="flex-1 bg-green-500 text-white rounded-lg py-2 text-xs font-medium">
                👉 要改善店舗の対策
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
