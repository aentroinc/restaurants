import { stores, todayAlerts, notifications } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

function formatYen(n: number) {
  return `¥${n.toLocaleString()}`;
}

function SalesCard({ store }: { store: (typeof stores)[0] }) {
  const progress = Math.round((store.todaySales / store.targetSales) * 100);
  const diff = store.todaySales - store.yesterdaySales;
  const diffPct = Math.round((diff / store.yesterdaySales) * 100);

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-500">{store.name}</span>
          <Badge
            variant="default"
            className="text-xs bg-green-100 text-green-700 border-0"
          >
            営業中
          </Badge>
        </div>
        <div className="text-3xl font-bold tracking-tight">
          {formatYen(store.todaySales)}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={`text-sm font-medium ${diff >= 0 ? "text-green-600" : "text-red-500"}`}
          >
            {diff >= 0 ? "⤴" : "⤵"} きのうより {Math.abs(diffPct)}%{" "}
            {diff >= 0 ? "おおい" : "すくない"}
          </span>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>目標まで</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${progress >= 80 ? "bg-green-500" : progress >= 50 ? "bg-yellow-500" : "bg-red-400"}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
        <div className="flex justify-between mt-3 text-sm text-gray-500">
          <span>{store.customers}人</span>
          <span>客単価 {formatYen(store.avgSpend)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const totalSales = stores.reduce((s, st) => s + st.todaySales, 0);
  const unreadAlerts = todayAlerts.filter((a) => a.severity !== "info").length;
  const unreadNotifications = notifications.filter((n) => !n.read).length;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">今日のお店</h1>
          <p className="text-xs text-gray-500">4月30日(水) 15:30 現在</p>
        </div>
        <Link href="/notifications" className="relative">
          <span className="text-2xl">🔔</span>
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {unreadNotifications}
            </span>
          )}
        </Link>
      </div>

      <Card className="border-0 shadow-sm bg-orange-50">
        <CardContent className="p-4">
          <p className="text-sm text-orange-700">全店舗あわせて</p>
          <p className="text-4xl font-bold text-orange-900 tracking-tight">
            {formatYen(totalSales)}
          </p>
        </CardContent>
      </Card>

      {unreadAlerts > 0 && (
        <div>
          <h2 className="text-sm font-bold mb-2 flex items-center gap-1">
            ⚠ いまのおしらせ
            <Badge className="bg-red-500 text-white border-0 text-xs">
              {unreadAlerts}
            </Badge>
          </h2>
          <div className="space-y-2">
            {todayAlerts.map((alert) => (
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
                    <div className="flex-1">
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {alert.detail}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {alert.time} /{" "}
                        {stores.find((s) => s.id === alert.storeId)?.name}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Separator />

      <div>
        <h2 className="text-sm font-bold mb-2">いまの売上</h2>
        <div className="space-y-3">
          {stores.map((store) => (
            <SalesCard key={store.id} store={store} />
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h2 className="text-sm font-bold mb-2">やること</h2>
        <div className="space-y-2">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>🛒</span>
                <span className="text-sm">仕入れの確認が2件あります</span>
              </div>
              <Link
                href="/stock"
                className="text-orange-600 text-sm font-medium"
              >
                みる →
              </Link>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>📅</span>
                <span className="text-sm">
                  来週のシフト、まだ決まっていません
                </span>
              </div>
              <Link
                href="/shift"
                className="text-orange-600 text-sm font-medium"
              >
                みる →
              </Link>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>🍽</span>
                <span className="text-sm">メニュー見直し 退場候補が2つ</span>
              </div>
              <Link
                href="/menu"
                className="text-orange-600 text-sm font-medium"
              >
                みる →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

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
