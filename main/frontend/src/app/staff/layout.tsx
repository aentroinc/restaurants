"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Clock, ClipboardCheck, Trash2, MessageSquare, GraduationCap, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const tabs = [
  { href: "/staff", icon: Home, label: "ホーム" },
  { href: "/staff/clock", icon: Clock, label: "打刻" },
  { href: "/staff/checklist", icon: ClipboardCheck, label: "チェック" },
  { href: "/staff/loss", icon: Trash2, label: "ロス" },
  { href: "/staff/voice", icon: MessageSquare, label: "客声" },
  { href: "/staff/training", icon: GraduationCap, label: "学習" },
  { href: "/staff/settings", icon: Settings, label: "設定" },
]

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0e14] text-white overflow-hidden flex flex-col relative">
      <header className="shrink-0 bg-[#0d1117] border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center font-bold text-sm">
            A
          </div>
          <div className="text-sm font-semibold">AENTRO 現場</div>
        </div>
        <Link
          href="/"
          className="text-xs text-white/40 hover:text-white/80 px-2 py-1 rounded hover:bg-white/[0.04]"
        >
          経営OSへ
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">{children}</main>

      <nav
        className="absolute bottom-0 left-0 right-0 bg-[#0d1117] border-t border-white/10 z-10"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-7">
          {tabs.map((t) => {
            const active =
              t.href === "/staff" ? pathname === "/staff" : pathname.startsWith(t.href)
            const Icon = t.icon
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 min-h-[64px] transition-colors",
                  active ? "text-emerald-400" : "text-white/50 hover:text-white/80",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-none">{t.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
