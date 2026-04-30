"use client";

import { notifications, lineMessages } from "@/lib/mock-data";
import Link from "next/link";

const typeStyle: Record<string, { bg: string }> = {
  forecast: { bg: "bg-blue-50" },
  stock: { bg: "bg-amber-50" },
  sales: { bg: "bg-emerald-50" },
  staff: { bg: "bg-red-50" },
  waste: { bg: "bg-orange-50" },
};

export default function NotificationsPage() {
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="text-slate-400 text-xs">← もどる</Link>
      </div>

      <div>
        <p className="text-[10px] tracking-[0.15em] text-slate-400 font-medium uppercase">NOTIFICATIONS</p>
        <div className="flex items-center gap-2 mt-0.5">
          <h1 className="text-base font-bold text-slate-800">おしらせ</h1>
          {unread > 0 && (
            <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded-full">{unread}</span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {notifications.map((notif) => {
          const style = typeStyle[notif.type] || { bg: "bg-slate-50" };
          return (
            <div key={notif.id} className={`rounded-xl p-3 ${!notif.read ? style.bg : "bg-white"} shadow-sm`}>
              <div className="flex items-center justify-between mb-0.5">
                <p className={`text-xs ${!notif.read ? "font-bold" : "text-slate-500"}`}>{notif.title}</p>
                <span className="text-[10px] text-slate-400">{notif.time}</span>
              </div>
              <p className="text-[11px] text-slate-500">{notif.body}</p>
            </div>
          );
        })}
      </div>

      <div>
        <p className="text-xs font-bold text-slate-600 mb-2">LINEで届くおしらせ</p>
        <div className="space-y-3">
          {lineMessages.map((msg, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-[10px] text-slate-400 mb-2">{msg.time} に届く</p>
              <div className="bg-[#eef6ee] rounded-xl p-3 text-[13px] leading-relaxed whitespace-pre-line">
                {msg.content}
              </div>
              <button className="mt-2 w-full bg-slate-800 text-white rounded-lg py-2 text-xs font-medium active:bg-slate-700">
                {msg.button} →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
