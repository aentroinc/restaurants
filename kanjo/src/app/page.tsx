"use client";

import { useRole } from "@/lib/role-context";
import { RoleSwitcher } from "@/components/role-switcher";
import { HomeOwner } from "@/components/home-owner";
import { HomeArea } from "@/components/home-area";
import { HomeManager } from "@/components/home-manager";
import { company, notifications } from "@/lib/mock-data";
import Link from "next/link";

export default function HomePage() {
  const { role } = useRole();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-slate-400 font-medium uppercase">{company.brand}</p>
          <p className="text-xs text-slate-400 mt-0.5">4月30日(水) 15:30</p>
        </div>
        <Link href="/notifications" className="relative p-1">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unread > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
              {unread}
            </span>
          )}
        </Link>
      </div>

      <RoleSwitcher />

      {role === "owner" && <HomeOwner />}
      {role === "area" && <HomeArea />}
      {role === "manager" && <HomeManager />}
    </div>
  );
}
