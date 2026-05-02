"use client"

import { useEffect, useState } from "react"
import { MapPin, Loader2, Check, X } from "lucide-react"

export interface GpsState {
  status: "idle" | "loading" | "ok" | "error"
  lat?: number
  lon?: number
  accuracy?: number
  error?: string
}

interface Props {
  storeLat?: number
  storeLon?: number
  radiusMeters?: number
  onChange?: (s: GpsState & { withinRadius: boolean }) => void
  autoStart?: boolean
}

function distMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lon - a.lon) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(x))
}

export function GpsClock({
  storeLat = 35.6812,
  storeLon = 139.7671,
  radiusMeters = 200,
  onChange,
  autoStart = true,
}: Props) {
  const [state, setState] = useState<GpsState>({ status: "idle" })

  function fetchPosition() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      const next: GpsState = { status: "error", error: "GPS未対応端末" }
      setState(next)
      onChange?.({ ...next, withinRadius: false })
      return
    }
    setState({ status: "loading" })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next: GpsState = {
          status: "ok",
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }
        const within =
          distMeters({ lat: pos.coords.latitude, lon: pos.coords.longitude }, { lat: storeLat, lon: storeLon }) <=
          radiusMeters
        setState(next)
        onChange?.({ ...next, withinRadius: within })
      },
      (err) => {
        const next: GpsState = { status: "error", error: err.message }
        setState(next)
        onChange?.({ ...next, withinRadius: false })
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    )
  }

  useEffect(() => {
    if (autoStart) fetchPosition()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const within =
    state.status === "ok" && state.lat != null && state.lon != null
      ? distMeters({ lat: state.lat, lon: state.lon }, { lat: storeLat, lon: storeLon }) <= radiusMeters
      : false

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex items-center gap-3">
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
        {state.status === "loading" && <div className="text-white/80">位置情報を取得中...</div>}
        {state.status === "ok" && within && (
          <div className="text-emerald-300 font-medium">店舗近く（{state.accuracy?.toFixed(0)}m精度）</div>
        )}
        {state.status === "ok" && !within && (
          <div className="text-amber-300 font-medium">店舗から離れています</div>
        )}
        {state.status === "error" && (
          <div className="text-red-300">GPSエラー: {state.error}</div>
        )}
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
  )
}
