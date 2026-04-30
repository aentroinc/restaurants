"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/lib/role-context";
import type { Role } from "@/lib/mock-data";

type NavItem = { href: string; label: string; icon: React.ReactNode };

function Icon({ d, active }: { d: string; active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const icons = {
  home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  chart: "M18 20V10 M12 20V4 M6 20v-6",
  ai: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5",
  stores: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  shift: "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  waste: "M12 2v10l4.5 4.5 M12 12l-4.5 4.5 M4.93 4.93l14.14 14.14",
  box: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  menu: "M3 12h18 M3 6h18 M3 18h18",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33",
  forecast: "M22 12h-4l-3 9L9 3l-3 9H2",
};

const navByRole: Record<Role, { href: string; label: string; iconKey: keyof typeof icons }[]> = {
  owner: [
    { href: "/", label: "全社概況", iconKey: "home" },
    { href: "/report", label: "損益", iconKey: "chart" },
    { href: "/ai-impact", label: "AI効果", iconKey: "ai" },
    { href: "/stores", label: "店舗", iconKey: "stores" },
    { href: "/settings", label: "設定", iconKey: "gear" },
  ],
  area: [
    { href: "/", label: "エリア", iconKey: "home" },
    { href: "/stores", label: "店舗くらべ", iconKey: "stores" },
    { href: "/shift", label: "シフト", iconKey: "shift" },
    { href: "/waste", label: "ロス", iconKey: "waste" },
    { href: "/settings", label: "設定", iconKey: "gear" },
  ],
  manager: [
    { href: "/", label: "ホーム", iconKey: "home" },
    { href: "/forecast", label: "見込み", iconKey: "forecast" },
    { href: "/stock", label: "仕入れ", iconKey: "box" },
    { href: "/shift", label: "シフト", iconKey: "shift" },
    { href: "/menu", label: "メニュー", iconKey: "menu" },
  ],
};

export function BottomNav() {
  const pathname = usePathname();
  const { role } = useRole();
  const items = navByRole[role];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200/80 z-50">
      <div className="max-w-lg mx-auto flex">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-2 text-[9px] tracking-wider transition-all ${
                isActive ? "text-slate-900" : "text-slate-350"
              }`}
              style={{ color: isActive ? "#0f172a" : "#94a3b8" }}
            >
              <div className={`mb-0.5 transition-transform ${isActive ? "scale-110" : ""}`}>
                <Icon d={icons[item.iconKey]} active={isActive} />
              </div>
              <span className={isActive ? "font-bold" : "font-normal"}>{item.label}</span>
              {isActive && <div className="w-4 h-0.5 bg-slate-900 rounded-full mt-0.5" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
