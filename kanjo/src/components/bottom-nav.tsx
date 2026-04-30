"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/lib/role-context";
import type { Role } from "@/lib/mock-data";

type NavItem = { href: string; label: string; icon: string };

const navByRole: Record<Role, NavItem[]> = {
  owner: [
    { href: "/", label: "概況", icon: "◈" },
    { href: "/report", label: "レポート", icon: "◩" },
    { href: "/waste", label: "ロス管理", icon: "◫" },
    { href: "/menu", label: "メニュー", icon: "◧" },
    { href: "/settings", label: "設定", icon: "◉" },
  ],
  area: [
    { href: "/", label: "エリア", icon: "◈" },
    { href: "/forecast", label: "予測", icon: "◩" },
    { href: "/waste", label: "ロス", icon: "◫" },
    { href: "/shift", label: "シフト", icon: "◧" },
    { href: "/settings", label: "設定", icon: "◉" },
  ],
  manager: [
    { href: "/", label: "ホーム", icon: "◈" },
    { href: "/forecast", label: "見込み", icon: "◩" },
    { href: "/stock", label: "のこり", icon: "◫" },
    { href: "/shift", label: "シフト", icon: "◧" },
    { href: "/menu", label: "メニュー", icon: "◉" },
  ],
};

export function BottomNav() {
  const pathname = usePathname();
  const { role } = useRole();
  const items = navByRole[role];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 z-50 safe-area-bottom">
      <div className="max-w-lg mx-auto flex">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-2.5 text-[10px] tracking-wider transition-colors ${
                isActive
                  ? "text-slate-900 font-bold"
                  : "text-slate-400"
              }`}
            >
              <span className={`text-base mb-0.5 ${isActive ? "text-slate-900" : "text-slate-300"}`}>{item.icon}</span>
              <span>{item.label}</span>
              {isActive && <div className="w-4 h-0.5 bg-slate-900 rounded-full mt-0.5" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
