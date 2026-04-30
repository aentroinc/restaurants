"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/lib/role-context";
import type { Role } from "@/lib/mock-data";

type NavItem = { href: string; label: string; icon: string };

const navByRole: Record<Role, NavItem[]> = {
  owner: [
    { href: "/", label: "ホーム", icon: "🏠" },
    { href: "/report", label: "レポート", icon: "📋" },
    { href: "/waste", label: "ムダ", icon: "💸" },
    { href: "/menu", label: "メニュー", icon: "🍽" },
    { href: "/settings", label: "設定", icon: "⚙️" },
  ],
  area: [
    { href: "/", label: "ホーム", icon: "🏠" },
    { href: "/forecast", label: "見込み", icon: "📊" },
    { href: "/waste", label: "ムダ", icon: "💸" },
    { href: "/shift", label: "シフト", icon: "📅" },
    { href: "/settings", label: "設定", icon: "⚙️" },
  ],
  manager: [
    { href: "/", label: "ホーム", icon: "🏠" },
    { href: "/forecast", label: "見込み", icon: "📊" },
    { href: "/stock", label: "のこり", icon: "🥩" },
    { href: "/shift", label: "シフト", icon: "📅" },
    { href: "/menu", label: "メニュー", icon: "🍽" },
  ],
};

export function BottomNav() {
  const pathname = usePathname();
  const { role } = useRole();

  if (pathname === "/login") return null;

  const items = navByRole[role];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-md mx-auto flex justify-around">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-2 px-3 text-xs ${
                isActive
                  ? "text-orange-600 font-bold"
                  : "text-gray-500"
              }`}
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
