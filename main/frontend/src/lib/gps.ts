/**
 * GPS 高精度取得 + Haversine 距離 (打刻ジオフェンス用)。
 *
 * 屋内・地下店舗での誤判定対策:
 *   - watchPosition で連続サンプリング → accuracy 最良値を採用
 *   - desiredAccuracyM (既定 50m) 達成または timeoutMs (既定 8s) で停止
 *   - SSR 安全: navigator 未定義環境では reject
 */

export interface AccuratePosition {
  lat: number
  lon: number
  accuracyM: number
  takenAt: number  // epoch ms
  samples: number
}

export interface GpsErr {
  code: "no_geolocation" | "permission_denied" | "timeout" | "position_unavailable" | "unknown"
  message: string
}

const ACC_WARN_THRESHOLD_M = 100   // 警告（屋外移動を促す）
const ACC_FALLBACK_THRESHOLD_M = 200  // フォールバック必須（Wi-Fi / 店舗QR）

export const GPS_ACC_WARN = ACC_WARN_THRESHOLD_M
export const GPS_ACC_FALLBACK = ACC_FALLBACK_THRESHOLD_M

/**
 * 連続的に位置を取得し、accuracy が desiredAccuracyM 以下になるか
 * timeoutMs を経過するまで watch する。最良 (accuracy 最小) サンプルを返す。
 */
export function getAccuratePosition(
  timeoutMs: number = 8000,
  desiredAccuracyM: number = 50,
): Promise<AccuratePosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject({ code: "no_geolocation", message: "GPS未対応端末" } as GpsErr)
      return
    }

    let best: AccuratePosition | null = null
    let samples = 0
    let watchId: number | null = null
    let settled = false

    const settle = () => {
      if (settled) return
      settled = true
      if (watchId !== null) {
        try { navigator.geolocation.clearWatch(watchId) } catch { /* ignore */ }
      }
      if (best) resolve({ ...best, samples })
      else reject({ code: "timeout", message: "位置取得がタイムアウトしました" } as GpsErr)
    }

    const timer = setTimeout(settle, timeoutMs)

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        samples += 1
        const acc = pos.coords.accuracy
        const cand: AccuratePosition = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracyM: acc,
          takenAt: pos.timestamp || Date.now(),
          samples,
        }
        if (best === null || cand.accuracyM < best.accuracyM) best = cand
        if (best && best.accuracyM <= desiredAccuracyM) {
          clearTimeout(timer)
          settle()
        }
      },
      (err) => {
        // Permission denied / unavailable は即時 reject。timeout は watch 全体タイマーに任せる。
        if (err.code === err.PERMISSION_DENIED) {
          clearTimeout(timer)
          if (!settled) {
            settled = true
            if (watchId !== null) try { navigator.geolocation.clearWatch(watchId) } catch { /* */ }
            reject({ code: "permission_denied", message: "位置情報の許可が必要です" } as GpsErr)
          }
        } else if (err.code === err.POSITION_UNAVAILABLE && best === null) {
          // best がまだ無いまま unavailable が来たらタイマーに任せる
        } else if (best === null) {
          // unknown
        }
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    )
  })
}

/**
 * Haversine 距離 (m)。負の経度・極地でも正常動作。
 */
export function haversineMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const p1 = toRad(lat1)
  const p2 = toRad(lat2)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

export function isInsideStore(
  pos: { lat: number; lon: number; accuracyM?: number },
  storeLat: number,
  storeLon: number,
  radiusM: number = 100,
): boolean {
  const d = haversineMeters(pos.lat, pos.lon, storeLat, storeLon)
  // accuracy を加味: 円が overlap していれば inside 扱い (屋内 GPS の保守的判定)
  const overlapPad = pos.accuracyM ? Math.min(pos.accuracyM, 150) : 0
  return d <= radiusM + overlapPad
}

/**
 * UI 向けの精度ヒント分類。
 */
export function classifyAccuracy(accuracyM: number): "good" | "warn" | "fallback" {
  if (accuracyM <= ACC_WARN_THRESHOLD_M) return "good"
  if (accuracyM <= ACC_FALLBACK_THRESHOLD_M) return "warn"
  return "fallback"
}
