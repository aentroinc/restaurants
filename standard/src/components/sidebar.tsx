"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BarChart3, Package, CalendarDays,
  Bell, Hexagon, GitCompareArrows,
} from "lucide-react";

const navItems = [
  { href: "/", label: "全店ダッシュボード", icon: LayoutDashboard },
  { href: "/compare", label: "店舗比較", icon: GitCompareArrows },
  { href: "/menu", label: "メニュー分析", icon: BarChart3 },
  { href: "/inventory", label: "在庫・発注", icon: Package },
  { href: "/shift", label: "シフト管理", icon: CalendarDays },
  { href: "/alerts", label: "AIアラート", icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full z-40 flex flex-col w-56 border-r border-white/[0.06] bg-[#0a0e14]">
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-white/[0.06]">
        <Hexagon className="w-6 h-6 text-orange-400 shrink-0" strokeWidth={1.5} />
        <div>
          <div className="text-[11px] font-bold tracking-[0.15em] text-orange-400 uppercase">AENTRO</div>
          <div className="text-[9px] text-white/40 tracking-[0.08em]">STANDARD · 5店舗</div>
        </div>
      </div>

      <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors ${
                active
                  ? "bg-orange-500/10 text-orange-400 border-r-2 border-orange-400"
                  : "text-white/50 hover:text-white/80 hover:bg-white/[0.03]"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-white/[0.06]">
        <div className="text-[9px] text-white/20 text-center">デモ用サンプルデータ</div>
      </div>
    </aside>
  );
}
