"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, Check, Store as StoreIcon } from "lucide-react"
import {
  type AssignedStore,
  type CurrentUser,
  getCurrentUser,
  switchStore,
} from "@/lib/auth"

interface Props {
  /** Optional: visually compact for tight headers (manager). */
  compact?: boolean
  /** After successful switch, hard-reload so all data refetches with new JWT. */
  onSwitched?: () => void
}

export function StoreSwitcher({ compact, onSwitched }: Props) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let alive = true
    getCurrentUser().then((u) => {
      if (alive) setUser(u)
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  if (!user || user.assigned_stores.length === 0) return null

  const current: AssignedStore | undefined =
    user.assigned_stores.find((s) => s.id === user.current_store_id) ||
    user.assigned_stores[0]

  async function pick(s: AssignedStore) {
    if (busy || !current || s.id === current.id) {
      setOpen(false)
      return
    }
    setBusy(true)
    const res = await switchStore(s.id)
    setBusy(false)
    setOpen(false)
    if (res.ok) {
      if (onSwitched) onSwitched()
      else if (typeof window !== "undefined") window.location.reload()
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className={`flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] transition ${
          compact ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-[12px]"
        } text-white/85 disabled:opacity-50`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <StoreIcon className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
        <span className="font-medium tabular-nums truncate max-w-[180px]">
          {current?.name || "店舗を選択"}
        </span>
        <ChevronDown className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 mt-1.5 w-72 max-h-[60vh] overflow-y-auto rounded-lg border border-white/[0.08] bg-[#0d1117] shadow-xl z-50"
        >
          <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/40 border-b border-white/[0.06]">
            担当店舗 ({user.assigned_stores.length})
          </div>
          {user.assigned_stores.map((s) => {
            const active = s.id === current?.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => pick(s)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-[12px] transition ${
                  active ? "bg-emerald-500/10 text-emerald-300" : "text-white/85 hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">{s.name}</span>
                  <span className="text-[10px] text-white/40 truncate">
                    {s.code} {s.brand_name ? `· ${s.brand_name}` : ""} · {s.role}
                  </span>
                </div>
                {active && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default StoreSwitcher
