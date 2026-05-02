"use client"

import { useEffect } from "react"

/**
 * Reads the cached role/user-id from localStorage and binds Sentry user
 * context if the SDK was loaded by sentry.client.config.ts.
 */
export function SentryUserBinder({ role }: { role: "staff" | "manager" | "sv" }) {
  useEffect(() => {
    if (typeof window === "undefined") return
    const w = window as unknown as {
      Sentry?: { setUser: (u: Record<string, unknown> | null) => void; setTag: (k: string, v: string) => void }
    }
    if (!w.Sentry) return
    try {
      const id =
        localStorage.getItem(`${role}.user_id`) ||
        localStorage.getItem("user.id") ||
        "anonymous"
      w.Sentry.setUser({ id, role })
      w.Sentry.setTag("role", role)
    } catch {
      // ignore
    }
  }, [role])
  return null
}
