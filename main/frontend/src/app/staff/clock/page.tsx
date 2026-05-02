"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ScanFace, QrCode, Hash, LogIn, LogOut, Coffee, CheckCircle2 } from "lucide-react"
import { GpsClock, type GpsState } from "@/components/staff/GpsClock"
import { clockApi, staffIdentity, clockLog, type ClockEventResp } from "@/lib/staff-api"

const DEMO_STORE_ID = "11111111-1111-1111-1111-111111111111"

export default function StaffClockPage() {
  const router = useRouter()
  const params = useSearchParams()
  const [today, setToday] = useState<ClockEventResp[]>([])
  const [gps, setGps] = useState<(GpsState & { withinRadius: boolean }) | null>(null)
  const [recentOk, setRecentOk] = useState<string | null>(null)

  useEffect(() => {
    const ok = params.get("ok")
    if (ok) {
      setRecentOk(ok)
      setTimeout(() => setRecentOk(null), 3000)
    }
    clockApi.today(staffIdentity.employeeId).then(setToday).catch(() => {})
  }, [params])

  async function fire(kind: "out" | "break_start" | "break_end") {
    const empId = staffIdentity.employeeId
    let resp: ClockEventResp
    if (kind === "out") {
      resp = await clockApi.out({
        employee_id: empId, store_id: DEMO_STORE_ID,
        lat: gps?.lat, lon: gps?.lon, auth_method: "face",
      })
    } else if (kind === "break_start") {
      resp = await clockApi.breakStart({ employee_id: empId, store_id: DEMO_STORE_ID, auth_method: "face" })
    } else {
      resp = await clockApi.breakEnd({ employee_id: empId, store_id: DEMO_STORE_ID, auth_method: "face" })
    }
    if (kind === "out") {
      clockLog.add({
        id: resp.id, type: "out", at: resp.occurred_at,
        store_id: resp.store_id, employee_id: empId,
        lat: gps?.lat, lon: gps?.lon, synced: true,
      })
    }
    setToday((prev) => [...prev, resp])
  }

  const lastEvent = today[today.length - 1]
  const onShift = lastEvent && (lastEvent.event_type === "in" || lastEvent.event_type === "break_end")
  const onBreak = lastEvent && lastEvent.event_type === "break_start"

  return (
    <div className="px-4 py-5 space-y-5 max-w-md mx-auto">
      <div>
        <h1 className="text-2xl font-bold">打刻</h1>
        <p className="text-xs text-white/50 mt-1">3秒で完了。顔→検出→打刻。</p>
      </div>

      {recentOk && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center gap-2 text-sm text-emerald-200">
          <CheckCircle2 className="h-4 w-4" />
          {recentOk === "face" && "顔認証で打刻完了"}
          {recentOk === "qr" && "QRで打刻完了"}
          {recentOk === "pin" && "PINで打刻完了"}
        </div>
      )}

      <GpsClock onChange={setGps} />

      {/* Primary: face auth flow */}
      {!onShift && !onBreak && (
        <button
          onClick={() => router.push("/staff/auth/face")}
          className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white py-6 flex flex-col items-center gap-2 shadow-lg active:scale-[0.99] transition-all"
        >
          <ScanFace className="h-10 w-10" />
          <div className="text-xl font-bold">顔をかざして出勤</div>
          <div className="text-xs opacity-80">3秒で打刻完了</div>
        </button>
      )}

      {onShift && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => fire("break_start")}
            className="rounded-2xl bg-amber-500 hover:bg-amber-400 text-black py-6 flex flex-col items-center gap-1 font-bold active:scale-[0.99]"
          >
            <Coffee className="h-7 w-7" />
            休憩開始
          </button>
          <button
            onClick={() => fire("out")}
            className="rounded-2xl bg-red-500 hover:bg-red-400 text-white py-6 flex flex-col items-center gap-1 font-bold active:scale-[0.99]"
          >
            <LogOut className="h-7 w-7" />
            退勤
          </button>
        </div>
      )}

      {onBreak && (
        <button
          onClick={() => fire("break_end")}
          className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white py-6 flex items-center justify-center gap-2 font-bold active:scale-[0.99]"
        >
          <LogIn className="h-7 w-7" />
          休憩終了
        </button>
      )}

      {/* Fallback methods */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/staff/auth/qr"
          className="rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] p-4 flex flex-col items-center gap-2 text-white/80"
        >
          <QrCode className="h-6 w-6" />
          <div className="text-sm font-semibold">QRをかざす</div>
        </Link>
        <Link
          href="/staff/auth/pin"
          className="rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] p-4 flex flex-col items-center gap-2 text-white/80"
        >
          <Hash className="h-6 w-6" />
          <div className="text-sm font-semibold">PIN入力</div>
        </Link>
      </div>

      {/* Today's history */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="text-xs text-white/50 mb-3">本日の打刻</div>
        {today.length === 0 ? (
          <div className="text-sm text-white/50">まだ打刻がありません</div>
        ) : (
          <ul className="space-y-2">
            {today.map((e) => (
              <li key={e.id} className="flex items-center justify-between text-sm border-b border-white/5 pb-2 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={
                    "px-2 py-0.5 rounded text-[10px] font-bold " +
                    (e.event_type === "in" ? "bg-emerald-500/20 text-emerald-300" :
                     e.event_type === "out" ? "bg-red-500/20 text-red-300" :
                     "bg-amber-500/20 text-amber-300")
                  }>
                    {e.event_type === "in" ? "出勤" : e.event_type === "out" ? "退勤" :
                     e.event_type === "break_start" ? "休憩開始" : "休憩終了"}
                  </span>
                  <span className="text-white/70 tabular-nums">
                    {new Date(e.occurred_at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <span className="text-[10px] text-white/40">
                  {e.auth_method} {e.confidence ? `${(e.confidence * 100).toFixed(0)}%` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
