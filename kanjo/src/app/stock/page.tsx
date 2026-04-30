"use client";

import { ingredients, purchaseOrders } from "@/lib/mock-data";

function yen(n: number) { return `¥${n.toLocaleString()}`; }

export default function StockPage() {
  const lowStock = ingredients.filter((i) => i.currentStock / i.requiredToday < 0.5);

  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-[10px] tracking-[0.15em] text-slate-400 font-medium uppercase">INVENTORY</p>
        <h1 className="text-base font-bold text-slate-800 mt-0.5">のこりの食材</h1>
        <p className="text-xs text-slate-400">渋谷センター街店 / 15:30現在</p>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-xs font-bold text-red-700 mb-1">のこり少ない</p>
          {lowStock.map((item) => (
            <p key={item.id} className="text-xs text-red-600">
              {item.name}: あと{item.currentStock}{item.unit} (今日{item.requiredToday}{item.unit}つかう)
            </p>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">食材リスト</p>
        <div className="space-y-3">
          {ingredients.map((item) => {
            const ratio = item.currentStock / item.requiredToday;
            const color = ratio <= 0.3 ? "bg-red-400" : ratio <= 0.6 ? "bg-amber-400" : "bg-emerald-500";
            const label = ratio <= 0.3 ? "text-red-600" : ratio <= 0.6 ? "text-amber-600" : "text-emerald-600";
            return (
              <div key={item.id}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-xs font-medium">{item.name}</span>
                    <span className="text-[10px] text-slate-400 ml-1">{item.supplier}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs kpi-value">{item.currentStock}</span>
                    <span className="text-[10px] text-slate-400">/{item.requiredToday}{item.unit}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(ratio * 100, 100)}%` }} />
                </div>
                <p className={`text-[10px] mt-0.5 ${label}`}>
                  {ratio <= 0.3 ? "すぐ仕入れて" : ratio <= 0.6 ? "そろそろ注文" : "だいじょうぶ"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">仕入れ注文</p>
        <div className="space-y-3">
          {purchaseOrders.map((order) => (
            <div key={order.id} className="border border-slate-100 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs font-medium">{order.supplier}</p>
                  <p className="text-[10px] text-slate-400">{order.deadline}までに注文</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  order.status === "確認待ち" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}>
                  {order.status}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 space-y-0.5 mb-2">
                {order.items.map((item, i) => <p key={i}>{item}</p>)}
              </div>
              <div className="flex items-center justify-between border-t border-slate-50 pt-2">
                <span className="text-xs kpi-value">{yen(order.total)}</span>
                {order.status === "確認待ち" && (
                  <button className="bg-slate-800 text-white text-xs px-4 py-1.5 rounded-lg active:bg-slate-700">
                    注文する
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
