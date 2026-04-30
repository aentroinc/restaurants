"use client";

import { useEffect, useState, useRef } from "react";

export function LiveSalesCounter({ base, size = "lg" }: { base: number; size?: "sm" | "lg" }) {
  const [sales, setSales] = useState(base);
  const [flash, setFlash] = useState(false);
  const [lastAdd, setLastAdd] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const add = Math.floor(Math.random() * 1800) + 400;
      setSales((prev) => prev + add);
      setLastAdd(add);
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
    }, 3000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, []);

  const textSize = size === "lg" ? "text-4xl" : "text-2xl";

  return (
    <div className="relative">
      <p className={`${textSize} kpi-value tracking-tight transition-colors duration-300 ${flash ? "text-emerald-600" : "text-slate-900"}`}>
        ¥{sales.toLocaleString()}
      </p>
      {flash && lastAdd > 0 && (
        <span className="absolute -right-1 -top-1 text-[10px] text-emerald-500 font-bold animate-fade-up">
          +¥{lastAdd.toLocaleString()}
        </span>
      )}
      <LiveDot />
    </div>
  );
}

export function LiveDot() {
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
      </span>
      <span className="text-[10px] text-emerald-600 tracking-wider font-medium">LIVE</span>
    </div>
  );
}

export function AnimatedNumber({ value, prefix = "", suffix = "", className = "" }: {
  value: number; prefix?: string; suffix?: string; className?: string;
}) {
  const [displayed, setDisplayed] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const duration = 1200;
    const start = ref.current;
    const diff = value - start;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplayed(current);
      if (progress < 1) requestAnimationFrame(animate);
      else ref.current = value;
    }
    requestAnimationFrame(animate);
  }, [value]);

  return <span className={className}>{prefix}{displayed.toLocaleString()}{suffix}</span>;
}

export function LiveTicker({ items }: { items: { label: string; value: string; change?: string; positive?: boolean }[] }) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % items.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [items.length]);

  const item = items[activeIdx];

  return (
    <div className="bg-slate-900 rounded-lg px-3 py-2 flex items-center justify-between overflow-hidden">
      <div className="flex items-center gap-2 animate-fade-in">
        <LiveDot />
        <span className="text-[11px] text-slate-300">{item.label}</span>
      </div>
      <div className="flex items-center gap-2 animate-fade-in">
        <span className="text-[11px] kpi-value text-white">{item.value}</span>
        {item.change && (
          <span className={`text-[10px] kpi-value ${item.positive ? "text-emerald-400" : "text-red-400"}`}>
            {item.change}
          </span>
        )}
      </div>
    </div>
  );
}
