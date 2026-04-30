"use client";

import { ingredients, purchaseOrders } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function formatYen(n: number) {
  return `¥${n.toLocaleString()}`;
}

function StockLevel({ current, required }: { current: number; required: number }) {
  const ratio = current / required;
  const color =
    ratio <= 0.3 ? "bg-red-400" : ratio <= 0.6 ? "bg-yellow-400" : "bg-green-400";
  const label =
    ratio <= 0.3 ? "ヤバい" : ratio <= 0.6 ? "気をつけて" : "だいじょうぶ";
  const labelColor =
    ratio <= 0.3 ? "text-red-600" : ratio <= 0.6 ? "text-yellow-600" : "text-green-600";

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className={`font-medium ${labelColor}`}>{label}</span>
        <span className="text-gray-400">{Math.round(ratio * 100)}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full ${color}`}
          style={{ width: `${Math.min(ratio * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function StockPage() {
  const lowStock = ingredients.filter(
    (i) => i.currentStock / i.requiredToday < 0.5
  );

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold">のこりの食材</h1>
      <p className="text-xs text-gray-500">渋谷店 / 4月30日(水) 15:30 現在</p>

      {lowStock.length > 0 && (
        <Card className="border-0 shadow-sm bg-red-50">
          <CardContent className="p-3">
            <p className="text-sm font-bold text-red-700 mb-1">
              ⚠ のこり少ない食材
            </p>
            {lowStock.map((item) => (
              <p key={item.id} className="text-sm text-red-600">
                {item.name}: あと{item.currentStock}
                {item.unit} (今日{item.requiredToday}
                {item.unit}いります)
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="stock">
        <TabsList className="w-full">
          <TabsTrigger value="stock" className="flex-1">のこり</TabsTrigger>
          <TabsTrigger value="orders" className="flex-1">仕入れ</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-3 space-y-2">
          {ingredients.map((item) => (
            <Card key={item.id} className="border-0 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.supplier}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">
                      {item.currentStock}
                      <span className="text-xs text-gray-400 ml-0.5">
                        {item.unit}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400">
                      今日 {item.requiredToday}
                      {item.unit} いる
                    </p>
                  </div>
                </div>
                <StockLevel
                  current={item.currentStock}
                  required={item.requiredToday}
                />
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="orders" className="mt-3 space-y-3">
          <p className="text-sm text-gray-500">今日の仕入れ注文</p>

          {purchaseOrders.map((order) => (
            <Card key={order.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{order.supplier}</p>
                    <p className="text-xs text-gray-400">
                      {order.deadline}までに注文
                    </p>
                  </div>
                  <Badge
                    className={`text-xs border-0 ${
                      order.status === "確認待ち"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {order.status}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 space-y-0.5">
                  {order.items.map((item, i) => (
                    <p key={i}>・{item}</p>
                  ))}
                </div>
                <Separator className="my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">
                    {formatYen(order.total)}
                  </span>
                  {order.status === "確認待ち" && (
                    <button className="bg-orange-500 text-white text-xs px-4 py-1.5 rounded-lg font-medium">
                      注文する
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          <Separator />

          <Card className="border-0 shadow-sm bg-green-50">
            <CardContent className="p-4">
              <p className="text-sm font-bold text-green-800 mb-2">
                📱 LINE通知でもチェック
              </p>
              <div className="bg-white rounded-xl p-3 shadow-sm text-sm whitespace-pre-line leading-relaxed">
                {`🛒 朝の仕入れチェック

今日の仕入れリスト
✅ 鶏もも 5kg(豊洲水産)
✅ レタス 10玉(青果田中)
✅ 牛乳 24本(明治)

合計 ¥34,560`}
              </div>
              <button className="mt-2 w-full bg-green-500 text-white rounded-lg py-2 text-sm font-medium">
                👉 注文書を送る
              </button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
