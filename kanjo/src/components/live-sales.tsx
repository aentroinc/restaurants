"use client";

import { useEffect, useState } from "react";

export function LiveSalesCounter({ base }: { base: number }) {
  const [sales, setSales] = useState(base);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const add = Math.floor(Math.random() * 1800) + 400;
      setSales((prev) => prev + add);
      setFlash(true);
      setTimeout(() => setFlash(false), 500);
    }, 3000 + Math.random() * 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <p className={`text-4xl kpi-value tracking-tight transition-colors duration-300 ${flash ? "text-emerald-600" : "text-slate-900"}`}>
        ¥{sales.toLocaleString()}
      </p>
      <div className="flex items-center gap-1.5 mt-1">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
        </span>
        <span className="text-[10px] text-emerald-600 tracking-wider font-medium">LIVE</span>
      </div>
    </div>
  );
}
