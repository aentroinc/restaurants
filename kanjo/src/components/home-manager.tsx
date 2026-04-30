"use client";

import { stores, todayAlerts } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { LiveSalesCounter } from "@/components/live-sales";

function formatYen(n: number) {
  return `¥${n.toLocaleString()}`;
}

export function HomeManager() {
  const store = stores[0]; // 渋谷店
  const progress = Math.round((store.todaySales / store.targetSales) * 100);
  const diff = store.todaySales - store.yesterdaySales;
  const diffPct = Math.round((diff / store.yesterdaySales) * 100);
  const myAlerts = todayAlerts.filter((a) => a.storeId === store.id);
  const progressEmoji = progress >= 80 ? "🔥" : progress >= 60 ? "💪" : "😤";

  return (
    <div className="space-y-4">
      {/* Greeting - 高卒: like a friend talking, very warm */}
      <p className="text-sm text-gray-600">田中さん、おつかれ！ 今日の渋谷店👇</p>

      {/* Today's sales - HUGE number, simple */}
      <Card className="border-0 shadow-sm bg-orange-50">
        <CardContent className="p-5">
          <p className="text-xs text-orange-700">いまの売上</p>
          <LiveSalesCounter base={store.todaySales} />
          <div className="flex items-center gap-2 mt-2">
            <span className="text-2xl">{progressEmoji}</span>
            <div>
              <p className={`text-sm font-bold ${diff >= 0 ? "text-green-600" : "text-red-500"}`}>
                きのうより {Math.abs(diffPct)}% {diff >= 0 ? "おおい！" : "すくない…"}
              </p>
              <p className="text-xs text-gray-500">{store.customers}人きた / 1人あたり {formatYen(store.avgSpend)}</p>
            </div>
          </div>

          {/* Goal bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">今日のゴール</span>
              <span className="font-bold">{progress}%</span>
            </div>
            <div className="w-full bg-orange-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full flex items-center justify-end pr-1 text-xs text-white font-bold ${
                  progress >= 80 ? "bg-green-500" : progress >= 50 ? "bg-yellow-500" : "bg-red-400"
                }`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              >
                {progress >= 30 && `${formatYen(store.todaySales)}`}
              </div>
            </div>
            <p className="text-xs text-gray-400 text-right mt-0.5">
              あと {formatYen(Math.max(store.targetSales - store.todaySales, 0))} で目標！
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Alerts - very visual, action-oriented */}
      {myAlerts.length > 0 && (
        <div>
          <h2 className="text-base font-bold mb-2">
            ⚡ いま気になること
          </h2>
          <div className="space-y-2">
            {myAlerts.map((alert) => (
              <Card
                key={alert.id}
                className={`border-0 shadow-sm ${
                  alert.severity === "danger"
                    ? "bg-red-50 border-l-4 border-l-red-500"
                    : alert.severity === "warning"
                      ? "bg-yellow-50 border-l-4 border-l-yellow-500"
                      : "bg-blue-50 border-l-4 border-l-blue-400"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{alert.icon}</span>
                    <div className="flex-1">
                      <p className="text-base font-bold">{alert.message}</p>
                      <p className="text-sm text-gray-600 mt-1">{alert.detail}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Action items - big buttons, simple words */}
      <div>
        <h2 className="text-base font-bold mb-2">✅ やること</h2>
        <div className="space-y-3">
          <Link href="/stock">
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-yellow-50">
              <CardContent className="p-4 flex items-center gap-3">
                <span className="text-3xl">🛒</span>
                <div className="flex-1">
                  <p className="text-base font-bold">仕入れをチェック</p>
                  <p className="text-sm text-gray-500">2件、まだ確認してない</p>
                </div>
                <span className="text-orange-500 text-lg">→</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/shift">
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-blue-50">
              <CardContent className="p-4 flex items-center gap-3">
                <span className="text-3xl">📅</span>
                <div className="flex-1">
                  <p className="text-base font-bold">来週のシフトを決める</p>
                  <p className="text-sm text-gray-500">金曜のディナー、1人たりない</p>
                </div>
                <span className="text-orange-500 text-lg">→</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/menu">
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-purple-50">
              <CardContent className="p-4 flex items-center gap-3">
                <span className="text-3xl">🍽</span>
                <div className="flex-1">
                  <p className="text-base font-bold">メニューを見直す</p>
                  <p className="text-sm text-gray-500">あんまり出てないやつが2つ</p>
                </div>
                <span className="text-orange-500 text-lg">→</span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      <Separator />

      {/* Simple daily metrics - no jargon */}
      <div>
        <h2 className="text-base font-bold mb-2">📊 きょうの数字</h2>
        <div className="grid grid-cols-2 gap-2">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-sm text-gray-500">材料にかかったお金</p>
              <p className={`text-2xl font-bold ${store.costRate > store.costRateTarget ? "text-red-500" : "text-green-600"}`}>
                {store.costRate}%
              </p>
              <p className="text-xs text-gray-400">
                {store.costRate > store.costRateTarget
                  ? `目標(${store.costRateTarget}%)よりちょっと高い`
                  : "👍 いい感じ"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-sm text-gray-500">もったいない(ムダ)</p>
              <p className={`text-2xl font-bold ${store.wasteReduction >= 0 ? "text-green-600" : "text-red-500"}`}>
                {store.wasteReduction >= 0 ? "⬇" : "⬆"}
              </p>
              <p className="text-xs text-gray-400">
                {store.wasteReduction >= 0
                  ? `先月より${formatYen(store.wasteReduction)}ぶん減った！`
                  : "先月よりちょっと増えちゃった"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* LINE preview - 高卒: like a message from a helpful friend */}
      <div>
        <h2 className="text-base font-bold mb-2">📱 朝にLINEでとどくよ</h2>
        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">毎朝 6:00 にとどく</p>
            <div className="bg-white rounded-xl p-4 shadow-sm text-sm whitespace-pre-line leading-relaxed">
{`おはよう☀ 渋谷店

🍱 明日はこんな感じ
お客さん 120人くらいきそう
売上は 42万円いけそう

よく出そうなやつ
1. 唐揚げ定食 → 35食
2. ハンバーグ → 28食
3. 日替わり → 22食

⚠ ハンバーグの肉、多めに頼んどいて！`}
            </div>
            <button className="mt-3 w-full bg-green-500 text-white rounded-xl py-3 text-base font-bold">
              👉 仕入れをみる
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
