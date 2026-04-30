"use client";

import { company, staff } from "@/lib/mock-data";

export default function SettingsPage() {
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
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">マスタ管理</p>
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
      </div>

      {/* Integrations */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">データ連携</p>
        {[
          { name: "スマレジ", detail: "Webhook + API", status: "接続OK" },
          { name: "Airレジ", detail: "3分間隔ポーリング", status: "接続OK" },
          { name: "天気予報API", detail: "気象庁", status: "稼働中" },
          { name: "CSV取り込み", detail: "フォールバック", status: "有効" },
        ].map((item) => (
          <div key={item.name} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
            <div>
              <span className="text-xs font-medium">{item.name}</span>
              <span className="text-[10px] text-slate-400 ml-1">{item.detail}</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{item.status}</span>
          </div>
        ))}
      </div>

      {/* LINE */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">LINE連携</p>
        {[
          { label: "公式アカウント", value: "連携済み" },
          { label: "LINEログイン", value: "有効" },
          { label: "通知登録者", value: "124名" },
        ].map((item) => (
          <div key={item.label} className="flex justify-between py-1.5 border-b border-slate-50 last:border-0 text-xs">
            <span className="text-slate-400">{item.label}</span>
            <span className="text-emerald-600 font-medium">{item.value}</span>
          </div>
        ))}
      </div>

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

      <button className="w-full text-xs text-red-400 py-2">ログアウト</button>
    </div>
  );
}
