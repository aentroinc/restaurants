"use client";

import { useState } from "react";

export function Expandable({ title, badge, children, defaultOpen = false }: {
  title: string; badge?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 tap-scale"
      >
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold text-slate-600">{title}</p>
          {badge}
        </div>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 animate-slide-down">{children}</div>}
    </div>
  );
}

export function TabSwitcher({ tabs, className = "" }: {
  tabs: { label: string; content: React.ReactNode }[]; className?: string;
}) {
  const [active, setActive] = useState(0);
  return (
    <div className={className}>
      <div className="flex bg-slate-100 rounded-lg p-0.5 mb-3">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActive(i)}
            className={`flex-1 text-[11px] py-1.5 rounded-md transition-all font-medium ${
              active === i ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div key={active} className="animate-fade-in">{tabs[active].content}</div>
    </div>
  );
}
