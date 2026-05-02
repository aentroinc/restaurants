/**
 * GPS 取得失敗時のフォールバック階層:
 *   1. IP-based geolocation (`/api/v1/geo/ip-locate`) — 国/都市レベル (~50km)
 *   2. Wi-Fi SSID 推定 (`/api/v1/geo/wifi-fingerprint`) — 店舗が登録済みなら高精度
 *   3. 手動店舗選択 — UI 側で stores から選択
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

export interface IpLocate {
  source: "ip"
  lat: number
  lon: number
  city?: string
  country?: string
  accuracyM: number   // 通常 50_000
}

export interface WifiLocate {
  source: "wifi"
  store_id: string
  store_name: string
  confidence: number
  accuracyM: number
}

export interface ManualLocate {
  source: "manual"
  store_id: string
  store_name: string
}

export type FallbackResult = IpLocate | WifiLocate | ManualLocate

export async function ipLocate(): Promise<IpLocate | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/geo/ip-locate`, { credentials: "include" })
    if (!res.ok) return null
    const json = await res.json()
    const d = json.data || json
    if (d?.lat == null || d?.lon == null) return null
    return {
      source: "ip",
      lat: Number(d.lat),
      lon: Number(d.lon),
      city: d.city,
      country: d.country,
      accuracyM: Number(d.accuracy_m ?? 50_000),
    }
  } catch {
    return null
  }
}

export async function wifiLocate(ssids: string[]): Promise<WifiLocate | null> {
  if (!ssids.length) return null
  try {
    const res = await fetch(`${API_URL}/api/v1/geo/wifi-fingerprint`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ssids }),
    })
    if (!res.ok) return null
    const json = await res.json()
    const d = json.data || json
    if (!d?.store_id) return null
    return {
      source: "wifi",
      store_id: String(d.store_id),
      store_name: String(d.store_name || ""),
      confidence: Number(d.confidence ?? 0.5),
      accuracyM: Number(d.accuracy_m ?? 30),
    }
  } catch {
    return null
  }
}
