"use client"

import { useEffect, useState } from "react"
import { ContextHeader } from "@/components/context-header"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fetchAPI } from "@/lib/api"
import type { RoleItem } from "@/lib/types"
import { Plus, ChevronDown, ChevronRight, Shield } from "lucide-react"

interface Permission {
  resource: string
  action: string
  scope: string
}

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<Record<string, Permission[]>>({})

  useEffect(() => {
    fetchAPI<RoleItem[]>("/api/v1/rbac/roles").then(setRoles)
  }, [])

  const loadPermissions = (roleId: string) => {
    if (permissions[roleId]) return
    fetchAPI<Permission[]>(`/api/v1/rbac/roles/${roleId}/permissions`).then((perms) => {
      setPermissions((prev) => ({ ...prev, [roleId]: perms }))
    })
  }

  const toggleExpand = (roleId: string) => {
    if (expandedId === roleId) {
      setExpandedId(null)
    } else {
      setExpandedId(roleId)
      loadPermissions(roleId)
    }
  }

  const scopeBadge: Record<string, string> = {
    all: "text-blue-400 bg-blue-400/10",
    area: "text-cyan-400 bg-cyan-400/10",
    own: "text-amber-400 bg-amber-400/10",
  }

  return (
    <div className="min-h-full bg-[#0a0e14] text-white/80 flex flex-col">
      <ContextHeader title="ロール管理" description="ユーザーロールと権限設定" />

      <div className="px-5 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-white/40">{roles.length}件のロール</span>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-400/20 text-[12px] h-8">
                <Plus className="w-3.5 h-3.5 mr-1.5" />新規ロール
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0c1017] border-white/[0.1] text-white/80">
              <DialogHeader><DialogTitle className="text-white/90">新規ロール作成</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><label className="text-[11px] text-white/50 block mb-1">ロール名（英字）</label><Input className="bg-white/[0.04] border-white/[0.08] text-white/80" placeholder="例: regional_manager" /></div>
                <div><label className="text-[11px] text-white/50 block mb-1">表示名</label><Input className="bg-white/[0.04] border-white/[0.08] text-white/80" placeholder="例: エリアマネージャー" /></div>
                <div><label className="text-[11px] text-white/50 block mb-1">説明</label><Input className="bg-white/[0.04] border-white/[0.08] text-white/80" placeholder="ロールの概要" /></div>
                <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white">作成</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-lg border border-white/[0.06] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead><tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="w-8 px-2"></th>
              <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">ロール名</th>
              <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">表示名</th>
              <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">説明</th>
              <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">システムロール</th>
              <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">権限数</th>
            </tr></thead>
            <tbody>
              {roles.map((r) => (
                <>
                  <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer" onClick={() => toggleExpand(r.id)}>
                    <td className="px-2 text-white/30">{expandedId === r.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-white/60">{r.name}</td>
                    <td className="px-4 py-3 text-white/80 font-medium">{r.display_name}</td>
                    <td className="px-4 py-3 text-white/50 text-[12px]">{r.description || "-"}</td>
                    <td className="px-4 py-3">
                      {r.is_system
                        ? <span className="flex items-center gap-1 text-[10px] text-blue-400"><Shield className="w-3 h-3" />システム</span>
                        : <span className="text-[10px] text-white/30">カスタム</span>}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-white/50">{r.permission_count ?? 0}</td>
                  </tr>
                  {expandedId === r.id && (
                    <tr key={`${r.id}-perms`} className="bg-white/[0.01]">
                      <td colSpan={6} className="px-8 py-4">
                        <div className="text-[11px] text-white/40 mb-2">権限一覧</div>
                        {permissions[r.id] && permissions[r.id].length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {permissions[r.id].map((p, i) => (
                              <div key={i} className="rounded border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] flex items-center gap-2">
                                <span className="text-white/70 font-medium">{p.resource}</span>
                                <span className="text-white/30">:</span>
                                <span className="text-cyan-400/80">{p.action}</span>
                                <span className={`ml-auto text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${scopeBadge[p.scope] || "text-white/40 bg-white/[0.04]"}`}>{p.scope}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] text-white/30">権限情報を読み込み中...</div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
