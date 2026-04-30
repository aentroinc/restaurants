"use client";

import { company, staff } from "@/lib/mock-data";
import { useToast } from "@/components/toast";
import { Expandable } from "@/components/expandable";

export default function SettingsPage() {
  const { toast } = useToast();

  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-[10px] tracking-[0.15em] text-slate-400 font-medium uppercase">SETTINGS</p>
        <h1 className="text-base font-bold text-slate-800 mt-0.5">設定</h1>
      </div>

      {/* Company */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">企業情報</p>
        {[
          { label: "企業名", value: company.name },
          { label: "ブランド", value: company.brand },
          { label: "店舗数", value: `${company.totalStores}店舗` },
          { label: "エリア", value: company.areas.join("・") },
        ].map((item) => (
          <div key={item.label} className="flex justify-between py-1.5 border-b border-slate-50 last:border-0 text-xs">
            <span className="text-slate-400">{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>

      {/* Masters */}
      <Expandable title="マスタ管理" defaultOpen>
        {[
          { label: "店舗マスタ", count: "48店舗", status: "ok" },
          { label: "メニューマスタ", count: "10メニュー", status: "ok" },
          { label: "食材マスタ", count: "86食材", status: "ok" },
          { label: "レシピマスタ", count: "42レシピ", status: "warn" },
          { label: "スタッフ", count: `${staff.length * 10}名`, status: "ok" },
          { label: "仕入先", count: "12業者", status: "ok" },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
            <span className="text-xs">{item.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">{item.count}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${item.status === "ok" ? "bg-emerald-500" : "bg-amber-400"}`} />
              <span className="text-slate-300 text-xs">→</span>
            </div>
          </div>
        ))}
      </Expandable>

      {/* POS Integration - detailed */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">POS連携</p>

        {/* Smaregi - the main one */}
        <div className="border border-emerald-200 bg-emerald-50/50 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-xs font-bold text-emerald-700">SR</span>
              </div>
              <div>
                <p className="text-xs font-bold">スマレジ</p>
                <p className="text-[10px] text-slate-400">メインPOS</p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium">
              ✓ 連携済み
            </span>
          </div>
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between py-1 border-b border-emerald-100">
              <span className="text-slate-500">接続方式</span>
              <span className="text-slate-700">Webhook + REST API</span>
            </div>
            <div className="flex justify-between py-1 border-b border-emerald-100">
              <span className="text-slate-500">対象店舗</span>
              <span className="text-slate-700">38店舗 / 48店舗</span>
            </div>
            <div className="flex justify-between py-1 border-b border-emerald-100">
              <span className="text-slate-500">データ遅延</span>
              <span className="text-emerald-600 font-medium">リアルタイム (平均2.3秒)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-emerald-100">
              <span className="text-slate-500">最終同期</span>
              <span className="text-slate-700">15:29:42</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">今月の同期件数</span>
              <span className="kpi-value text-slate-700">142,380件</span>
            </div>
          </div>
          <button
            onClick={() => toast("スマレジとの同期を確認しました ✓")}
            className="mt-2 w-full text-[10px] text-emerald-700 border border-emerald-200 py-1.5 rounded-lg tap-scale"
          >
            接続テスト
          </button>
        </div>

        {/* Other POS */}
        <div className="space-y-2">
          {[
            { name: "Airレジ", icon: "AR", stores: "8店舗", method: "ポーリング (3分間隔)", delay: "平均3分", status: "ok" },
            { name: "Square", icon: "SQ", stores: "2店舗", method: "REST API", delay: "平均5分", status: "ok" },
          ].map((pos) => (
            <div key={pos.name} className="border border-slate-100 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-slate-100 rounded flex items-center justify-center">
                    <span className="text-[9px] font-bold text-slate-500">{pos.icon}</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium">{pos.name}</p>
                    <p className="text-[10px] text-slate-400">{pos.stores} / {pos.method}</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">✓ 接続OK</span>
              </div>
            </div>
          ))}

          <div className="border border-dashed border-slate-200 rounded-lg p-3 text-center">
            <button
              onClick={() => toast("POS連携ウィザードを開きます")}
              className="text-xs text-slate-400 tap-scale"
            >
              + 新しいPOSを連携する
            </button>
          </div>
        </div>
      </div>

      {/* Other integrations */}
      <Expandable title="外部データ連携" defaultOpen={false}>
        {[
          { name: "天気予報API", detail: "気象庁データ / 自動取得", status: "稼働中" },
          { name: "Google口コミ", detail: "Business Profile API", status: "連携済み" },
          { name: "UberEats", detail: "売上データ連携", status: "連携済み" },
          { name: "出前館", detail: "売上データ連携", status: "連携済み" },
          { name: "CSV取り込み", detail: "手動アップロード", status: "有効" },
        ].map((item) => (
          <div key={item.name} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
            <div>
              <span className="text-xs font-medium">{item.name}</span>
              <span className="text-[10px] text-slate-400 ml-1">{item.detail}</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{item.status}</span>
          </div>
        ))}
      </Expandable>

      {/* LINE */}
      <Expandable title="LINE連携" defaultOpen={false}>
        {[
          { label: "公式アカウント", value: "連携済み" },
          { label: "LINEログイン", value: "有効" },
          { label: "通知登録者", value: "124名" },
          { label: "Messaging API", value: "有効" },
          { label: "LIFF", value: "設定済み" },
        ].map((item) => (
          <div key={item.label} className="flex justify-between py-1.5 border-b border-slate-50 last:border-0 text-xs">
            <span className="text-slate-400">{item.label}</span>
            <span className="text-emerald-600 font-medium">{item.value}</span>
          </div>
        ))}
        <button
          onClick={() => toast("LINE通知テストを送信しました ✓")}
          className="mt-2 w-full text-[10px] text-slate-600 border border-slate-200 py-1.5 rounded-lg tap-scale"
        >
          テスト通知を送る
        </button>
      </Expandable>

      {/* Account */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">アカウント</p>
        <div className="flex justify-between py-1.5 text-xs border-b border-slate-50">
          <span className="text-slate-400">メール</span>
          <span>yamamoto@cocospice.co.jp</span>
        </div>
        <div className="flex justify-between py-1.5 text-xs border-b border-slate-50">
          <span className="text-slate-400">権限</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">管理者</span>
        </div>
        <div className="flex justify-between py-1.5 text-xs">
          <span className="text-slate-400">2段階認証</span>
          <span className="text-emerald-600">有効</span>
        </div>
      </div>

      <button onClick={() => toast("ログアウトしました")} className="w-full text-xs text-red-400 py-2 tap-scale">ログアウト</button>
    </div>
  );
}
