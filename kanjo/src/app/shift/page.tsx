"use client";

import { shiftSchedule, staff } from "@/lib/mock-data";
import { useToast } from "@/components/toast";

const days = ["月", "火", "水", "木", "金", "土", "日"];

function getHours(shifts: typeof shiftSchedule[0]["shifts"]) {
  let total = 0;
  for (const s of shifts) {
    if (s.start && s.end) {
      const [sh] = s.start.split(":").map(Number);
      const [eh] = s.end.split(":").map(Number);
      total += eh - sh;
    }
  }
  return total;
}

export default function ShiftPage() {
  const { toast } = useToast();
  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-[10px] tracking-[0.15em] text-slate-400 font-medium uppercase">SHIFT</p>
        <h1 className="text-base font-bold text-slate-800 mt-0.5">シフトの組み方</h1>
        <p className="text-xs text-slate-400">来週 5/5-5/11 / 渋谷センター街店</p>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-3">
        <p className="text-xs font-bold text-red-700">金曜18-22時 ホール1人たりない</p>
        <p className="text-[10px] text-red-600">だれかシフトに入れるかたしかめて</p>
      </div>

      {/* Shift Grid */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-8 bg-slate-50 border-b border-slate-100">
          <div className="p-2" />
          {days.map((d) => (
            <div key={d} className={`p-1.5 text-center text-[10px] font-medium ${d === "土" || d === "日" ? "text-red-400" : "text-slate-500"}`}>
              {d}
            </div>
          ))}
        </div>
        {shiftSchedule.map((person) => (
          <div key={person.staffId} className="grid grid-cols-8 border-b border-slate-50">
            <div className="p-1.5 flex flex-col justify-center">
              <p className="text-[10px] font-medium truncate">{person.name.split(" ")[0]}</p>
              <p className="text-[9px] text-slate-400">{getHours(person.shifts)}h</p>
            </div>
            {person.shifts.map((shift, i) => (
              <div key={i} className="p-0.5 flex items-center justify-center">
                {shift.start ? (
                  <div className={`w-full rounded text-center py-0.5 text-[9px] ${
                    days[i] === "金" && shift.start >= "17:00" ? "bg-red-50 text-red-700 border border-red-200" : "bg-slate-50 text-slate-600"
                  }`}>
                    <div>{shift.start}</div>
                    <div className="text-slate-400">{shift.end}</div>
                  </div>
                ) : (
                  <span className="text-slate-200 text-[10px]">-</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={() => toast("シフトを確定しました ✓")} className="flex-1 bg-slate-800 text-white text-sm py-2.5 rounded-lg font-medium tap-scale">
          このシフトでOK
        </button>
        <button onClick={() => toast("編集モードに切り替えました")} className="flex-1 border border-slate-200 text-sm py-2.5 rounded-lg text-slate-600 tap-scale">
          かえる
        </button>
      </div>

      {/* Staff */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-3">スタッフ</p>
        <div className="space-y-2">
          {staff.map((s) => (
            <div key={s.id} className="flex items-center gap-3 py-1.5 border-b border-slate-50 last:border-0">
              <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600">
                {s.avatar}
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium">{s.name}</p>
                <div className="flex gap-1 mt-0.5">
                  {s.skills.map((sk) => (
                    <span key={sk} className="text-[9px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded">{sk}</span>
                  ))}
                </div>
              </div>
              <span className="text-[10px] text-slate-400">{s.type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* LINE */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-600 mb-2">スタッフへのLINE通知</p>
        <div className="bg-[#eef6ee] rounded-xl p-3 text-[13px] leading-relaxed whitespace-pre-line">
{`鈴木さん、来週のシフトです

月 5/5 17:00-22:00
水 5/7 17:00-22:00
金 5/9 17:00-23:00

合計14時間 / 約¥17,500

OKなら👍
かえたいなら👎`}
        </div>
      </div>
    </div>
  );
}
