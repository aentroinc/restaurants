"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { managerOffline, type PendingSubmission } from "@/lib/manager-offline"
import { LogOut, Trash2, RefreshCw, Smartphone } from "lucide-react"

export default function SettingsPage() {
  const [storeId, setStoreId] = useState("")
  const [role, setRole] = useState("manager")
  const [pending, setPending] = useState<PendingSubmission[]>([])
  const [online, setOnline] = useState(true)

  async function refresh() {
    setPending(await managerOffline.list())
  }

  useEffect(() => {
    if (typeof navigator !== "undefined") setOnline(navigator.onLine)
    setStoreId(localStorage.getItem("manager.store_id") || "S-1001")
    setRole(localStorage.getItem("manager.role") || "manager")
    refresh()
    const onLine = () => setOnline(true)
    const offLine = () => setOnline(false)
    window.addEventListener("online", onLine)
    window.addEventListener("offline", offLine)
    return () => {
      window.removeEventListener("online", onLine)
      window.removeEventListener("offline", offLine)
    }
  }, [])

  async function manualSync() {
    await managerOffline.sync()
    await refresh()
  }

  function saveStore(id: string) {
    setStoreId(id)
    localStorage.setItem("manager.store_id", id)
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
        <div className="text-[11px] uppercase tracking-wider text-white/40">アカウント（仮ログイン）</div>
        <div>
          <label className="block text-xs text-white/50 mb-1">担当店舗 ID</label>
          <input
            type="text"
            value={storeId}
            onChange={(e) => saveStore(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1">ロール</label>
          <div className="text-sm text-white/85 font-mono">{role}</div>
          <div className="text-[10px] text-white/30 mt-1">
            ※ ?role=manager クエリで切替（本実装は別エージェント）
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-white/40">未送信キュー</div>
            <div className="text-sm font-semibold mt-0.5">{pending.length} 件</div>
          </div>
          <button
            type="button"
            onClick={manualSync}
            disabled={!online || pending.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 disabled:opacity-40 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            同期
          </button>
        </div>
        <ul className="divide-y divide-white/[0.04] -mx-4">
          {pending.map((p) => (
            <li key={p.id} className="px-4 py-2 flex items-center gap-3 text-xs">
              <span className="text-white/50 font-mono shrink-0">{p.kind}</span>
              <span className="text-white/30 font-mono shrink-0">
                {new Date(p.createdAt).toLocaleString("ja-JP")}
              </span>
              <span className="ml-auto">
                <button
                  type="button"
                  onClick={async () => {
                    await managerOffline.remove(p.id)
                    await refresh()
                  }}
                  className="text-red-400 p-1"
                  aria-label="削除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </span>
            </li>
          ))}
          {pending.length === 0 && (
            <li className="px-4 py-3 text-center text-white/30 text-xs">未送信なし</li>
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="flex items-center gap-2 mb-2">
          <Smartphone className="w-4 h-4 text-white/60" />
          <div className="text-[11px] uppercase tracking-wider text-white/40">PWA インストール</div>
        </div>
        <p className="text-sm text-white/70 leading-relaxed">
          ホーム画面に追加するとオフラインでも利用できます。Safari の共有メニュー →「ホーム画面に追加」。
        </p>
      </section>

      <Link
        href="/"
        className="flex items-center gap-2 justify-center px-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] text-white/70 text-sm"
      >
        <LogOut className="w-4 h-4" />
        本部ダッシュボードへ戻る
      </Link>
    </div>
  )
}
