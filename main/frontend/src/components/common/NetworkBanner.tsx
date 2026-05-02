"use client"

/**
 * `navigator.onLine` を監視。
 * - オフライン中: 画面上部に固定バナーを表示。
 * - 復帰時: トーストで「オンラインに復帰しました」を出す（3秒）。
 */
import { useEffect, useState } from "react"
import { WifiOff } from "lucide-react"
import { toast } from "./Toast"

export function NetworkBanner() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    if (typeof navigator !== "undefined") setOnline(navigator.onLine)
    const goOn = () => {
      setOnline(true)
      toast.success("オンラインに復帰しました")
    }
    const goOff = () => setOnline(false)
    window.addEventListener("online", goOn)
    window.addEventListener("offline", goOff)
    return () => {
      window.removeEventListener("online", goOn)
      window.removeEventListener("offline", goOff)
    }
  }, [])

  if (online) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[90] bg-amber-500/95 text-black text-[12px] font-semibold py-1.5 px-3 flex items-center justify-center gap-2 shadow"
    >
      <WifiOff className="w-3.5 h-3.5" />
      オフラインです — 送信内容はローカルに保存され、復帰時に自動同期します
    </div>
  )
}
