"use client";

import { shiftSchedule, staff } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const days = ["月", "火", "水", "木", "金", "土", "日"];
const dayDates = ["5/5", "5/6", "5/7", "5/8", "5/9", "5/10", "5/11"];

function getShiftHours(shifts: typeof shiftSchedule[0]["shifts"]) {
  let total = 0;
  for (const s of shifts) {
    if (s.start && s.end) {
      const [sh, sm] = s.start.split(":").map(Number);
      const [eh, em] = s.end.split(":").map(Number);
      total += (eh - sh) + (em - sm) / 60;
    }
  }
  return total;
}

export default function ShiftPage() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">シフトの組み方</h1>
          <p className="text-xs text-gray-500">来週 5/5〜5/11 / 渋谷店</p>
        </div>
        <Badge className="bg-yellow-100 text-yellow-700 border-0 text-xs">
          まだ確定していません
        </Badge>
      </div>

      <Card className="border-0 shadow-sm bg-red-50">
        <CardContent className="p-3">
          <p className="text-sm font-bold text-red-700">
            🙋 金曜18時〜22時、ホール1人たりません
          </p>
          <p className="text-xs text-red-600 mt-0.5">
            だれかシフトに入れるか確認してください
          </p>
        </CardContent>
      </Card>

      {/* Shift Grid */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="grid grid-cols-8 bg-gray-50 border-b border-gray-100">
            <div className="p-2 text-xs text-gray-400"></div>
            {days.map((d, i) => (
              <div
                key={d}
                className={`p-2 text-center text-xs font-medium ${
                  d === "土" || d === "日"
                    ? "text-orange-600"
                    : "text-gray-600"
                }`}
              >
                <div>{d}</div>
                <div className="text-gray-400">{dayDates[i]}</div>
              </div>
            ))}
          </div>

          {/* Rows */}
          {shiftSchedule.map((person) => {
            const hours = getShiftHours(person.shifts);
            return (
              <div
                key={person.staffId}
                className="grid grid-cols-8 border-b border-gray-50"
              >
                <div className="p-2 flex flex-col justify-center">
                  <p className="text-xs font-medium truncate">
                    {person.name.split(" ")[0]}
                  </p>
                  <p className="text-xs text-gray-400">{hours}h</p>
                </div>
                {person.shifts.map((shift, i) => (
                  <div key={i} className="p-1 flex items-center justify-center">
                    {shift.start ? (
                      <div
                        className={`w-full rounded text-center py-1 text-xs ${
                          days[i] === "金" && shift.start >= "17:00"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        <div className="leading-tight">{shift.start}</div>
                        <div className="leading-tight text-gray-400">
                          {shift.end}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-200 text-xs">ー</span>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <button className="flex-1 bg-orange-500 text-white text-sm py-2.5 rounded-lg font-medium">
          このシフトでOK
        </button>
        <button className="flex-1 border border-gray-300 text-sm py-2.5 rounded-lg font-medium text-gray-600">
          かえる
        </button>
      </div>

      <Separator />

      {/* Staff List */}
      <div>
        <h2 className="text-sm font-bold mb-2">スタッフ</h2>
        <div className="space-y-2">
          {staff
            .filter((s) => s.store === "渋谷店")
            .map((s) => (
              <Card key={s.id} className="border-0 shadow-sm">
                <CardContent className="p-3 flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-orange-100 text-orange-700 text-xs">
                      {s.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{s.name}</p>
                    <div className="flex gap-1 mt-0.5">
                      {s.skills.map((skill) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="text-xs px-1.5 py-0"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant="secondary"
                      className={`text-xs ${
                        s.type === "社員"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {s.type}
                    </Badge>
                    {s.hourlyRate && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        ¥{s.hourlyRate}/h
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>

      <Separator />

      {/* LINE Notification Preview */}
      <div>
        <h2 className="text-sm font-bold mb-2">📱 スタッフへのLINE通知</h2>
        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="p-4">
            <div className="bg-white rounded-xl p-3 shadow-sm text-sm whitespace-pre-line leading-relaxed">
              {`🗓 鈴木さんのシフトおしらせ

来週のシフトが決まりました。

月 5/5 17:00〜22:00 渋谷店
水 5/7 17:00〜22:00 渋谷店
金 5/9 17:00〜23:00 渋谷店

合計14時間 / 約¥16,800

OKなら👍を押してください
かえてほしい時は👎`}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
