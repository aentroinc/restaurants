"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  FileText,
  Trash2,
  MessageSquareWarning,
  Wrench,
  CalendarClock,
  Settings,
} from "lucide-react"

const tabs = [
  { href: "/manager", label: "ホーム", icon: Home, exact: true },
  { href: "/manager/daily-report", label: "日報", icon: FileText },
  { href: "/manager/waste", label: "廃棄", icon: Trash2 },
  { href: "/manager/complaint", label: "クレーム", icon: MessageSquareWarning },
  { href: "/manager/equipment", label: "修理", icon: Wrench },
  { href: "/manager/shift", label: "シフト", icon: CalendarClock },
  { href: "/manager/settings", label: "設定", icon: Settings },
]

export function BottomTabBar() {
  const pathname = usePathname() || ""
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-white/[0.08] bg-[#0a0e14]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0a0e14]/80 pb-[env(safe-area-inset-bottom)]"
      role="navigation"
      aria-label="店長アプリ ナビゲーション"
    >
      <ul className="grid grid-cols-7 max-w-3xl mx-auto">
        {tabs.map((t) => {
          const Icon = t.icon
          const active = t.exact ? pathname === t.href : pathname.startsWith(t.href)
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-1 text-[10px] tracking-tight transition-colors ${
                  active
                    ? "text-emerald-400"
                    : "text-white/50 hover:text-white/80"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="w-5 h-5" strokeWidth={1.75} />
                <span className="truncate w-full text-center">{t.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
