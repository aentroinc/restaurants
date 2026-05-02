"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Hash, Delete, ScanFace, QrCode, Check, Lock } from "lucide-react"
import { faceAuthApi, clockApi, staffIdentity, clockLog } from "@/lib/staff-api"

const DEMO_STORE_ID = "11111111-1111-1111-1111-111111111111"

export default function PinAuthPage() {
  const router = useRouter()
  const [empId, setEmpId] = useState<string>(staffIdentity.employeeId)
  const [pin, setPin] = useState("")
  const [phase, setPhase] = useState<"input" | "verifying" | "ok" | "fail" | "locked">("input")
  const [failCount, setFailCount] = useState(0)

  function press(d: string) {
    if (phase === "locked") return
    if (pin.length < 4) {
      const next = pin + d
      setPin(next)
      if (next.length === 4) submit(next)
    }
  }
  function backspace() {
    setPin(pin.slice(0, -1))
  }

  async function submit(value: string) {
    if (!empId) {
      setPhase("fail")
      return
    }
    setPhase("verifying")
    const res = await faceAuthApi.pinVerify(empId, value)
    if (res.locked) {
      setPhase("locked")
      return
    }
    if (!res.valid) {
      setFailCount((c) => c + 1)
      setPin("")
      if (failCount + 1 >= 3) setPhase("locked")
      else setPhase("fail")
      return
    }
    const ev = await clockApi.in({
      employee_id: empId, store_id: DEMO_STORE_ID, auth_method: "pin",
    })
    clockLog.add({
      id: ev.id, type: "in", at: ev.occurred_at,
      store_id: DEMO_STORE_ID, employee_id: empId, synced: true,
    })
    setPhase("ok")
    setTimeout(() => router.push("/staff/clock?ok=pin"), 1200)
  }

  return (
    <div className="px-4 py-5 space-y-5 max-w-md mx-auto">
      <div className="flex items-center gap-2">
        <Hash className="h-6 w-6 text-emerald-400" />
        <h1 className="text-xl font-bold">PINで打刻</h1>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <label className="text-xs text-white/50">従業員ID</label>
        <input
          value={empId}
          onChange={(e) => setEmpId(e.target.value)}
          className="w-full bg-transparent border-b border-white/10 mt-1 py-1 text-sm focus:outline-none"
        />
      </div>

      {phase === "ok" ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
          <Check className="h-16 w-16 text-emerald-400 mx-auto mb-3" />
          <div className="text-2xl font-bold text-emerald-300">打刻完了</div>
        </div>
      ) : phase === "locked" ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <Lock className="h-12 w-12 text-red-400 mx-auto mb-2" />
          <div className="text-lg font-bold text-red-300">ロックされました</div>
          <div className="text-sm text-red-200/80 mt-1">3回失敗したため5分間ロックされます。店長に連絡してください。</div>
        </div>
      ) : (
        <>
          {/* PIN dots */}
          <div className="flex justify-center gap-3 py-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={
                  "h-4 w-4 rounded-full border-2 " +
                  (i < pin.length ? "bg-emerald-400 border-emerald-400" : "border-white/30")
                }
              />
            ))}
          </div>
          {phase === "fail" && (
            <div className="text-center text-sm text-amber-300">PINが違います（{failCount}/3）</div>
          )}
          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
              <button
                key={n}
                onClick={() => press(n)}
                className="aspect-square rounded-2xl bg-white/[0.06] hover:bg-white/[0.10] active:scale-95 text-2xl font-bold transition-all"
              >
                {n}
              </button>
            ))}
            <div />
            <button
              onClick={() => press("0")}
              className="aspect-square rounded-2xl bg-white/[0.06] hover:bg-white/[0.10] active:scale-95 text-2xl font-bold transition-all"
            >
              0
            </button>
            <button
              onClick={backspace}
              className="aspect-square rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all flex items-center justify-center"
            >
              <Delete className="h-6 w-6" />
            </button>
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link href="/staff/auth/face" className="rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] p-4 flex flex-col items-center gap-2 text-white/80">
          <ScanFace className="h-6 w-6" />
          <div className="text-sm font-semibold">顔認証</div>
        </Link>
        <Link href="/staff/auth/qr" className="rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] p-4 flex flex-col items-center gap-2 text-white/80">
          <QrCode className="h-6 w-6" />
          <div className="text-sm font-semibold">QR</div>
        </Link>
      </div>
    </div>
  )
}
