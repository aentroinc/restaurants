"use client"

/**
 * 統一 Toast: 成功 / エラー / 情報。3 秒で自動消滅。
 *
 * Provider を 3 アプリの layout でラップする想定だが、依存しない単独 hook も提供。
 * `import { toast } from '@/components/common/Toast'` で global からも呼べる。
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react"

export type ToastKind = "success" | "error" | "info"

export interface ToastItem {
  id: string
  kind: ToastKind
  message: string
  action?: { label: string; onClick: () => void }
  durationMs?: number
}

interface ToastCtxValue {
  show: (t: Omit<ToastItem, "id">) => string
  dismiss: (id: string) => void
}

const ToastCtx = createContext<ToastCtxValue | null>(null)

// Module-level fallback bus so `toast.*` works even outside a Provider.
type Listener = (t: ToastItem) => void
const listeners: Listener[] = []

function emit(t: Omit<ToastItem, "id">): string {
  const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const full: ToastItem = { id, durationMs: 3000, ...t }
  listeners.forEach((fn) => fn(full))
  return id
}

export const toast = {
  success: (message: string, opts?: Partial<ToastItem>) =>
    emit({ kind: "success", message, ...opts }),
  error: (message: string, opts?: Partial<ToastItem>) =>
    emit({ kind: "error", message, durationMs: 5000, ...opts }),
  info: (message: string, opts?: Partial<ToastItem>) =>
    emit({ kind: "info", message, ...opts }),
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const show = useCallback(
    (t: Omit<ToastItem, "id">): string => {
      const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const full: ToastItem = { id, durationMs: 3000, ...t }
      setItems((prev) => [...prev, full])
      if (full.durationMs && full.durationMs > 0) {
        setTimeout(() => dismiss(id), full.durationMs)
      }
      return id
    },
    [dismiss],
  )

  // wire module-level toast.* into provider
  useEffect(() => {
    const fn: Listener = (t) => {
      setItems((prev) => [...prev, t])
      if (t.durationMs && t.durationMs > 0) {
        setTimeout(() => dismiss(t.id), t.durationMs)
      }
    }
    listeners.push(fn)
    return () => {
      const i = listeners.indexOf(fn)
      if (i >= 0) listeners.splice(i, 1)
    }
  }, [dismiss])

  return (
    <ToastCtx.Provider value={{ show, dismiss }}>
      {children}
      <ToastViewport items={items} onDismiss={dismiss} />
    </ToastCtx.Provider>
  )
}

export function useToast(): ToastCtxValue {
  const ctx = useContext(ToastCtx)
  if (ctx) return ctx
  // フォールバック: Provider 外でも動かす
  return {
    show: (t) => emit(t),
    dismiss: () => {},
  }
}

function ToastViewport({
  items,
  onDismiss,
}: {
  items: ToastItem[]
  onDismiss: (id: string) => void
}) {
  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none"
      role="region"
      aria-label="通知"
    >
      {items.map((t) => (
        <ToastCard key={t.id} item={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  )
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const Icon =
    item.kind === "success" ? CheckCircle2 : item.kind === "error" ? AlertTriangle : Info
  const tone =
    item.kind === "success"
      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
      : item.kind === "error"
        ? "border-red-400/40 bg-red-500/10 text-red-100"
        : "border-blue-400/40 bg-blue-500/10 text-blue-100"
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2 backdrop-blur shadow-lg ${tone}`}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1 text-[13px] leading-snug whitespace-pre-line">{item.message}</div>
      {item.action && (
        <button
          type="button"
          onClick={() => {
            item.action!.onClick()
            onDismiss()
          }}
          className="text-[11px] font-semibold underline px-1 hover:opacity-80"
        >
          {item.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="閉じる"
        onClick={onDismiss}
        className="opacity-60 hover:opacity-100 -mr-1 p-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
