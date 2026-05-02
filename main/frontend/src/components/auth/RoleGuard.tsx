"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { type CurrentUser, type UserRole, getCurrentUser, homePathForRole } from "@/lib/auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

interface Props {
  /** Roles allowed to view children. `admin` is always implicitly allowed. */
  allow: UserRole[]
  children: React.ReactNode
  /** Redirect target on auth failure. Defaults to /auth/login. */
  loginPath?: string
}

/**
 * Client-side gate. Calls /auth/me; if not authenticated, kicks to login.
 * If authenticated but with the wrong role, kicks to that role's home.
 *
 * In demo mode (no NEXT_PUBLIC_API_URL) `getCurrentUser()` returns a mock
 * manager — the gate is effectively a no-op so existing demo flows survive.
 */
export function RoleGuard({ allow, children, loginPath = "/login" }: Props) {
  const router = useRouter()
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined)

  // In demo / mock mode (no backend) we leave the gate fully open so existing
  // dev flows (browsing /manager, /staff, /sv without login) keep working.
  const mockMode = !API_URL

  useEffect(() => {
    if (mockMode) {
      setUser({} as CurrentUser)
      return
    }
    let alive = true
    getCurrentUser().then((u) => {
      if (!alive) return
      setUser(u)
      if (!u) {
        router.replace(loginPath)
        return
      }
      const roles = new Set<string>([...allow, "admin"])
      if (!roles.has(u.role)) {
        router.replace(homePathForRole(u.role))
      }
    })
    return () => {
      alive = false
    }
  }, [allow, loginPath, router, mockMode])

  if (mockMode) return <>{children}</>

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e14] text-white/60">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    )
  }
  if (!user) return null
  const roles = new Set<string>([...allow, "admin"])
  if (!roles.has(user.role)) return null
  return <>{children}</>
}

export default RoleGuard
