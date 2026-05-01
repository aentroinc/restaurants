"use client"

import { useState } from "react"
import { Sidebar } from "./sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar collapsed={collapsed} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b bg-white px-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="text-gray-500">
              {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </Button>
            <div className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">開発環境</div>
          </div>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-600 text-white text-xs">管</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuItem>プロフィール</DropdownMenuItem>
                <DropdownMenuItem>設定</DropdownMenuItem>
                <DropdownMenuItem>ログアウト</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
