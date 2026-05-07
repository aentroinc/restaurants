"use client"

/**
 * Leaflet + OpenStreetMap タイル版 SV ストアマップ。
 * - 既存の StoreHeatmap.tsx は触らず、機能フラグで切替可能。
 * - SSR で leaflet が window.* を触ってクラッシュするので、useEffect 内で動的 import。
 * - タイルは public/sw.js 側の "osm-tiles" cache-first で 30日キャッシュされる。
 *
 * Props:
 *   - stores : 店舗 (lat/lon/health_score 必須)
 *   - routeStops : 訪問予定順序付き店舗 (optional, polyline で連結)
 *   - selectedId / onSelect : 既存 SV ページとの互換
 *   - height : px
 */

import { useEffect, useMemo, useRef, useState } from "react"
import "leaflet/dist/leaflet.css"
import type { SVStore } from "@/lib/sv-api"

interface Props {
  stores: SVStore[]
  routeStops?: SVStore[]
  selectedId?: string | null
  onSelect?: (storeId: string) => void
  height?: number
  startPoint?: { lat: number; lon: number; label?: string }
}

function healthColor(h: number) {
  if (h < 55) return "#ef4444"
  if (h < 70) return "#f59e0b"
  if (h < 80) return "#3b82f6"
  return "#10b981"
}

export function LeafletStoreMap({
  stores,
  routeStops,
  selectedId,
  onSelect,
  height = 400,
  startPoint,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const layerRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [offline, setOffline] = useState<boolean>(false)

  const center = useMemo<[number, number]>(() => {
    if (stores.length === 0) return [35.6812, 139.7671]
    const lats = stores.map((s) => s.lat)
    const lons = stores.map((s) => s.lon)
    return [
      (Math.min(...lats) + Math.max(...lats)) / 2,
      (Math.min(...lons) + Math.max(...lons)) / 2,
    ]
  }, [stores])

  // online/offline 監視
  useEffect(() => {
    if (typeof window === "undefined") return
    setOffline(!window.navigator.onLine)
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    return () => {
      window.removeEventListener("online", on)
      window.removeEventListener("offline", off)
    }
  }, [])

  // 1. Leaflet を動的 import (SSR 回避)
  useEffect(() => {
    let disposed = false
    ;(async () => {
      const L = (await import("leaflet")).default
      if (disposed || !containerRef.current) return
      if (mapRef.current) return

      const map = L.map(containerRef.current, {
        center,
        zoom: 12,
        preferCanvas: true,
        zoomControl: true,
      })
      mapRef.current = map

      // OSM タイル
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
        // crossOrigin にしないと SW cache が put 不可
        crossOrigin: true,
      } as any).addTo(map)

      // 自前マーカー / polyline 用レイヤ
      layerRef.current = L.layerGroup().addTo(map)
      setReady(true)
    })()
    return () => {
      disposed = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
    // center は最初の１回だけで OK (再 fitBounds は次の effect で)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 2. 店舗 / ルートを描画
  useEffect(() => {
    if (!ready || !mapRef.current || !layerRef.current) return
    ;(async () => {
      const L = (await import("leaflet")).default
      const layer = layerRef.current
      layer.clearLayers()

      // start pin
      if (startPoint) {
        const startIcon = L.divIcon({
          className: "",
          html: `<div style="background:#a855f7;color:white;padding:2px 6px;border-radius:6px;font-size:10px;font-weight:600;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);white-space:nowrap;">出発</div>`,
          iconSize: [40, 20],
          iconAnchor: [20, 10],
        })
        L.marker([startPoint.lat, startPoint.lon], { icon: startIcon })
          .bindPopup(startPoint.label || "出発地")
          .addTo(layer)
      }

      // store markers
      const bounds: [number, number][] = []
      stores.forEach((s) => {
        const c = healthColor(s.kpi.health_score)
        const isSel = selectedId === s.id
        const sz = s.kpi.health_score < 60 ? 18 : 14
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${c};border:${isSel ? 3 : 2}px solid ${isSel ? "white" : "rgba(255,255,255,0.6)"};box-shadow:0 1px 4px rgba(0,0,0,0.5);"></div>`,
          iconSize: [sz, sz],
          iconAnchor: [sz / 2, sz / 2],
        })
        const m = L.marker([s.lat, s.lon], { icon }).addTo(layer)
        m.bindPopup(`
          <div style="min-width:160px;font-size:12px;">
            <div style="font-weight:bold;margin-bottom:2px;">${escapeHtml(s.name)}</div>
            <div style="color:#666;margin-bottom:4px;">${escapeHtml(s.area_name || "")} ${escapeHtml(s.prefecture || "")}</div>
            <div>健全度: <b style="color:${c}">${s.kpi.health_score}</b></div>
            <div>FL: ${(s.kpi.fl_ratio * 100).toFixed(1)}%</div>
            <a href="/sv/visit/${s.id}" style="display:inline-block;margin-top:6px;color:#3b82f6;">訪問する →</a>
          </div>
        `)
        m.on("click", () => onSelect?.(s.id))
        bounds.push([s.lat, s.lon])
      })

      // route polyline
      if (routeStops && routeStops.length > 1) {
        const coords: [number, number][] = []
        if (startPoint) coords.push([startPoint.lat, startPoint.lon])
        routeStops.forEach((s) => coords.push([s.lat, s.lon]))
        L.polyline(coords, { color: "#3b82f6", weight: 3, opacity: 0.7, dashArray: "6 4" }).addTo(layer)
        // 順序ラベル
        routeStops.forEach((s, i) => {
          const numIcon = L.divIcon({
            className: "",
            html: `<div style="background:#3b82f6;color:white;width:18px;height:18px;border-radius:50%;border:2px solid white;font-size:10px;font-weight:bold;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.5);">${i + 1}</div>`,
            iconSize: [18, 18],
            iconAnchor: [9, -10],
          })
          L.marker([s.lat, s.lon], { icon: numIcon, interactive: false }).addTo(layer)
        })
      }

      // fit bounds
      if (bounds.length > 0) {
        if (startPoint) bounds.push([startPoint.lat, startPoint.lon])
        try {
          mapRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 })
        } catch { /* single point */ }
      }
    })()
  }, [ready, stores, routeStops, selectedId, startPoint, onSelect])

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-white/[0.06]" style={{ height }}>
      <div ref={containerRef} className="absolute inset-0" />
      {offline && (
        <div className="absolute top-2 left-2 z-[400] px-2 py-1 rounded bg-amber-500/90 text-white text-[10px] font-bold">
          オフライン (キャッシュ済タイル表示)
        </div>
      )}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-white/40 text-[12px] bg-black/20">
          地図を読み込み中…
        </div>
      )}
    </div>
  )
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
