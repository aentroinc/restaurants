"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ScanFace, QrCode, Hash, Check } from "lucide-react"
import { FaceCapture } from "@/components/auth/FaceCapture"
import { faceAuthApi, clockApi, staffIdentity, clockLog } from "@/lib/staff-api"
import { useTranslations } from "@/i18n/I18nProvider"

const DEMO_STORE_ID = "11111111-1111-1111-1111-111111111111"

export default function FaceAuthPage() {
  const router = useRouter()
  const t = useTranslations("auth")
  const [phase, setPhase] = useState<"scanning" | "verifying" | "ok" | "fail">("scanning")
  const [confidence, setConfidence] = useState<number>(0)
  const [failCount, setFailCount] = useState(0)
  const [storeLoc, setStoreLoc] = useState<{ lat?: number; lon?: number }>({})

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (p) => setStoreLoc({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 5000 },
    )
  }, [])

  async function handleEmbedding(embedding: number[]) {
    setPhase("verifying")
    try {
      const res = await faceAuthApi.verify(embedding, DEMO_STORE_ID)
      if (res.allowed && res.employee_id) {
        setConfidence(res.confidence)
        staffIdentity.setEmployeeId(res.employee_id)
        // 即時打刻
        const ev = await clockApi.in({
          employee_id: res.employee_id,
          store_id: DEMO_STORE_ID,
          lat: storeLoc.lat,
          lon: storeLoc.lon,
          auth_method: "face",
          confidence: res.confidence,
        })
        clockLog.add({
          id: ev.id, type: "in", at: ev.occurred_at,
          store_id: DEMO_STORE_ID, employee_id: res.employee_id,
          lat: storeLoc.lat, lon: storeLoc.lon, synced: true,
        })
        setPhase("ok")
        setTimeout(() => router.push("/staff/clock?ok=face"), 1200)
      } else {
        setFailCount((c) => c + 1)
        setPhase("fail")
      }
    } catch {
      setFailCount((c) => c + 1)
      setPhase("fail")
    }
  }

  const tooManyFailures = failCount >= 3

  return (
    <div className="px-4 py-5 space-y-5 max-w-md mx-auto">
      <div className="flex items-center gap-2">
        <ScanFace className="h-6 w-6 text-emerald-400" />
        <h1 className="text-xl font-bold">{t("faceTitle")}</h1>
      </div>

      {phase === "ok" ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
          <Check className="h-16 w-16 text-emerald-400 mx-auto mb-3" />
          <div className="text-2xl font-bold text-emerald-300">{t("doneTitle")}</div>
          <div className="text-sm text-emerald-200/80 mt-2">{t("confidence", { value: (confidence * 100).toFixed(1) })}</div>
        </div>
      ) : (
        <FaceCapture onEmbedding={handleEmbedding} autoCapture />
      )}

      {phase === "verifying" && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center text-sm text-white/80">
          {t("faceVerifying")}
        </div>
      )}

      {phase === "fail" && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          {t("faceFail", { count: failCount })}
        </div>
      )}

      {/* Fallback */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/staff/auth/qr"
          className={
            "rounded-xl border p-4 flex flex-col items-center gap-2 " +
            (tooManyFailures
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]")
          }
        >
          <QrCode className="h-6 w-6" />
          <div className="text-sm font-semibold">{t("switchToQr")}</div>
        </Link>
        <Link
          href="/staff/auth/pin"
          className="rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] p-4 flex flex-col items-center gap-2 text-white/80"
        >
          <Hash className="h-6 w-6" />
          <div className="text-sm font-semibold">{t("switchToPin")}</div>
        </Link>
      </div>
    </div>
  )
}
