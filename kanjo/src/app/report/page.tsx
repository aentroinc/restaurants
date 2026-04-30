"use client";

import { stores, monthlyPL, monthlyTrendByStore } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

function formatYen(n: number) {
  return `¥${n.toLocaleString()}`;
}
function formatMan(n: number) {
  return `${(n / 10000).toFixed(0)}万`;
}

export default function ReportPage() {
  const salesGrowth = Math.round(((monthlyPL.sales - monthlyPL.salesLastYear) / monthlyPL.salesLastYear) * 100);
  const profitGrowth = Math.round(((monthlyPL.profit - monthlyPL.profitLastYear) / monthlyPL.profitLastYear) * 100);
  const totalWaste = stores.reduce((s, st) => s + st.wasteAmount, 0);
  const totalWasteReduction = stores.reduce((s, st) => s + st.wasteReduction, 0);

  const plItems = [
    { label: "売上高", value: monthlyPL.sales, lastYear: monthlyPL.salesLastYear, indent: false, bold: true },
    { label: "原材料費", value: -monthlyPL.costOfGoods, lastYear: null, indent: true, bold: false },
    { label: "人件費", value: -monthlyPL.laborCost, lastYear: null, indent: true, bold: false },
    { label: "賃料", value: -monthlyPL.rent, lastYear: null, indent: true, bold: false },
    { label: "水道光熱費", value: -monthlyPL.utilities, lastYear: null, indent: true, bold: false },
    { label: "その他経費", value: -monthlyPL.other, lastYear: null, indent: true, bold: false },
    { label: "営業利益", value: monthlyPL.profit, lastYear: monthlyPL.profitLastYear, indent: false, bold: true },
  ];

  const storesSorted = [...stores].sort((a, b) => b.monthlySales - a.monthlySales);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold">月次レポート</h1>
      <p className="text-xs text-gray-500">2026年4月度 / 全{stores.length}店舗</p>

      {/* Executive Summary */}
      <Card className="border-0 shadow-sm bg-blue-50">
        <CardContent className="p-4">
          <h2 className="text-sm font-bold mb-2">エグゼクティブサマリー</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            売上は前年同月比+{salesGrowth}%の{formatMan(monthlyPL.sales)}円。
            営業利益は+{profitGrowth}%の{formatMan(monthlyPL.profit)}円。
            原価率は{((monthlyPL.costOfGoods / monthlyPL.sales) * 100).toFixed(1)}%で
            目標30%に対してやや上振れ。赤羽店・池袋店の原価率改善が課題。
            食材ロス削減は月額{formatYen(Math.abs(totalWasteReduction))}の改善を継続中。
          </p>
        </CardContent>
      </Card>

      {/* P/L Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <h2 className="text-sm font-bold mb-3">損益計算書</h2>
          <div className="space-y-1">
            <div className="grid grid-cols-3 text-xs text-gray-400 border-b pb-1 mb-1">
              <span></span>
              <span className="text-right">当月</span>
              <span className="text-right">構成比</span>
            </div>
            {plItems.map((item) => {
              const ratio = Math.abs(item.value) / monthlyPL.sales * 100;
              return (
                <div
                  key={item.label}
                  className={`grid grid-cols-3 text-sm py-1 ${
                    item.bold ? "font-bold border-t border-gray-200 pt-2" : ""
                  } ${item.indent ? "pl-4" : ""}`}
                >
                  <span className={item.bold ? "" : "text-gray-600"}>{item.label}</span>
                  <span className={`text-right ${item.value < 0 ? "" : ""}`}>
                    {item.value < 0 ? `(${formatMan(Math.abs(item.value))})` : formatMan(item.value)}
                  </span>
                  <span className="text-right text-gray-400">{ratio.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Store Performance Table */}
      <div>
        <h2 className="text-sm font-bold mb-2">店舗別月次実績</h2>
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left font-medium text-gray-500">店舗</th>
                    <th className="p-2 text-right font-medium text-gray-500">月売上</th>
                    <th className="p-2 text-right font-medium text-gray-500">達成率</th>
                    <th className="p-2 text-right font-medium text-gray-500">原価率</th>
                    <th className="p-2 text-right font-medium text-gray-500">人件費率</th>
                    <th className="p-2 text-right font-medium text-gray-500">ロス</th>
                  </tr>
                </thead>
                <tbody>
                  {storesSorted.map((store) => {
                    const achievement = Math.round((store.monthlySales / store.monthlyTarget) * 100);
                    return (
                      <tr key={store.id} className="border-b border-gray-50">
                        <td className="p-2 font-medium">{store.name}</td>
                        <td className="p-2 text-right">{formatMan(store.monthlySales)}</td>
                        <td className="p-2 text-right">
                          <span className={achievement >= 90 ? "text-green-600" : achievement >= 75 ? "text-yellow-600" : "text-red-500"}>
                            {achievement}%
                          </span>
                        </td>
                        <td className="p-2 text-right">
                          <span className={store.costRate <= 31 ? "text-green-600" : "text-red-500"}>
                            {store.costRate}%
                          </span>
                        </td>
                        <td className="p-2 text-right">
                          <span className={store.laborCostRate <= 29 ? "text-green-600" : "text-red-500"}>
                            {store.laborCostRate}%
                          </span>
                        </td>
                        <td className="p-2 text-right">{formatYen(store.wasteAmount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Trend */}
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
                    <div className="bg-blue-400 h-4 rounded-full" style={{ width: `${(total / maxTotal) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium w-14 text-right">{formatMan(total)}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Key Actions */}
      <div>
        <h2 className="text-sm font-bold mb-2">来月に向けた重点施策</h2>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Badge className="bg-red-100 text-red-700 border-0 text-xs mt-0.5">最優先</Badge>
              <div>
                <p className="text-sm font-medium">赤羽店の原価率改善</p>
                <p className="text-xs text-gray-500">肉類の発注量見直し、レシピ原価の再計算。目標: 34.2% → 31%</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge className="bg-red-100 text-red-700 border-0 text-xs mt-0.5">最優先</Badge>
              <div>
                <p className="text-sm font-medium">池袋店の人件費率改善</p>
                <p className="text-xs text-gray-500">アイドルタイムのシフト最適化。目標: 31% → 28%</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge className="bg-yellow-100 text-yellow-700 border-0 text-xs mt-0.5">重要</Badge>
              <div>
                <p className="text-sm font-medium">GW商戦の仕入れ最適化</p>
                <p className="text-xs text-gray-500">5/3-6の需要予測に基づく事前発注。在庫切れと廃棄を同時抑制</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge className="bg-blue-100 text-blue-700 border-0 text-xs mt-0.5">改善</Badge>
              <div>
                <p className="text-sm font-medium">退場候補メニュー2品の判断</p>
                <p className="text-xs text-gray-500">シーザーサラダ・チョコレートケーキの廃止または改良</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export */}
      <div className="flex gap-2">
        <button className="flex-1 bg-orange-500 text-white text-sm py-2.5 rounded-lg font-medium">
          📄 PDFに出す
        </button>
        <button className="flex-1 border border-gray-300 text-sm py-2.5 rounded-lg font-medium text-gray-600">
          📊 Excelに出す
        </button>
      </div>
    </div>
  );
}
