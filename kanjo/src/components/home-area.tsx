"use client";

import { stores, storeIssues, todayAlerts } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
      <div>
        <p className="text-xs text-gray-500">中村さん、おつかれさまです</p>
        <p className="text-xs text-gray-400">城西エリア({areaStores.length}店舗)</p>
      </div>

      {/* Area total */}
      <Card className="border-0 shadow-sm bg-orange-50">
        <CardContent className="p-4">
          <p className="text-xs text-orange-700">城西エリア合計 / 今日の売上</p>
          <p className="text-4xl font-bold text-orange-900 tracking-tight">
            {formatYen(totalToday)}
          </p>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>エリア目標まで</span>
              <span>{totalProgress}%</span>
            </div>
            <div className="w-full bg-orange-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${totalProgress >= 80 ? "bg-green-500" : "bg-yellow-500"}`}
                style={{ width: `${Math.min(totalProgress, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues */}
      {areaIssues.length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-2 flex items-center gap-1">
            ⚠ エリアのおしらせ
            <Badge className="bg-red-500 text-white border-0 text-xs">{areaIssues.length}</Badge>
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
                    <p className="text-sm font-medium">{issue.store}</p>
                    <Badge className={`text-xs border-0 ${
                      issue.severity === "danger" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {issue.severity === "danger" ? "ヤバい" : "気をつけて"}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{issue.message}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Today's alerts */}
      {areaAlerts.length > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-2">いまのおしらせ</h2>
          <div className="space-y-2">
            {areaAlerts.map((alert) => (
              <Card key={alert.id} className="border-0 shadow-sm bg-gray-50">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <span>{alert.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs text-gray-400">{alert.time} / {stores.find((s) => s.id === alert.storeId)?.name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Per-store comparison */}
      <div>
        <h2 className="text-sm font-bold mb-2">店舗くらべ</h2>
        <div className="space-y-3">
          {areaStores.map((store) => {
            const progress = Math.round((store.todaySales / store.targetSales) * 100);
            const monthProgress = Math.round((store.monthlySales / store.monthlyTarget) * 100);
            const costOver = store.costRate > store.costRateTarget;
            return (
              <Card key={store.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm">{store.name}</h3>
                    <Badge className={`text-xs border-0 ${
                      progress >= 80 ? "bg-green-100 text-green-700" :
                      progress >= 60 ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      今日 {progress}%
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-gray-500">今日</p>
                      <p className="text-base font-bold">{formatYen(store.todaySales)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">今月</p>
                      <p className="text-base font-bold">{Math.round(store.monthlySales / 10000)}万</p>
                      <p className="text-xs text-gray-400">{monthProgress}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">原価率</p>
                      <p className={`text-base font-bold ${costOver ? "text-red-500" : "text-green-600"}`}>
                        {store.costRate}%
                      </p>
                      <p className="text-xs text-gray-400">目標{store.costRateTarget}%</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2 text-center">
                    <div className="bg-gray-50 rounded p-1.5">
                      <p className="text-xs text-gray-500">人件費率</p>
                      <p className={`text-sm font-bold ${store.laborCostRate > 30 ? "text-red-500" : "text-green-600"}`}>
                        {store.laborCostRate}%
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded p-1.5">
                      <p className="text-xs text-gray-500">ムダ削減</p>
                      <p className={`text-sm font-bold ${store.wasteReduction >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {store.wasteReduction >= 0 ? "▼" : "▲"}{formatYen(Math.abs(store.wasteReduction))}
                      </p>
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
        <h2 className="text-sm font-bold mb-2">📅 シフトの充足率(来週)</h2>
        <div className="space-y-2">
          {areaStores.map((store) => {
            const coverage = Math.round(75 + Math.random() * 25);
            return (
              <Card key={store.id} className="border-0 shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">{store.name}</span>
                    <span className={`text-sm font-bold ${coverage >= 90 ? "text-green-600" : coverage >= 80 ? "text-yellow-600" : "text-red-500"}`}>
                      {coverage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${coverage >= 90 ? "bg-green-500" : coverage >= 80 ? "bg-yellow-500" : "bg-red-400"}`}
                      style={{ width: `${coverage}%` }}
                    />
                  </div>
                  {coverage < 90 && (
                    <p className="text-xs text-gray-400 mt-1">
                      {coverage < 80 ? "ホール・キッチンどちらも不足" : "金曜ディナーが不足"}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* LINE preview */}
      <div>
        <h2 className="text-sm font-bold mb-2">📱 エリアマネージャーへのLINE</h2>
        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="p-4">
            <div className="bg-white rounded-xl p-3 shadow-sm text-sm whitespace-pre-line leading-relaxed">
              {`📋 中村さん、城西エリア朝レポート

4店舗合計 / 目標達成率 82%

⤴ 好調: 新宿店(目標93%)
⤵ 要注意: 立川店(目標77%)

⚠ 立川店の原価率が2.4%オーバー
原因: 鶏もも仕入れ値の上昇

👉 立川店のくわしい数字をみる`}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
