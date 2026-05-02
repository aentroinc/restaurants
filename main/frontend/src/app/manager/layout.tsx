"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BottomTabBar } from "@/components/manager/BottomTabBar"
import { managerOffline } from "@/lib/manager-offline"
import { Wifi, WifiOff, RefreshCw, ArrowLeft } from "lucide-react"

const titles: Record<string, string> = {
  "/manager": "AENTRO 店長",
  "/manager/daily-report": "日報",
  "/manager/waste": "廃棄記録",
  "/manager/complaint": "クレーム記録",
  "/manager/equipment": "設備故障",
  "/manager/shift": "シフト承認",
  "/manager/evaluation": "スタッフ評価",
  "/manager/settings": "設定",
}

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ""
  const [online, setOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [storeId, setStoreId] = useState<string>("")

  useEffect(() => {
    if (typeof navigator !== "undefined") setOnline(navigator.onLine)
    const onLine = () => setOnline(true)
    const offLine = () => setOnline(false)
    window.addEventListener("online", onLine)
    window.addEventListener("offline", offLine)
    return () => {
      window.removeEventListener("online", onLine)
      window.removeEventListener("offline", offLine)
    }
  }, [])

  // Swap PWA manifest to manager-specific while inside /manager.
  useEffect(() => {
    if (typeof document === "undefined") return
    const existing = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null
    const previous = existing?.getAttribute("href") || null
    if (existing) existing.setAttribute("href", "/manager-manifest.json")
    else {
      const link = document.createElement("link")
      link.rel = "manifest"
      link.href = "/manager-manifest.json"
      link.dataset.managerInjected = "1"
      document.head.appendChild(link)
    }
    const themeMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null
    const previousTheme = themeMeta?.getAttribute("content") || null
    if (themeMeta) themeMeta.setAttribute("content", "#10b981")
    return () => {
      if (existing && previous) existing.setAttribute("href", previous)
      else {
        document.querySelector('link[data-manager-injected="1"]')?.remove()
      }
      if (themeMeta && previousTheme) themeMeta.setAttribute("content", previousTheme)
    }
  }, [])

  useEffect(() => {
    // Fake auth via ?role=manager&store=...
    if (typeof window === "undefined") return
    const qs = new URLSearchParams(window.location.search)
    const qStore = qs.get("store")
    const stored = localStorage.getItem("manager.store_id")
    const sid = qStore || stored || "S-1001"
    if (sid !== stored) localStorage.setItem("manager.store_id", sid)
    setStoreId(sid)
    const role = qs.get("role")
    if (role) localStorage.setItem("manager.role", role)
  }, [pathname])

  useEffect(() => {
    let alive = true
    const refresh = async () => {
      const list = await managerOffline.list()
      if (alive) setPendingCount(list.length)
    }
    refresh()
    const t = setInterval(refresh, 5000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  async function manualSync() {
    setSyncing(true)
    try {
      await managerOffline.sync()
      const list = await managerOffline.list()
      setPendingCount(list.length)
    } finally {
      setSyncing(false)
    }
  }

  const title = titles[pathname] || "AENTRO 店長"
  const isHome = pathname === "/manager"

  return (
    <div className="min-h-screen bg-[#0a0e14] text-white/85 flex flex-col">
      <header className="sticky top-0 z-30 bg-[#0a0e14]/95 backdrop-blur border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center gap-3">
          {!isHome && (
            <Link
              href="/manager"
              className="-ml-2 p-2 text-white/60 hover:text-white"
              aria-label="ホームに戻る"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <h1 className="text-base font-semibold tracking-tight truncate flex-1">{title}</h1>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={manualSync}
                disabled={syncing}
                className="flex items-center gap-1 px-2 py-1 rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-300 text-[11px]"
              >
                <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
                <span>{pendingCount}件 未送信</span>
              </button>
            )}
            <span
              className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-md ${
                online ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10"
              }`}
              title={online ? "オンライン" : "オフライン"}
            >
              {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span className="hidden sm:inline">{online ? "オンライン" : "オフライン"}</span>
            </span>
          </div>
        </div>
        {storeId && (
          <div className="max-w-3xl mx-auto px-4 pb-2 text-[11px] text-white/40 font-mono tabular-nums">
            店舗 {storeId}
          </div>
        )}
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 pt-4 pb-24">{children}</main>

      <BottomTabBar />
    </div>
  )
}
