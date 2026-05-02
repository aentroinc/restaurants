"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BottomTabBar } from "@/components/manager/BottomTabBar"
import { managerOffline } from "@/lib/manager-offline"
import { Wifi, WifiOff, RefreshCw, ArrowLeft } from "lucide-react"
import { PWAHead } from "@/components/common/PWAHead"
import { InstallPrompt } from "@/components/common/InstallPrompt"
import { AppErrorBoundary } from "@/components/common/AppErrorBoundary"
import { SentryUserBinder } from "@/components/common/SentryUserBinder"
import { SkipLink } from "@/components/common/SkipLink"
import { ToastProvider } from "@/components/common/Toast"
import { NetworkBanner } from "@/components/common/NetworkBanner"
import { ConsentGate } from "@/components/consent/ConsentDialog"
import { RoleGuard } from "@/components/auth/RoleGuard"
import { StoreSwitcher } from "@/components/auth/StoreSwitcher"
import { getCurrentUser } from "@/lib/auth"
import { OnboardingOverlay } from "@/components/onboarding/OnboardingOverlay"
import { HelpButton } from "@/components/common/HelpButton"

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

  // PWA head meta is now handled by <PWAHead role="manager" />.

  useEffect(() => {
    // Real auth: pull current_store_id from /auth/me. Falls back to legacy
    // ?store= override / localStorage so old links keep working in demo mode.
    if (typeof window === "undefined") return
    let alive = true

    const qs = new URLSearchParams(window.location.search)
    const qStore = qs.get("store")
    const stored = localStorage.getItem("manager.store_id")
    if (qStore) {
      localStorage.setItem("manager.store_id", qStore)
      setStoreId(qStore)
    } else if (stored) {
      setStoreId(stored)
    }

    getCurrentUser().then((u) => {
      if (!alive || !u) return
      const sid = u.current_store_id || (u.assigned_stores[0]?.id ?? null)
      if (sid) {
        setStoreId(sid)
        localStorage.setItem("manager.store_id", sid)
      }
    })
    return () => {
      alive = false
    }
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
    <RoleGuard allow={["manager"]}>
    <ToastProvider>
    <div className="min-h-screen bg-[#0a0e14] text-white/85 flex flex-col">
      <PWAHead role="manager" />
      <SentryUserBinder role="manager" />
      <SkipLink />
      <NetworkBanner />
      <header role="banner" className="sticky top-0 z-30 bg-[#0a0e14]/95 backdrop-blur border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center gap-3">
          {!isHome && (
            <Link
              href="/manager"
              className="-ml-2 p-2 text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-md"
              aria-label="店長ホームに戻る"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </Link>
          )}
          <h1 className="text-base font-semibold tracking-tight truncate flex-1">{title}</h1>
          <div className="flex items-center gap-2">
            <StoreSwitcher compact />
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={manualSync}
                disabled={syncing}
                aria-label={`未送信 ${pendingCount} 件を同期`}
                className="flex items-center gap-1 px-2 py-1 rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-200 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:opacity-60"
              >
                <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} aria-hidden="true" />
                <span>{pendingCount}件 未送信</span>
              </button>
            )}
            <span
              role="status"
              aria-live="polite"
              className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-md ${
                online ? "text-emerald-300 bg-emerald-400/10" : "text-red-300 bg-red-400/10"
              }`}
              title={online ? "オンライン" : "オフライン"}
            >
              {online ? <Wifi className="w-3 h-3" aria-hidden="true" /> : <WifiOff className="w-3 h-3" aria-hidden="true" />}
              <span className="hidden sm:inline">{online ? "オンライン" : "オフライン"}</span>
              <span className="sr-only">{online ? "ネットワーク接続あり" : "ネットワーク切断中"}</span>
            </span>
          </div>
        </div>
        {storeId && (
          <div className="max-w-3xl mx-auto px-4 pb-2 text-[11px] text-white/60 font-mono tabular-nums">
            店舗 <span aria-label={`店舗ID ${storeId}`}>{storeId}</span>
          </div>
        )}
      </header>

      <main id="main" role="main" className="flex-1 max-w-3xl w-full mx-auto px-4 pt-4 pb-24">
        <AppErrorBoundary role="manager">
          <ConsentGate>{children}</ConsentGate>
        </AppErrorBoundary>
      </main>

      <BottomTabBar />
      <InstallPrompt role="manager" appLabel="AENTRO 店長" />
      <OnboardingOverlay role="manager" />
      <HelpButton />
    </div>
    </ToastProvider>
    </RoleGuard>
  )
}
