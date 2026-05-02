"use client"

import { useEffect, useState } from "react"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import { Shield, Lock, Eye, FileDown } from "lucide-react"

interface ColumnPolicy {
  id: string
  resource_name: string
  column_name: string
  action: string
  mask_type: string
  enabled: boolean
}

interface PIISummary {
  pii_type: string
  total_occurrences: number
}

interface PIILog {
  id: string
  pii_type: string
  redaction_method: string
  occurrences: number
  resource_type: string
  created_at: string
}

const PII_LABEL: Record<string, string> = {
  email: "メールアドレス",
  phone_jp: "電話番号",
  name_jp: "氏名",
  employee_id: "社員ID",
  postal_jp: "郵便番号",
  credit_card: "クレジットカード",
}

export default function SecurityAdminPage() {
  const [policies, setPolicies] = useState<ColumnPolicy[]>([])
  const [logs, setLogs] = useState<PIILog[]>([])
  const [summary, setSummary] = useState<PIISummary[]>([])

  useEffect(() => {
    fetchAPI<{ data: ColumnPolicy[] } | ColumnPolicy[]>("/api/v1/admin/security/column-policies").then((d) => {
      setPolicies(Array.isArray(d) ? d : (d as any).data || [])
    })
    fetchAPI<{ data: PIILog[] } | PIILog[]>("/api/v1/admin/security/pii-redaction-logs").then((d) => {
      setLogs(Array.isArray(d) ? d : (d as any).data || [])
    })
    fetchAPI<{ data: PIISummary[] } | PIISummary[]>("/api/v1/admin/security/pii-redaction-summary").then((d) => {
      setSummary(Array.isArray(d) ? d : (d as any).data || [])
    })
  }, [])

  async function exportReviewPack() {
    const pack = await fetchAPI<any>("/api/v1/admin/security/security-review-pack/export", { method: "POST" })
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "security-review-pack.json"; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-screen">
      <ContextHeader title="Security Admin" description="列レベルマスク + PII 監査 + Security Review Pack" region="全社" />
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[14px] text-white/85">
            <Shield className="w-5 h-5 text-blue-400" />
            <span className="font-medium">エンタープライズセキュリティ</span>
          </div>
          <button onClick={exportReviewPack} className="flex items-center gap-1.5 px-4 py-2 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-[13px]">
            <FileDown className="w-4 h-4" /> Security Review Pack をダウンロード
          </button>
        </div>

        {/* Column policies */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
            <Lock className="w-4 h-4 text-white/50" />
            <span className="text-[12px] font-semibold text-white/60 tracking-wide uppercase">列レベルマスクポリシー ({policies.length})</span>
          </div>
          <table className="w-full text-[12px]">
            <thead className="text-white/40 border-b border-white/[0.04]">
              <tr>
                <th className="text-left px-5 py-2 font-medium">リソース</th>
                <th className="text-left px-3 py-2 font-medium">カラム</th>
                <th className="text-left px-3 py-2 font-medium">アクション</th>
                <th className="text-left px-3 py-2 font-medium">マスク種別</th>
                <th className="text-left px-3 py-2 font-medium">状態</th>
              </tr>
            </thead>
            <tbody className="text-white/75">
              {policies.map((p) => (
                <tr key={p.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="px-5 py-3 font-mono">{p.resource_name}</td>
                  <td className="px-3 py-3 font-mono text-blue-300">{p.column_name}</td>
                  <td className="px-3 py-3">{p.action}</td>
                  <td className="px-3 py-3">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">{p.mask_type}</span>
                  </td>
                  <td className="px-3 py-3 text-[10px]">
                    {p.enabled ? <span className="text-emerald-400">●有効</span> : <span className="text-white/30">○無効</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PII summary */}
        <div className="grid grid-cols-2 gap-5">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
              <Eye className="w-4 h-4 text-white/50" />
              <span className="text-[12px] font-semibold text-white/60 tracking-wide uppercase">PII redaction 累計</span>
            </div>
            <div className="p-5 space-y-2.5">
              {summary.map((s) => (
                <div key={s.pii_type} className="flex items-center justify-between">
                  <span className="text-[13px] text-white/75">{PII_LABEL[s.pii_type] || s.pii_type}</span>
                  <span className="text-[15px] font-mono text-amber-400">{s.total_occurrences.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <div className="px-5 py-3 border-b border-white/[0.06]">
              <span className="text-[12px] font-semibold text-white/60 tracking-wide uppercase">最近の redaction（最新 {logs.length} 件）</span>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {logs.map((l) => (
                <div key={l.id} className="px-5 py-2.5 border-b border-white/[0.03] flex items-center justify-between text-[12px]">
                  <div>
                    <span className="text-white/75">{PII_LABEL[l.pii_type] || l.pii_type}</span>
                    <span className="text-white/35 ml-2 text-[10px]">[{l.resource_type}]</span>
                  </div>
                  <div className="text-[10px] text-white/40">
                    <span className="font-mono text-amber-400">{l.occurrences}</span> 件
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
