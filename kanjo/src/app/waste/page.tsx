"use client";

import { stores } from "@/lib/mock-data";
import { useRole } from "@/lib/role-context";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

function formatYen(n: number) {
  return `¥${n.toLocaleString()}`;
}

const wasteDetails = [
  { category: "野菜", amount: 82000, reason: "仕入れすぎ", trend: "down" as const, reduced: 15000 },
  { category: "肉", amount: 145000, reason: "解凍してつかわなかった", trend: "up" as const, reduced: -8000 },
  { category: "魚", amount: 68000, reason: "鮮度で廃棄", trend: "down" as const, reduced: 22000 },
  { category: "ごはん・麺", amount: 42000, reason: "炊きすぎ", trend: "down" as const, reduced: 12000 },
  { category: "調味料", amount: 18000, reason: "期限切れ", trend: "flat" as const, reduced: 0 },
  { category: "デザート", amount: 35000, reason: "仕込みすぎ", trend: "up" as const, reduced: -5000 },
];

const monthlyWaste = [
  { month: "11月", amount: 520000 },
  { month: "12月", amount: 480000 },
  { month: "1月", amount: 440000 },
  { month: "2月", amount: 410000 },
  { month: "3月", amount: 385000 },
  { month: "4月", amount: 360000 },
];

export default function WastePage() {
  const { role } = useRole();
  const totalWaste = stores.reduce((s, st) => s + st.wasteAmount, 0);
  const totalReduction = stores.reduce((s, st) => s + st.wasteReduction, 0);
  const isOwner = role === "owner";

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold">
        {isOwner ? "食材ロス管理" : "もったいない見える化"}
      </h1>
      <p className="text-xs text-gray-500">
        {isOwner ? "全店舗 / 4月度実績" : "城西エリア / 4月のようす"}
      </p>

      {/* Big Impact Number */}
      <Card className="border-0 shadow-sm bg-green-50">
        <CardContent className="p-4">
          <p className="text-xs text-green-700">
            {isOwner ? "Kanjo導入からの累計ロス削減額" : "いままでに減らせたムダ"}
          </p>
          <p className="text-4xl font-bold text-green-700 tracking-tight">
            ▼ ¥482,000<span className="text-lg">/月</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {isOwner
              ? "年間換算: 約578万円のコスト改善効果"
              : "まいつき48万円ぶん、ムダがへってるよ 🎉"}
          </p>
        </CardContent>
      </Card>

      {/* This Month's Waste */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <h2 className="text-sm font-bold mb-3">
            {isOwner ? "今月の食材ロス内訳" : "なにがもったいなかった?"}
          </h2>
          <div className="space-y-2">
            {wasteDetails.map((item) => (
              <div key={item.category} className="flex items-center justify-between py-1 border-b border-gray-50">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{item.category}</span>
                    <Badge className={`text-xs border-0 ${
                      item.trend === "down" ? "bg-green-100 text-green-700" :
                      item.trend === "up" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      {item.trend === "down" ? "へってる ↓" : item.trend === "up" ? "ふえてる ↑" : "かわらない"}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400">
                    {isOwner ? `主因: ${item.reason}` : `→ ${item.reason}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{formatYen(item.amount)}</p>
                  <p className={`text-xs ${item.reduced >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {item.reduced >= 0 ? `▼${formatYen(item.reduced)}` : `▲${formatYen(Math.abs(item.reduced))}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Per-store waste */}
      <div>
        <h2 className="text-sm font-bold mb-2">
          {isOwner ? "店舗別ロス額" : "お店ごとのムダ"}
        </h2>
        <div className="space-y-2">
          {stores.map((store) => {
            const maxWaste = Math.max(...stores.map((s) => s.wasteAmount));
            return (
              <Card key={store.id} className="border-0 shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{store.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{formatYen(store.wasteAmount)}</span>
                      <span className={`text-xs ${store.wasteReduction >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {store.wasteReduction >= 0 ? "◎" : "✕"}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${store.wasteReduction >= 0 ? "bg-green-400" : "bg-red-400"}`}
                      style={{ width: `${(store.wasteAmount / maxWaste) * 100}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Trend */}
      <div>
        <h2 className="text-sm font-bold mb-2">
          {isOwner ? "月次ロス推移" : "ムダはだんだんへってる!"}
        </h2>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            {monthlyWaste.map((m) => (
              <div key={m.month} className="flex items-center gap-2 mb-1.5">
                <span className="text-xs text-gray-500 w-8">{m.month}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-4">
                  <div
                    className="bg-red-300 h-4 rounded-full"
                    style={{ width: `${(m.amount / 520000) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium w-14 text-right">{formatYen(m.amount)}</span>
              </div>
            ))}
            <p className="text-xs text-gray-500 mt-2 bg-green-50 p-2 rounded">
              {isOwner
                ? "💡 11月比で30%改善。野菜・魚カテゴリの需要予測精度向上が寄与"
                : "💡 半年で30%ぐらいへった！ 野菜とお魚の仕入れが上手になってきた"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* LINE - the retention message */}
      <div>
        <h2 className="text-sm font-bold mb-2">📱 毎月とどくLINE</h2>
        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">月初にとどく</p>
            <div className="bg-white rounded-xl p-3 shadow-sm text-sm whitespace-pre-line leading-relaxed">
{isOwner
  ? `📊 山本社長、4月のロスレポートです

全6店舗 食材ロス合計: ¥1,003,000
前月比: ▼¥126,000 (-11.2%)
導入前比: ▼¥482,000/月 (-32.5%)

改善進捗
◎ 新宿店: 月98,000(▼52,000)
△ 渋谷店: 月142,000(▼38,000)
✕ 赤羽店: 月245,000(▲8,000)

年間削減効果: 約578万円

👉 店舗別の改善施策をみる`
  : `📋 中村さん、4月のムダまとめです

城西エリア 4店舗あわせて
ムダの金額: ¥543,000

先月よりこれだけ減らせた 🎉
→ ¥96,000ぶん!

◎ 新宿店 → すごくがんばった
△ 渋谷店 → いい感じ
✕ 立川店 → 肉のムダが増えてる

来月やること
→ 立川店に仕入れの見直しを伝える

👉 くわしくみる`}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
