"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Map, Store, TrendingUp,
  BarChart3, Zap, Bell, Hexagon,
} from "lucide-react";

const navItems = [
  { href: "/", label: "全社ダッシュボード", icon: LayoutDashboard },
  { href: "/area", label: "エリアビュー", icon: Map },
  { href: "/store", label: "店舗詳細", icon: Store },
  { href: "/demand", label: "需要予測", icon: TrendingUp },
  { href: "/campaign", label: "キャンペーン分析", icon: BarChart3 },
  { href: "/actions", label: "アクション管理", icon: Zap },
  { href: "/signals", label: "AIシグナル", icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full z-40 flex flex-col w-56 border-r border-white/[0.06] bg-[#0a0e14]">
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-white/[0.06]">
        <Hexagon className="w-6 h-6 text-emerald-400 shrink-0" strokeWidth={1.5} />
        <div>
          <div className="text-[11px] font-bold tracking-[0.15em] text-emerald-400 uppercase">AENTRO</div>
          <div className="text-[9px] text-white/40 tracking-[0.08em]">PRO · 28店舗</div>
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
                  ? "bg-emerald-500/10 text-emerald-400 border-r-2 border-emerald-400"
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
