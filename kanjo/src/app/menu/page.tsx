"use client";

import { menus } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function formatYen(n: number) {
  return `¥${n.toLocaleString()}`;
}

const tagConfig = {
  "主役": { bg: "bg-green-100", text: "text-green-700", desc: "人気もうけも◎" },
  "働きもの": { bg: "bg-blue-100", text: "text-blue-700", desc: "人気はあるけどもうけ少ない" },
  "隠れた優等生": { bg: "bg-purple-100", text: "text-purple-700", desc: "もうけ大だけど注文すくない" },
  "退場候補": { bg: "bg-red-100", text: "text-red-700", desc: "見直しが必要" },
} as const;

type TagKey = keyof typeof tagConfig;

export default function MenuPage() {
  const stars = menus.filter((m) => m.tag === "主役");
  const plowhorses = menus.filter((m) => m.tag === "働きもの");
  const puzzles = menus.filter((m) => m.tag === "隠れた優等生");
  const dogs = menus.filter((m) => m.tag === "退場候補");

  const totalProfit = menus.reduce((s, m) => s + m.monthlyProfit, 0);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold">メニューの見直し</h1>
      <p className="text-xs text-gray-500">渋谷店 / 先月(4月)の成績</p>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-gray-500">メニュー数</p>
            <p className="text-2xl font-bold">{menus.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-gray-500">月の利益</p>
            <p className="text-2xl font-bold">
              {Math.round(totalProfit / 10000)}万円
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 4-quadrant visual */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <h2 className="text-sm font-bold mb-3">4つの分類</h2>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["主役", stars],
                ["働きもの", plowhorses],
                ["隠れた優等生", puzzles],
                ["退場候補", dogs],
              ] as [TagKey, typeof menus][]
            ).map(([tag, items]) => {
              const config = tagConfig[tag];
              return (
                <div
                  key={tag}
                  className={`${config.bg} rounded-lg p-3`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <span className={`text-sm font-bold ${config.text}`}>
                      {tag}
                    </span>
                    <Badge
                      className={`text-xs ${config.bg} ${config.text} border-0`}
                    >
                      {items.length}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">{config.desc}</p>
                  <div className="mt-1">
                    {items.slice(0, 3).map((m) => (
                      <p key={m.id} className="text-xs truncate">
                        {m.name}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {dogs.length > 0 && (
        <Card className="border-0 shadow-sm bg-red-50">
          <CardContent className="p-3">
            <p className="text-sm font-bold text-red-700 mb-1">
              ⚠ この{dogs.length}つ、やめるか考えてみませんか?
            </p>
            {dogs.map((m) => (
              <div
                key={m.id}
                className="flex justify-between text-sm text-red-600 py-0.5"
              >
                <span>{m.name}</span>
                <span>
                  月{m.monthlySales}食 / 利益{formatYen(m.monthlyProfit)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Menu List */}
      <Tabs defaultValue="all">
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1 text-xs">
            ぜんぶ
          </TabsTrigger>
          <TabsTrigger value="star" className="flex-1 text-xs">
            主役
          </TabsTrigger>
          <TabsTrigger value="plow" className="flex-1 text-xs">
            働きもの
          </TabsTrigger>
          <TabsTrigger value="puzzle" className="flex-1 text-xs">
            優等生
          </TabsTrigger>
          <TabsTrigger value="dog" className="flex-1 text-xs">
            退場候補
          </TabsTrigger>
        </TabsList>

        {[
          { value: "all", items: menus },
          { value: "star", items: stars },
          { value: "plow", items: plowhorses },
          { value: "puzzle", items: puzzles },
          { value: "dog", items: dogs },
        ].map(({ value, items }) => (
          <TabsContent key={value} value={value} className="mt-3 space-y-2">
            {items.map((menu) => {
              const config = tagConfig[menu.tag];
              const margin = Math.round(
                ((menu.price - menu.cost) / menu.price) * 100
              );
              return (
                <Card key={menu.id} className="border-0 shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{menu.name}</p>
                        <Badge
                          className={`text-xs border-0 ${config.bg} ${config.text}`}
                        >
                          {menu.tag}
                        </Badge>
                      </div>
                      <span className="text-sm font-bold">
                        {formatYen(menu.price)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>原価 {formatYen(menu.cost)}</span>
                      <span>もうけ {margin}%</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>先月 {menu.monthlySales}食</span>
                      <span>利益 {formatYen(menu.monthlyProfit)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>

      <Separator />

      {/* Pricing Suggestion */}
      <div>
        <h2 className="text-sm font-bold mb-2">💰 時間帯の値段(提案)</h2>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-3">
              唐揚げ定食の値段を時間帯で変えたら?
            </p>
            <div className="space-y-2">
              {[
                { time: "ランチ (11-14時)", price: 980, current: 980, label: "いまのまま" },
                { time: "アイドル (14-17時)", price: 880, current: 980, label: "100円さげる" },
                { time: "ディナー (17-22時)", price: 1080, current: 980, label: "100円あげる" },
              ].map((slot) => (
                <div
                  key={slot.time}
                  className="flex items-center justify-between bg-gray-50 rounded-lg p-2"
                >
                  <div>
                    <p className="text-sm font-medium">{slot.time}</p>
                    <p className="text-xs text-gray-400">{slot.label}</p>
                  </div>
                  <span className="text-lg font-bold">
                    {formatYen(slot.price)}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3 bg-yellow-50 p-2 rounded">
              💡 この組み合わせなら、月の売上が約3万円ふえる見込みです
            </p>
            <div className="flex gap-2 mt-3">
              <button className="flex-1 bg-orange-500 text-white text-sm py-2 rounded-lg font-medium">
                この値段にする
              </button>
              <button className="flex-1 border border-gray-300 text-sm py-2 rounded-lg text-gray-600">
                あとで考える
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
