"use client"

import { useEffect, useState } from "react"
import { ContextHeader } from "@/components/context-header"
import { LoadingState, ErrorState, EmptyState } from "@/components/states"
import { fetchAPI } from "@/lib/api"

interface UserItem {
  id: string
  name: string
  email: string
  roles: string[]
  active: boolean
  created_at: string
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-500/15 text-red-400",
  executive: "bg-purple-500/15 text-purple-400",
  sv: "bg-blue-500/15 text-blue-400",
  manager: "bg-green-500/15 text-green-400",
  viewer: "bg-white/10 text-white/50",
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)

  useEffect(() => {
    fetchAPI<UserItem[]>("/api/v1/rbac/users")
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6"><ContextHeader title="ユーザー管理" /><LoadingState /></div>
  if (error) return <div className="p-6"><ContextHeader title="ユーザー管理" /><ErrorState message={error} /></div>
  if (!users.length) return <div className="p-6"><ContextHeader title="ユーザー管理" /><EmptyState /></div>

  return (
    <div className="p-6 space-y-6">
      <ContextHeader title="ユーザー管理" />

      <div className="flex gap-6">
        {/* Table */}
        <div className="flex-1 border border-white/[0.06] rounded-xl overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left px-4 py-2.5 text-white/40 font-medium">名前</th>
                <th className="text-left px-4 py-2.5 text-white/40 font-medium">メール</th>
                <th className="text-left px-4 py-2.5 text-white/40 font-medium">ロール</th>
                <th className="text-left px-4 py-2.5 text-white/40 font-medium">アクティブ</th>
                <th className="text-left px-4 py-2.5 text-white/40 font-medium">作成日</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`border-b border-white/[0.04] cursor-pointer transition ${
                    selectedUser?.id === user.id ? "bg-blue-500/[0.06]" : "hover:bg-white/[0.02]"
                  }`}
                >
                  <td className="px-4 py-2.5 text-white/80">{user.name}</td>
                  <td className="px-4 py-2.5 text-white/50 font-mono">{user.email}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 flex-wrap">
                      {user.roles.map((role) => (
                        <span key={role} className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${ROLE_COLORS[role] || "bg-white/10 text-white/50"}`}>
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block w-2 h-2 rounded-full ${user.active ? "bg-green-400" : "bg-white/20"}`} />
                  </td>
                  <td className="px-4 py-2.5 text-white/40 font-mono tabular-nums">{user.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detail Sheet */}
        {selectedUser && (
          <div className="w-[320px] border border-white/[0.06] rounded-xl p-5 space-y-4 bg-white/[0.01]">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] text-white/90 font-medium">{selectedUser.name}</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-white/30 hover:text-white/60 text-[16px]"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-[12px]">
              <div>
                <span className="text-white/40">メール</span>
                <p className="text-white/70 font-mono mt-0.5">{selectedUser.email}</p>
              </div>
              <div>
                <span className="text-white/40">ステータス</span>
                <p className="mt-0.5">
                  <span className={`inline-flex items-center gap-1.5 text-[11px] ${selectedUser.active ? "text-green-400" : "text-white/40"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedUser.active ? "bg-green-400" : "bg-white/20"}`} />
                    {selectedUser.active ? "アクティブ" : "無効"}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-white/40">ロール</span>
                <div className="flex gap-1.5 flex-wrap mt-1">
                  {selectedUser.roles.map((role) => (
                    <span key={role} className={`inline-block px-2.5 py-1 rounded text-[11px] font-medium ${ROLE_COLORS[role] || "bg-white/10 text-white/50"}`}>
                      {role}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-white/40">作成日</span>
                <p className="text-white/70 font-mono mt-0.5">{selectedUser.created_at}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
