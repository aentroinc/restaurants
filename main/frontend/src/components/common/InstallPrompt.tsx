"use client"

import { useEffect, useState } from "react"
import { Download, X } from "lucide-react"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

export function InstallPrompt({
  role,
  appLabel,
}: {
  role: "staff" | "manager" | "sv"
  appLabel?: string
}) {
  const storageKey = `aentro.install.dismissed.${role}`
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (localStorage.getItem(storageKey) === "1") return

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setEvt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    const onInstalled = () => {
      setVisible(false)
      setEvt(null)
      localStorage.setItem(storageKey, "1")
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall as EventListener)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall as EventListener)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [storageKey])

  async function install() {
    if (!evt) return
    await evt.prompt()
    const choice = await evt.userChoice
    if (choice.outcome === "accepted") {
      localStorage.setItem(storageKey, "1")
    }
    setVisible(false)
    setEvt(null)
  }

  function dismiss() {
    localStorage.setItem(storageKey, "1")
    setVisible(false)
  }

  if (!visible) return null

  const label = appLabel || "AENTRO"

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="ホーム画面に追加"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] max-w-sm w-[calc(100%-24px)]
                 rounded-xl border border-white/15 bg-[#0d1117] shadow-2xl px-4 py-3
                 flex items-center gap-3 animate-fade-in"
    >
      <div className="shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700
                      flex items-center justify-center">
        <Download className="w-4 h-4 text-white" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white truncate">{label} をホーム画面へ</div>
        <div className="text-[11px] text-white/60 truncate">オフライン対応・素早く起動</div>
      </div>
      <button
        type="button"
        onClick={install}
        className="shrink-0 px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold
                   hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2
                   focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1117]"
      >
        追加
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="閉じる"
        className="shrink-0 p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/[0.06]
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  )
}
