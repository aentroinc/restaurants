"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UtensilsCrossed, Package, CalendarDays, Lightbulb } from "lucide-react";

const tabs = [
  { href: "/", label: "今日", icon: LayoutDashboard },
  { href: "/sales", label: "売上", icon: UtensilsCrossed },
  { href: "/inventory", label: "食材", icon: Package },
  { href: "/shift", label: "シフト", icon: CalendarDays },
  { href: "/advice", label: "AI提案", icon: Lightbulb },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-area-bottom">
      <div className="max-w-lg mx-auto flex">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 pt-2.5 transition-colors tap-scale ${
                active ? "text-blue-600" : "text-gray-400"
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2 : 1.5} />
              <span className={`text-[10px] ${active ? "font-semibold" : ""}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
