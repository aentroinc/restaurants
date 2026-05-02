"use client"

import { useEffect, useState } from "react"
import { MapPin, Loader2, Check, X, Wifi, QrCode, AlertTriangle } from "lucide-react"
import {
  getAccuratePosition,
  haversineMeters,
  classifyAccuracy,
  GPS_ACC_WARN,
  GPS_ACC_FALLBACK,
  type AccuratePosition,
} from "@/lib/gps"
import { ipLocate } from "@/lib/gps-fallback"

export interface GpsState {
  status: "idle" | "loading" | "ok" | "error"
  lat?: number
  lon?: number
  accuracy?: number
  samples?: number
  error?: string
  fallbackUsed?: "ip" | "wifi" | "manual" | null
}

interface Props {
  storeLat?: number
  storeLon?: number
  radiusMeters?: number
  onChange?: (s: GpsState & { withinRadius: boolean; accuracyClass: "good" | "warn" | "fallback" | "unknown" }) => void
  autoStart?: boolean
}

export function GpsClock({
  storeLat = 35.6812,
  storeLon = 139.7671,
  radiusMeters = 200,
  onChange,
  autoStart = true,
}: Props) {
  const [state, setState] = useState<GpsState>({ status: "idle" })

  function emit(next: GpsState, within: boolean) {
    const cls = next.accuracy != null ? classifyAccuracy(next.accuracy) : "unknown"
    setState(next)
    onChange?.({ ...next, withinRadius: within, accuracyClass: cls })
  }

  async function fetchPosition() {
    setState({ status: "loading" })
    try {
      const pos: AccuratePosition = await getAccuratePosition(8000, 50)
      const within = haversineMeters(pos.lat, pos.lon, storeLat, storeLon) <= radiusMeters + Math.min(pos.accuracyM, 150)
      emit(
        {
          status: "ok",
          lat: pos.lat,
          lon: pos.lon,
          accuracy: pos.accuracyM,
          samples: pos.samples,
          fallbackUsed: null,
        },
        within,
      )
    } catch (err: any) {
      // GPS 失敗 → IP locate を試す
      const ip = await ipLocate()
      if (ip) {
        emit(
          {
            status: "ok",
            lat: ip.lat,
            lon: ip.lon,
            accuracy: ip.accuracyM,
            fallbackUsed: "ip",
          },
          false, // IP 精度ではジオフェンス判定はしない
        )
      } else {
        emit({ status: "error", error: err?.message || "GPSエラー", fallbackUsed: null }, false)
      }
    }
  }

  useEffect(() => {
    if (autoStart) fetchPosition()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const within =
    state.status === "ok" && state.lat != null && state.lon != null && state.fallbackUsed == null
      ? haversineMeters(state.lat, state.lon, storeLat, storeLon) <= radiusMeters + Math.min(state.accuracy ?? 0, 150)
      : false

  const accClass = state.accuracy != null ? classifyAccuracy(state.accuracy) : "unknown"
  const needWarn = accClass === "warn"
  const needFallback = accClass === "fallback" || state.fallbackUsed === "ip"

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="shrink-0">
          {state.status === "loading" ? (
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          ) : state.status === "ok" && within ? (
            <Check className="h-6 w-6 text-emerald-400" />
          ) : state.status === "ok" && !within ? (
            <X className="h-6 w-6 text-amber-400" />
          ) : state.status === "error" ? (
            <X className="h-6 w-6 text-red-400" />
          ) : (
            <MapPin className="h-6 w-6 text-white/60" />
          )}
        </div>
        <div className="flex-1 text-sm">
          {state.status === "loading" && <div className="text-white/80">位置情報を取得中…（最良値選択）</div>}
          {state.status === "ok" && within && (
            <div className="text-emerald-300 font-medium">
              店舗近く（精度 {state.accuracy?.toFixed(0)}m / {state.samples ?? 1}サンプル）
            </div>
          )}
          {state.status === "ok" && !within && state.fallbackUsed === "ip" && (
            <div className="text-amber-300 font-medium">IP位置のみ取得（GPS不可）— 店舗QRをご利用ください</div>
          )}
          {state.status === "ok" && !within && state.fallbackUsed !== "ip" && (
            <div className="text-amber-300 font-medium">
              店舗から離れています（精度 {state.accuracy?.toFixed(0)}m）
            </div>
          )}
          {state.status === "error" && <div className="text-red-300">GPSエラー: {state.error}</div>}
          {state.status === "idle" && <div className="text-white/60">GPS待機中</div>}
        </div>
        <button
          type="button"
          onClick={fetchPosition}
          className="text-xs px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 text-white"
        >
          再取得
        </button>
      </div>

      {/* 精度警告 */}
      {state.status === "ok" && needWarn && !needFallback && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-amber-500/[0.08] border border-amber-400/20 text-amber-300 text-[12px]">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>GPS精度が低いです（{state.accuracy?.toFixed(0)}m &gt; {GPS_ACC_WARN}m）。屋外に移動してください。</span>
        </div>
      )}

      {/* フォールバック誘導 */}
      {state.status === "ok" && needFallback && (
        <div className="px-3 py-2 rounded-md bg-red-500/[0.08] border border-red-400/20 text-red-300 text-[12px] space-y-1">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>GPS精度が著しく低いです（{state.accuracy?.toFixed(0)}m &gt; {GPS_ACC_FALLBACK}m）。下記いずれかをお試しください:</span>
          </div>
          <ul className="ml-6 space-y-0.5 text-white/70">
            <li className="flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5" />店舗 Wi-Fi に接続</li>
            <li className="flex items-center gap-1.5"><QrCode className="w-3.5 h-3.5" />店舗 QR コードを読み取り</li>
          </ul>
        </div>
      )}
    </div>
  )
}
