"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { QrCode, ScanFace, Hash, Check, Loader2 } from "lucide-react"
import { faceAuthApi, clockApi, staffIdentity, clockLog } from "@/lib/staff-api"
import { useTranslations } from "@/i18n/I18nProvider"

const DEMO_STORE_ID = "11111111-1111-1111-1111-111111111111"

export default function QrAuthPage() {
  const router = useRouter()
  const t = useTranslations("auth")
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [phase, setPhase] = useState<"scanning" | "verifying" | "ok" | "fail">("scanning")
  const [manualToken, setManualToken] = useState("")

  useEffect(() => {
    let cancelled = false
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }, audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        // BarcodeDetector は Chrome / Edge / Safari 17+ サポート
        const Detector = (window as any).BarcodeDetector
        if (!Detector) return
        const detector = new Detector({ formats: ["qr_code"] })
        while (!cancelled && phase === "scanning" && videoRef.current) {
          try {
            const codes = await detector.detect(videoRef.current)
            if (codes && codes.length > 0) {
              const raw = codes[0].rawValue as string
              await verifyToken(raw)
              return
            }
          } catch {
            // ignore
          }
          await new Promise((r) => setTimeout(r, 300))
        }
      } catch {
        // camera unavailable — manual token input still works
      }
    }
    start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function verifyToken(token: string) {
    setPhase("verifying")
    const res = await faceAuthApi.qrVerify(token)
    if (!res.valid || !res.employee_id) {
      setPhase("fail")
      return
    }
    staffIdentity.setEmployeeId(res.employee_id)
    const ev = await clockApi.in({
      employee_id: res.employee_id,
      store_id: res.store_id || DEMO_STORE_ID,
      auth_method: "qr",
    })
    clockLog.add({
      id: ev.id, type: "in", at: ev.occurred_at,
      store_id: ev.store_id, employee_id: res.employee_id, synced: true,
    })
    setPhase("ok")
    setTimeout(() => router.push("/staff/clock?ok=qr"), 1200)
  }

  return (
    <div className="px-4 py-5 space-y-5 max-w-md mx-auto">
      <div className="flex items-center gap-2">
        <QrCode className="h-6 w-6 text-emerald-400" />
        <h1 className="text-xl font-bold">{t("qrTitle")}</h1>
      </div>

      {phase === "ok" ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
          <Check className="h-16 w-16 text-emerald-400 mx-auto mb-3" />
          <div className="text-2xl font-bold text-emerald-300">{t("doneTitle")}</div>
        </div>
      ) : (
        <div className="relative aspect-square bg-black rounded-2xl overflow-hidden">
          <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
          <div className="absolute inset-8 border-2 border-emerald-400/60 rounded-xl pointer-events-none" />
          <div className="absolute bottom-3 left-3 right-3 text-center text-xs text-white/80 bg-black/40 rounded-md py-1.5">
            {phase === "scanning" && t("qrFrameHint")}
            {phase === "verifying" && (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />{t("faceVerifying")}
              </span>
            )}
            {phase === "fail" && t("qrFail")}
          </div>
        </div>
      )}

      {/* Manual token input fallback */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
        <div className="text-xs text-white/50">{t("qrManualLabel")}</div>
        <div className="flex gap-2">
          <input
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            placeholder={t("qrManualPlaceholder")}
            className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm"
          />
          <button
            onClick={() => manualToken && verifyToken(manualToken)}
            className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold"
          >
            {t("qrSend")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/staff/auth/face" className="rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] p-4 flex flex-col items-center gap-2 text-white/80">
          <ScanFace className="h-6 w-6" />
          <div className="text-sm font-semibold">{t("switchToFace")}</div>
        </Link>
        <Link href="/staff/auth/pin" className="rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] p-4 flex flex-col items-center gap-2 text-white/80">
          <Hash className="h-6 w-6" />
          <div className="text-sm font-semibold">{t("switchToPin")}</div>
        </Link>
      </div>
    </div>
  )
}
