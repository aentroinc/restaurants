"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "./sidebar"
import { AIPanel } from "./ai-panel"
import { Button } from "@/components/ui/button"
import { PanelLeftClose, PanelLeftOpen, LogOut } from "lucide-react"
import { clearToken } from "@/lib/auth"

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const router = useRouter()

  function handleLogout() {
    clearToken()
    router.push("/auth/login")
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0e14] text-white/85">
      {/* Left Sidebar */}
      <Sidebar collapsed={collapsed} />

      {/* Center: collapse toggle + main content */}
      <div className="flex flex-1 min-w-0 flex-col overflow-hidden relative">
        {/* Floating sidebar collapse toggle (top-left of main area) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-3 left-3 z-30 h-7 w-7 text-white/40 hover:text-white/80 hover:bg-white/[0.04]"
          title={collapsed ? "サイドバーを開く" : "サイドバーを折り畳む"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>

        {/* Logout button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="absolute top-3 right-3 z-30 h-7 w-7 text-white/40 hover:text-white/80 hover:bg-white/[0.04]"
          title="ログアウト"
        >
          <LogOut className="h-4 w-4" />
        </Button>

        <main className="flex-1 overflow-y-auto bg-[#0a0e14] pl-10">
          {children}
        </main>
      </div>

      {/* Right AI Panel — fixed 320px, collapsible */}
      <AIPanel />
    </div>
  )
}
