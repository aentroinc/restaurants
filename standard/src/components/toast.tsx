"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { CheckCircle, XCircle, AlertTriangle, X } from "lucide-react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "warning";
}

const ToastContext = createContext<{
  show: (message: string, type?: Toast["type"]) => void;
}>({ show: () => {} });

export const useToast = () => useContext(ToastContext);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const dismiss = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />,
    error: <XCircle className="w-5 h-5 text-red-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
  };

  const borders = {
    success: "border-emerald-500/30",
    error: "border-red-500/30",
    warning: "border-amber-500/30",
  };

  return (
    <ToastContext value={{ show }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none" style={{ width: 380 }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border ${borders[toast.type]} bg-[#141a24]/95 backdrop-blur-sm shadow-2xl animate-fade-in`}
          >
            {icons[toast.type]}
            <p className="text-[13px] text-white/80 flex-1 leading-relaxed">{toast.message}</p>
            <button onClick={() => dismiss(toast.id)} className="text-white/30 hover:text-white/60 shrink-0 mt-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}
