"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Store, Network, TrendingUp,
  Truck, Zap, BarChart3, MapPin,
  Hexagon,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Executive Command", icon: LayoutDashboard },
  { href: "/store360", label: "Store 360", icon: Store },
  { href: "/ontology", label: "Ontology Graph", icon: Network },
  { href: "/demand", label: "Demand & Inventory", icon: TrendingUp },
  { href: "/supply-chain", label: "Supply Chain Twin", icon: Truck },
  { href: "/actions", label: "Action Queue", icon: Zap },
  { href: "/campaign", label: "Campaign & Menu", icon: BarChart3 },
  { href: "/expansion", label: "Expansion Planner", icon: MapPin },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full z-40 flex flex-col w-56 border-r border-white/[0.06] bg-[#0a0e14]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-white/[0.06]">
        <Hexagon className="w-6 h-6 text-blue-400 shrink-0" strokeWidth={1.5} />
        <div className="overflow-hidden">
          <div className="text-[11px] font-bold tracking-[0.15em] text-blue-400 uppercase">Matsuya</div>
          <div className="text-[9px] text-white/40 tracking-[0.08em]">Operations Ontology</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-2 text-[13px] transition-colors ${
                active
                  ? "bg-blue-500/10 text-blue-400 border-r-2 border-blue-400"
                  : "text-white/50 hover:text-white/80 hover:bg-white/[0.03]"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/[0.06]">
        <div className="text-[9px] text-white/20 text-center">Demo data / illustrative only</div>
      </div>
    </aside>
  );
}
