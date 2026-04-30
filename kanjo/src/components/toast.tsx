"use client";

import { createContext, useContext, useState, useCallback } from "react";

type Toast = { id: number; message: string };

const ToastContext = createContext<{ toast: (msg: string) => void }>({ toast: () => {} });

export function useToast() { return useContext(ToastContext); }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let counter = 0;

  const toast = useCallback((message: string) => {
    const id = Date.now() + (counter++);
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-20 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-lg animate-fade-in">
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
