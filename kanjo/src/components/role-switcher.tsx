"use client";

import { useRole } from "@/lib/role-context";
import { roles } from "@/lib/mock-data";

export function RoleSwitcher() {
  const { role, setRole } = useRole();

  return (
    <div className="flex bg-slate-100 rounded-lg p-0.5">
      {roles.map((r) => (
        <button
          key={r.id}
          onClick={() => setRole(r.id)}
          className={`flex-1 text-[11px] py-1.5 px-2 rounded-md transition-all font-medium tracking-wide ${
            role === r.id
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
