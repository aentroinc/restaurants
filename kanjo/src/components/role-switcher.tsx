"use client";

import { useRole } from "@/lib/role-context";
import { roles } from "@/lib/mock-data";

export function RoleSwitcher() {
  const { role, setRole } = useRole();
  const current = roles.find((r) => r.id === role)!;

  return (
    <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
      {roles.map((r) => (
        <button
          key={r.id}
          onClick={() => setRole(r.id)}
          className={`flex-1 text-xs py-1.5 px-2 rounded-lg transition-colors ${
            role === r.id
              ? "bg-orange-500 text-white font-bold"
              : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
