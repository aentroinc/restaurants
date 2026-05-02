"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Store, AlertTriangle, Target, CheckSquare,
  Truck, TrendingUp, MapPin, Megaphone,
  Presentation, Sparkles, ShieldCheck, Brain,
  Boxes, Network, Calculator, Database, GitBranch, Lock,
  Hexagon, Activity,
  Utensils, Clock, ClipboardCheck, Thermometer, Receipt,
  FlaskConical, Users as UsersIcon, FileText,
  Award, Rocket, Zap, Repeat,
  type LucideIcon,
} from "lucide-react"

interface NavItem {
  label: string
  icon: LucideIcon
  href: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

const sections: NavSection[] = [
  {
    title: "ゼンショー (毎朝)",
    items: [
      { label: "Daily Brief（3分朝ブリーフ）", icon: Brain, href: "/daily-brief" },
      { label: "経営エグゼクティブ", icon: Sparkles, href: "/zensho-executive" },
      { label: "中計 × AENTRO", icon: Target, href: "/zensho-mtp" },
      { label: "Action Loop ライブ", icon: Repeat, href: "/action-loop" },
      { label: "デモツアー（28秒）", icon: Presentation, href: "/demo-tour" },
    ],
  },
  {
    title: "実証 / 起動",
    items: [
      { label: "事例（5社）", icon: Award, href: "/case-studies" },
      { label: "専用環境を起動", icon: Rocket, href: "/onboarding" },
      { label: "Workflow Builder", icon: Zap, href: "/workflow-builder" },
    ],
  },
  {
    title: "ゼンショー POC",
    items: [
      { label: "POC マネージャ", icon: FlaskConical, href: "/zensho-pilot" },
      { label: "SV プランナー", icon: Target, href: "/sv-planner" },
      { label: "店長ブリーフ", icon: ClipboardCheck, href: "/store-brief" },
    ],
  },
  {
    title: "経営オペレーション",
    items: [
      { label: "経営司令塔", icon: LayoutDashboard, href: "/" },
      { label: "店舗360", icon: Store, href: "/stores" },
      { label: "インシデント＆対応", icon: AlertTriangle, href: "/incidents" },
      { label: "SVミッション", icon: Target, href: "/sv-missions" },
      { label: "タスク管理", icon: CheckSquare, href: "/tasks" },
    ],
  },
  {
    title: "サプライ&需要",
    items: [
      { label: "サプライチェーン", icon: Truck, href: "/supply-chain" },
      { label: "需要・在庫", icon: TrendingUp, href: "/demand" },
    ],
  },
  {
    title: "業務管理",
    items: [
      { label: "レシピ・原価", icon: Utensils, href: "/recipes" },
      { label: "シフト・労務", icon: Clock, href: "/labor" },
      { label: "QSC監査", icon: ClipboardCheck, href: "/qsc" },
      { label: "HACCP", icon: Thermometer, href: "/haccp" },
      { label: "FC会計", icon: Receipt, href: "/franchise" },
    ],
  },
  {
    title: "成長戦略",
    items: [
      { label: "出店・改装", icon: MapPin, href: "/expansion" },
      { label: "キャンペーン分析", icon: Megaphone, href: "/campaigns" },
      { label: "分析ワークスペース", icon: FlaskConical, href: "/workspace" },
    ],
  },
  {
    title: "経営報告",
    items: [
      { label: "経営会議パック", icon: Presentation, href: "/meeting-packs" },
      { label: "改善効果", icon: Sparkles, href: "/value-realization" },
      { label: "データ品質", icon: ShieldCheck, href: "/data-quality" },
      { label: "AIアナリスト", icon: Brain, href: "/ai-analyst" },
    ],
  },
]

const adminItems: NavItem[] = [
  { label: "データ辞書", icon: Boxes, href: "/admin/ontology" },
  { label: "データ関係図", icon: Network, href: "/admin/ontology/graph" },
  { label: "KPI 管理", icon: Calculator, href: "/admin/kpi-definitions" },
  { label: "データ連携", icon: Database, href: "/admin/data-sources" },
  { label: "データの流れ", icon: GitBranch, href: "/admin/lineage" },
  { label: "現場への指示反映", icon: ShieldCheck, href: "/admin/writeback" },
  { label: "AI 統制", icon: Lock, href: "/admin/ai-governance" },
  { label: "権限・ロール", icon: UsersIcon, href: "/admin/roles" },
  { label: "ユーザー", icon: UsersIcon, href: "/admin/users" },
  { label: "アクセス監査", icon: FileText, href: "/admin/access-logs" },
  { label: "データ取り込み健全性", icon: Database, href: "/admin/connector-health" },
  { label: "セキュリティ", icon: Lock, href: "/admin/security" },
  { label: "システム状態", icon: Activity, href: "/admin/system-status" },
  { label: "AENTRO とは", icon: Hexagon, href: "/about" },
]

interface SidebarProps {
  collapsed: boolean
}

function isActiveHref(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/"
  // Special case: /admin/ontology should not match /admin/ontology/graph
  if (href === "/admin/ontology") {
    return pathname === "/admin/ontology"
  }
  return pathname === href || pathname.startsWith(href + "/")
}

export function Sidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname() || "/"

  return (
    <aside
      className={cn(
        "shrink-0 flex flex-col border-r border-white/[0.06] bg-[#0a0e14] transition-all duration-300",
        collapsed ? "w-[60px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-14 items-center gap-2.5 border-b border-white/[0.06] px-4 shrink-0",
          collapsed && "justify-center px-2"
        )}
      >
        <Hexagon className="w-6 h-6 text-blue-400 shrink-0" strokeWidth={1.5} />
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-[11px] font-bold tracking-[0.16em] text-blue-400 uppercase">
              AENTRO
            </div>
            <div className="text-[9px] text-white/40 tracking-[0.10em]">
              ゼンショーグループ 経営OS
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {sections.map((section) => (
          <div key={section.title} className="mb-2">
            {!collapsed && (
              <div className="px-4 pt-2 pb-1">
                <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/30">
                  {section.title}
                </span>
              </div>
            )}
            {collapsed && (
              <div className="mx-auto my-2 h-px w-6 bg-white/[0.06]" />
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActiveHref(pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 text-[13px] transition-colors",
                      active
                        ? "bg-blue-500/10 text-blue-400 border-r-2 border-blue-400"
                        : "text-white/50 hover:text-white/85 hover:bg-white/[0.03]",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

        {/* Admin Section */}
        <div className="mt-2 pt-2 border-t border-white/[0.06]">
          {!collapsed ? (
            <div className="px-4 pt-2 pb-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/30">
                管理
              </span>
            </div>
          ) : (
            <div className="mx-auto my-2 h-px w-6 bg-white/[0.06]" />
          )}
          <div className="space-y-0.5">
            {adminItems.map((item) => {
              const active = isActiveHref(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 px-4 py-1.5 text-[12px] transition-colors",
                    active
                      ? "bg-blue-500/10 text-blue-400 border-r-2 border-blue-400"
                      : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/[0.06] shrink-0">
        {!collapsed ? (
          <>
            <div className="text-[9px] uppercase tracking-[0.10em] text-white/30">期間</div>
            <div className="mt-1 text-[12px] text-white/70 font-mono tabular-nums">2026年4月</div>
            <div className="mt-2 text-[9px] text-white/20 text-center">
              ゼンショーホールディングス
            </div>
          </>
        ) : (
          <div className="text-center text-[9px] text-white/20">v0.4</div>
        )}
      </div>
    </aside>
  )
}
