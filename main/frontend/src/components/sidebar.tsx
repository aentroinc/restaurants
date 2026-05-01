"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, BarChart3, Target, CheckSquare, Presentation,
  Shield, TrendingUp, Brain, Boxes, Calculator, Database, GitBranch,
  ShieldCheck, Lock,
} from "lucide-react"

const navItems = [
  { label: "経営概要", icon: LayoutDashboard, href: "/" },
  { label: "店舗ランキング", icon: BarChart3, href: "/stores" },
  { label: "SV ミッション", icon: Target, href: "/sv-missions" },
  { label: "タスク管理", icon: CheckSquare, href: "/tasks" },
  { label: "経営会議パック", icon: Presentation, href: "/meeting-packs" },
  { label: "データ品質", icon: Shield, href: "/data-quality" },
  { label: "改善効果", icon: TrendingUp, href: "/value-realization" },
  { label: "AI アナリスト", icon: Brain, href: "/ai-analyst" },
]

const adminItems = [
  { label: "オントロジー", icon: Boxes, href: "/admin/ontology" },
  { label: "KPI 定義", icon: Calculator, href: "/admin/kpi-definitions" },
  { label: "データ連携", icon: Database, href: "/admin/data-sources" },
  { label: "データ系譜", icon: GitBranch, href: "/admin/lineage" },
  { label: "書き戻し管理", icon: ShieldCheck, href: "/admin/writeback" },
  { label: "AI ガバナンス", icon: Lock, href: "/admin/ai-governance" },
]

interface SidebarProps {
  collapsed: boolean
}

export function Sidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "flex flex-col bg-slate-900 text-white transition-all duration-300",
        collapsed ? "w-[60px]" : "w-[260px]"
      )}
    >
      <div className={cn("flex h-14 items-center border-b border-slate-700 px-4", collapsed && "justify-center px-2")}>
        {collapsed ? (
          <span className="text-lg font-bold text-blue-400">A</span>
        ) : (
          <span className="text-lg font-bold tracking-wider text-blue-400">AENTRO</span>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600/20 text-blue-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}

        {/* Admin Section Divider */}
        <div className={cn("pt-4 pb-2", collapsed && "pt-3 pb-1")}>
          {collapsed ? (
            <div className="mx-auto h-px w-6 bg-slate-700" />
          ) : (
            <div className="flex items-center gap-2 px-3">
              <div className="h-px flex-1 bg-slate-700" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">管理</span>
              <div className="h-px flex-1 bg-slate-700" />
            </div>
          )}
        </div>

        {adminItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "bg-blue-600/15 text-blue-400/90"
                  : "text-slate-500 hover:bg-slate-800 hover:text-slate-300",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-slate-700 p-4">
          <div className="text-xs text-slate-500">期間</div>
          <div className="mt-1 text-sm text-slate-300">2026年4月</div>
        </div>
      )}
    </aside>
  )
}
