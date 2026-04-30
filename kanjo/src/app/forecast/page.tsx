"use client";

import { tomorrowForecast, hourlySales, weeklyTrend } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function formatYen(n: number) {
  return `¥${n.toLocaleString()}`;
}

function BarChart({
  data,
  labelKey,
  valueKey,
  maxValue,
}: {
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  maxValue: number;
}) {
  return (
    <div className="space-y-2">
      {data.map((item, i) => {
        const value = item[valueKey] as number;
        const pct = (value / maxValue) * 100;
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-10 text-right">
              {item[labelKey] as string}
            </span>
            <div className="flex-1 bg-gray-100 rounded-full h-5 relative">
              <div
                className="bg-orange-400 h-5 rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-medium w-16 text-right">
              {formatYen(value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function ForecastPage() {
  const maxHourlySales = Math.max(...hourlySales.map((h) => h.sales));
  const maxWeeklySales = Math.max(...weeklyTrend.map((w) => w.sales));

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold">あしたの見込み</h1>
      <p className="text-xs text-gray-500">
        {tomorrowForecast.date}({tomorrowForecast.dayOfWeek}){" "}
        {tomorrowForecast.weather}
      </p>

      {tomorrowForecast.stores.map((store) => (
        <Card key={store.storeId} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <h2 className="font-bold text-base mb-2">{store.storeName}</h2>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-xs text-gray-500">お客さん</p>
                <p className="text-2xl font-bold">
                  約{store.expectedCustomers}人
                </p>
                <p className="text-xs text-gray-400">
                  去年: {store.lastYearCustomers}人
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">売上</p>
                <p className="text-2xl font-bold">
                  約{Math.round(store.expectedSales / 10000)}万円
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-2 mb-3">
              💡 {store.reason}
            </p>

            <div className="mb-2">
              <p className="text-xs font-bold text-gray-500 mb-1">
                よく出そうなTOP3
              </p>
              {store.topMenus.map((menu, i) => (
                <div
                  key={i}
                  className="flex justify-between text-sm py-0.5 border-b border-gray-50"
                >
                  <span>
                    {i + 1}. {menu.name}
                  </span>
                  <span className="text-gray-500">{menu.count}食</span>
                </div>
              ))}
            </div>

            {store.warning && (
              <div className="bg-yellow-50 rounded-lg p-2 mt-2">
                <p className="text-sm text-yellow-800">⚠ {store.warning}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Separator />

      <Tabs defaultValue="hourly">
        <TabsList className="w-full">
          <TabsTrigger value="hourly" className="flex-1">
            時間帯べつ
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex-1">
            1週間のうごき
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hourly" className="mt-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-bold mb-3">
                今日の時間帯べつ売上(渋谷店)
              </h3>
              <BarChart
                data={hourlySales}
                labelKey="hour"
                valueKey="sales"
                maxValue={maxHourlySales}
              />
              <p className="text-xs text-gray-500 mt-3 bg-gray-50 p-2 rounded">
                💡 12時台がピーク。14〜16時はお客さんが少ないので、この時間の値段を工夫すると◎
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="mt-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-bold mb-3">今週の売上(渋谷店)</h3>
              <BarChart
                data={weeklyTrend}
                labelKey="day"
                valueKey="sales"
                maxValue={maxWeeklySales}
              />
              <p className="text-xs text-gray-500 mt-3 bg-gray-50 p-2 rounded">
                💡 金・土が稼ぎどき。水曜がやや上がっているのは近隣のイベント効果かも
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
