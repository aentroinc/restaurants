"use client";

import { useRole } from "@/lib/role-context";
import { RoleSwitcher } from "@/components/role-switcher";
import { HomeOwner } from "@/components/home-owner";
import { HomeArea } from "@/components/home-area";
import { HomeManager } from "@/components/home-manager";
import { notifications } from "@/lib/mock-data";
import Link from "next/link";

export default function HomePage() {
  const { role } = useRole();
  const unreadNotifications = notifications.filter((n) => !n.read).length;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">今日のお店</h1>
          <p className="text-xs text-gray-500">4月30日(水) 15:30 現在</p>
        </div>
        <Link href="/notifications" className="relative">
          <span className="text-2xl">🔔</span>
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {unreadNotifications}
            </span>
          )}
        </Link>
      </div>

      {/* Role Switcher */}
      <RoleSwitcher />

      {/* Role-specific content */}
      {role === "owner" && <HomeOwner />}
      {role === "area" && <HomeArea />}
      {role === "manager" && <HomeManager />}
    </div>
  );
}
