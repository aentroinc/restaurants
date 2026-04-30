"use client";

import { stores, staff } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold">設定</h1>
      <p className="text-xs text-gray-500">マスタ管理・データ連携・アカウント</p>

      {/* Store Master */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold">🏪 お店の登録</h2>
          <button className="text-xs text-orange-600 font-medium">+ 追加</button>
        </div>
        <div className="space-y-2">
          {stores.map((store) => (
            <Card key={store.id} className="border-0 shadow-sm">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{store.name}</p>
                  <p className="text-xs text-gray-400">{store.area} / {store.seats}席</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-700 border-0 text-xs">POS連携中</Badge>
                  <span className="text-gray-300">→</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* Staff Master */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold">👤 スタッフの登録</h2>
          <button className="text-xs text-orange-600 font-medium">+ 追加</button>
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{staff.length}人 登録ずみ</span>
              <button className="text-xs text-orange-600">CSVで一括登録</button>
            </div>
            <div className="space-y-1.5">
              {staff.slice(0, 4).map((s) => (
                <div key={s.id} className="flex items-center justify-between py-1 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-xs font-bold">
                      {s.avatar}
                    </div>
                    <div>
                      <p className="text-sm">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.store} / {s.type}</p>
                    </div>
                  </div>
                  <span className="text-gray-300">→</span>
                </div>
              ))}
            </div>
            <button className="text-xs text-orange-600 mt-2">ぜんぶみる →</button>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Menu Master */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold">🍽 メニューの登録</h2>
          <button className="text-xs text-orange-600 font-medium">+ 追加</button>
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <p className="text-sm text-gray-500">10メニュー 登録ずみ</p>
            <div className="flex gap-2 mt-2">
              <button className="text-xs bg-gray-100 px-3 py-1.5 rounded-lg">メニュー一覧</button>
              <button className="text-xs bg-gray-100 px-3 py-1.5 rounded-lg">食材マスタ</button>
              <button className="text-xs bg-gray-100 px-3 py-1.5 rounded-lg">レシピ登録</button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* POS Integration */}
      <div>
        <h2 className="text-sm font-bold mb-2">📡 データ連携</h2>
        <div className="space-y-2">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">スマレジ</p>
                <p className="text-xs text-gray-400">Webhook + APIで連携中</p>
              </div>
              <Badge className="bg-green-100 text-green-700 border-0 text-xs">接続OK</Badge>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Airレジ</p>
                <p className="text-xs text-gray-400">ポーリングで3分おきに取得</p>
              </div>
              <Badge className="bg-green-100 text-green-700 border-0 text-xs">接続OK</Badge>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">CSV取り込み</p>
                <p className="text-xs text-gray-400">POS連携できないお店用</p>
              </div>
              <button className="text-xs bg-orange-500 text-white px-3 py-1 rounded-lg">アップロード</button>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">天気予報API</p>
                <p className="text-xs text-gray-400">気象庁データ / 自動取得</p>
              </div>
              <Badge className="bg-green-100 text-green-700 border-0 text-xs">稼働中</Badge>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* LINE */}
      <div>
        <h2 className="text-sm font-bold mb-2">📱 LINE連携</h2>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm">LINE公式アカウント</p>
              <Badge className="bg-green-100 text-green-700 border-0 text-xs">連携ずみ</Badge>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm">LINEログイン</p>
              <Badge className="bg-green-100 text-green-700 border-0 text-xs">有効</Badge>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm">通知の送り先</p>
              <span className="text-xs text-gray-500">12人 登録ずみ</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Account */}
      <div>
        <h2 className="text-sm font-bold mb-2">👤 アカウント</h2>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm">ログイン中</p>
              <span className="text-xs text-gray-500">yamamoto@example.com</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm">権限</p>
              <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">社長 / 管理者</Badge>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm">2段階認証</p>
              <Badge className="bg-green-100 text-green-700 border-0 text-xs">有効</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="pt-2">
        <button className="w-full text-sm text-red-500 py-2">ログアウト</button>
      </div>
    </div>
  );
}
