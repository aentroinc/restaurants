"use client";

import { staff, weekDates, weekDow } from "@/lib/mock-data";
import { AlertTriangle, User } from "lucide-react";

export default function ShiftPage() {
  // Count staff per date
  const staffPerDate = weekDates.map((date) => {
    const count = staff.filter(s => s.slots.some(sl => sl.date === date)).length;
    const isMonday = weekDow[weekDates.indexOf(date)] === "月";
    return { date, count, isMonday };
  });

  // Find understaffed days (Friday/Saturday need 4+)
  const needsAttention = staffPerDate.filter(d => {
    const dow = weekDow[weekDates.indexOf(d.date)];
    const needed = (dow === "金" || dow === "土") ? 4 : 3;
    return !d.isMonday && d.count < needed;
  });

  return (
    <div className="px-4 pt-4 space-y-4">
      <h1 className="text-lg font-bold text-gray-900">シフト管理</h1>

      {/* Alert */}
      {needsAttention.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">人手不足の日があります</p>
            <p className="text-xs text-amber-600 mt-0.5">
              {needsAttention.map(d => `${d.date}(${weekDow[weekDates.indexOf(d.date)]}) ${d.count}名`).join("、")}
            </p>
          </div>
        </div>
      )}

      {/* Weekly grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-700">今週のシフト</span>
        </div>

        {/* Header */}
        <div className="grid grid-cols-8 border-b border-gray-100">
          <div className="px-3 py-2 text-xs text-gray-400">スタッフ</div>
          {weekDates.map((date, i) => {
            const isMonday = weekDow[i] === "月";
            const count = staffPerDate[i].count;
            const dow = weekDow[i];
            const needed = (dow === "金" || dow === "土") ? 4 : 3;
            const short = !isMonday && count < needed;
            return (
              <div key={date} className={`px-1 py-2 text-center ${isMonday ? "bg-gray-50" : ""}`}>
                <div className={`text-[10px] font-medium ${isMonday ? "text-red-300" : dow === "土" || dow === "日" ? "text-blue-500" : "text-gray-500"}`}>
                  {dow}
                </div>
                <div className="text-xs text-gray-400">{date}</div>
                {!isMonday && (
                  <div className={`text-[10px] mt-0.5 font-medium ${short ? "text-red-500" : "text-emerald-500"}`}>
                    {count}名
                  </div>
                )}
                {isMonday && <div className="text-[10px] mt-0.5 text-red-300">休</div>}
              </div>
            );
          })}
        </div>

        {/* Staff rows */}
        {staff.map((person) => (
          <div key={person.name} className="grid grid-cols-8 border-b border-gray-50 last:border-0">
            <div className="px-3 py-2.5 flex items-center gap-1.5">
              <User className="w-3 h-3 text-gray-300" />
              <div>
                <div className="text-xs text-gray-700 font-medium leading-tight">{person.name}</div>
                <div className={`text-[9px] ${person.role === "社員" ? "text-blue-500" : "text-gray-400"}`}>{person.role}</div>
              </div>
            </div>
            {weekDates.map((date, i) => {
              const slot = person.slots.find(s => s.date === date);
              const isMonday = weekDow[i] === "月";
              return (
                <div key={date} className={`px-1 py-2.5 text-center ${isMonday ? "bg-gray-50" : ""}`}>
                  {slot ? (
                    <div className="bg-blue-100 text-blue-700 rounded px-1 py-0.5">
                      <div className="text-[9px] font-medium leading-tight">{slot.start}</div>
                      <div className="text-[9px] leading-tight">{slot.end}</div>
                    </div>
                  ) : isMonday ? (
                    <div className="text-[10px] text-gray-200">-</div>
                  ) : (
                    <div className="text-[10px] text-gray-200">-</div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="text-sm font-semibold text-gray-700 mb-2">人件費の目安</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-400">今月の人件費率</div>
            <div className="kpi-value text-xl text-gray-900">28.5%</div>
            <div className="text-xs text-emerald-500 mt-0.5">目標30%以内 OK</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">今週の予定人件費</div>
            <div className="kpi-value text-xl text-gray-900">¥186,000</div>
            <div className="text-xs text-gray-400 mt-0.5">先週: ¥178,000</div>
          </div>
        </div>
      </div>
    </div>
  );
}
