"use client";

import { stores, todayAlerts, notifications } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

function formatYen(n: number) {
  return `¥${n.toLocaleString()}`;
}

export function HomeManager() {
  const store = stores[0]; // 渋谷店
  const progress = Math.round((store.todaySales / store.targetSales) * 100);
  const diff = store.todaySales - store.yesterdaySales;
  const diffPct = Math.round((diff / store.yesterdaySales) * 100);
  const myAlerts = todayAlerts.filter((a) => a.storeId === store.id);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-gray-500">田中店長、おつかれさまです</p>
        <p className="text-xs text-gray-400">渋谷店</p>
      </div>

      {/* Today's sales */}
      <Card className="border-0 shadow-sm bg-orange-50">
        <CardContent className="p-4">
          <p className="text-xs text-orange-700">いまの売上</p>
          <p className="text-4xl font-bold text-orange-900 tracking-tight">
            {formatYen(store.todaySales)}
          </p>
          <p className={`text-sm mt-1 ${diff >= 0 ? "text-green-600" : "text-red-500"}`}>
            {diff >= 0 ? "⤴" : "⤵"} きのうより {Math.abs(diffPct)}% {diff >= 0 ? "おおい" : "すくない"}
          </p>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>目標まで</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-orange-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${progress >= 80 ? "bg-green-500" : progress >= 50 ? "bg-yellow-500" : "bg-red-400"}`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between mt-3 text-sm text-gray-600">
            <span>{store.customers}人</span>
            <span>客単価 {formatYen(store.avgSpend)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {myAlerts.length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-2 flex items-center gap-1">
            ⚠ いまのおしらせ
            <Badge className="bg-red-500 text-white border-0 text-xs">{myAlerts.length}</Badge>
          </h2>
          <div className="space-y-2">
            {myAlerts.map((alert) => (
              <Card
                key={alert.id}
                className={`border-0 shadow-sm ${
                  alert.severity === "danger"
                    ? "bg-red-50 border-l-4 border-l-red-400"
                    : alert.severity === "warning"
                      ? "bg-yellow-50 border-l-4 border-l-yellow-400"
                      : "bg-blue-50 border-l-4 border-l-blue-400"
                }`}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{alert.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{alert.detail}</p>
                      <p className="text-xs text-gray-400 mt-1">{alert.time}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-gray-500">原価率</p>
            <p className={`text-xl font-bold ${store.costRate > store.costRateTarget ? "text-red-500" : "text-green-600"}`}>
              {store.costRate}%
            </p>
            <p className="text-xs text-gray-400">目標{store.costRateTarget}%</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-gray-500">人件費率</p>
            <p className="text-xl font-bold text-yellow-600">{store.laborCostRate}%</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-gray-500">ムダ削減</p>
            <p className={`text-xl font-bold ${store.wasteReduction >= 0 ? "text-green-600" : "text-red-500"}`}>
              {store.wasteReduction >= 0 ? "▼" : "▲"}{Math.round(store.wasteReduction / 1000)}千
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Action items */}
      <div>
        <h2 className="text-sm font-bold mb-2">やること</h2>
        <div className="space-y-2">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>🛒</span>
                <span className="text-sm">仕入れの確認が2件あります</span>
              </div>
              <Link href="/stock" className="text-orange-600 text-sm font-medium">みる →</Link>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>📅</span>
                <span className="text-sm">来週のシフト、まだ決まっていません</span>
              </div>
              <Link href="/shift" className="text-orange-600 text-sm font-medium">みる →</Link>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>🍽</span>
                <span className="text-sm">メニュー見直し 退場候補が2つ</span>
              </div>
              <Link href="/menu" className="text-orange-600 text-sm font-medium">みる →</Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* LINE preview */}
      <div>
        <h2 className="text-sm font-bold mb-2">📱 LINE通知プレビュー</h2>
        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="p-4">
            <div className="bg-white rounded-xl p-3 shadow-sm text-sm whitespace-pre-line leading-relaxed">
              {`おはようございます☀ 渋谷店

🍱 あしたの見込み
お客さん: 約120人(去年より+10人)
売上: 約42万円

よく出そうなTOP3
1. 唐揚げ定食 35食
2. ハンバーグ 28食
3. 日替わり 22食

⚠ ハンバーグの仕入れ、いつもより多めに`}
            </div>
            <button className="mt-3 w-full bg-green-500 text-white rounded-lg py-2 text-sm font-medium">
              👉 仕入れの注文をみる
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
