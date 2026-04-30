"use client";

import { useEffect, useState } from "react";

export function LiveSalesCounter({ base }: { base: number }) {
  const [sales, setSales] = useState(base);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const add = Math.floor(Math.random() * 2500) + 500;
      setSales((prev) => prev + add);
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
    }, 4000 + Math.random() * 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <p
        className={`text-5xl font-black text-orange-900 tracking-tight transition-all duration-300 ${
          flash ? "scale-105 text-green-600" : ""
        }`}
      >
        ¥{sales.toLocaleString()}
      </p>
      {flash && (
        <span className="absolute -right-1 top-0 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full animate-bounce">
          +チャリン！
        </span>
      )}
      <div className="flex items-center gap-1 mt-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <span className="text-xs text-green-600">リアルタイム更新中</span>
      </div>
    </div>
  );
}
