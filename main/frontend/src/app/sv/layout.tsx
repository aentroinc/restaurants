"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import {
  LayoutDashboard, CalendarCheck, MapPin, ListTodo, Eye,
  GraduationCap, BarChart3, Sparkles, Menu, X, Wifi, WifiOff,
} from "lucide-react"

const NAV = [
  { href: "/sv", label: "エリアダッシュボード", icon: LayoutDashboard },
  { href: "/sv/plan", label: "訪問計画", icon: CalendarCheck },
  { href: "/sv/visit", label: "訪問実行", icon: MapPin },
  { href: "/sv/improvement", label: "改善宿題", icon: ListTodo },
  { href: "/sv/competitor", label: "競合視察", icon: Eye },
  { href: "/sv/coaching", label: "店長コーチ", icon: GraduationCap },
  { href: "/sv/kpi", label: "エリアKPI", icon: BarChart3 },
  { href: "/sv/ai-prep", label: "AI訪問前ブリーフ", icon: Sparkles },
] as const

export default function SVLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ""
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [online, setOnline] = useState(true)

  useEffect(() => {
    if (typeof navigator !== "undefined") setOnline(navigator.onLine)
    const goOn = () => setOnline(true), goOff = () => setOnline(false)
    window.addEventListener("online", goOn)
    window.addEventListener("offline", goOff)
    return () => { window.removeEventListener("online", goOn); window.removeEventListener("offline", goOff) }
  }, [])

  function isActive(href: string) {
    if (href === "/sv") return pathname === "/sv"
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-[#0a0e14] text-white/85 flex flex-col">
      {/* PC: top tab bar (visible md+) */}
      <header className="hidden md:flex sticky top-0 z-30 h-14 items-center gap-1 px-4 border-b border-white/[0.06] bg-[#0c1017]/95 backdrop-blur">
        <div className="flex items-center gap-2 mr-4">
          <span className="text-[15px] font-bold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">AENTRO SV</span>
          <span className="text-[10px] text-white/40 uppercase">PWA</span>
        </div>
        <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto">
          {NAV.map((n) => {
            const Icon = n.icon
            const active = isActive(n.href)
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-1.5 px-3 h-10 rounded-md text-[12px] font-medium whitespace-nowrap transition-all ${active ? "bg-white/[0.08] text-white" : "text-white/55 hover:text-white/85 hover:bg-white/[0.04]"}`}
              >
                <Icon className="w-3.5 h-3.5" />{n.label}
              </Link>
            )
          })}
        </nav>
        <ConnStatus online={online} />
      </header>

      {/* Tablet: header bar with drawer toggle */}
      <header className="md:hidden sticky top-0 z-30 h-14 flex items-center justify-between px-4 border-b border-white/[0.06] bg-[#0c1017]">
        <button onClick={() => setDrawerOpen(true)} className="p-2 -ml-2 rounded hover:bg-white/[0.06]">
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-[14px] font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">AENTRO SV</span>
        <ConnStatus online={online} />
      </header>

      {/* Tablet: drawer sidebar */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
          <aside className="relative w-72 bg-[#0c1017] border-r border-white/[0.06] flex flex-col">
            <div className="h-14 flex items-center justify-between px-4 border-b border-white/[0.06]">
              <span className="text-[14px] font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">AENTRO SV</span>
              <button onClick={() => setDrawerOpen(false)} className="p-2 -mr-2 rounded hover:bg-white/[0.06]"><X className="w-4 h-4" /></button>
            </div>
            <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
              {NAV.map((n) => {
                const Icon = n.icon
                const active = isActive(n.href)
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3 h-12 rounded-md text-[14px] font-medium transition-all ${active ? "bg-white/[0.08] text-white" : "text-white/65 hover:text-white hover:bg-white/[0.04]"}`}
                  >
                    <Icon className="w-4 h-4" />{n.label}
                  </Link>
                )
              })}
            </nav>
          </aside>
        </div>
      )}

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}

function ConnStatus({ online }: { online: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono ${online ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
      {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      {online ? "ONLINE" : "OFFLINE"}
    </div>
  )
}
