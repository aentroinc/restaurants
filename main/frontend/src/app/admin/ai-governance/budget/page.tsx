"use client"

import { useEffect, useState } from "react"
import { authHeaders } from "@/lib/auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

type BudgetStatus = {
  monthly_budget_jpy: number
  soft_limit_pct: number
  hard_limit_pct: number
  overage_policy: string
  used_jpy: number
  ratio: number
  status: string
}

type UsageRow = {
  month: string | null
  model: string
  calls: number
  input_tokens: number
  output_tokens: number
  cost_jpy: number
}

type RoleTools = {
  tools: { name: string; description: string }[]
  matrix: Record<string, string[]>
}

type Refusal = {
  id: string
  timestamp: string | null
  user_message: string
  reason: string
  is_false_positive: boolean | null
}

export default function AIGovernanceBudgetPage() {
  const [budget, setBudget] = useState<BudgetStatus | null>(null)
  const [usage, setUsage] = useState<UsageRow[]>([])
  const [roleTools, setRoleTools] = useState<RoleTools | null>(null)
  const [refusals, setRefusals] = useState<Refusal[]>([])
  const [editing, setEditing] = useState(false)
  const [draftBudget, setDraftBudget] = useState<string>("")
  const [draftSoft, setDraftSoft] = useState<string>("")
  const [draftPolicy, setDraftPolicy] = useState<string>("block")

  async function loadAll() {
    if (!API_URL) return
    const opts = { headers: { ...authHeaders() } }
    const [b, u, r, f] = await Promise.all([
      fetch(`${API_URL}/api/v1/ai-governance/budget`, opts).then((x) => x.json()),
      fetch(`${API_URL}/api/v1/ai-governance/usage`, opts).then((x) => x.json()),
      fetch(`${API_URL}/api/v1/ai-governance/role-tools`, opts).then((x) => x.json()),
      fetch(`${API_URL}/api/v1/ai-governance/refusals`, opts).then((x) => x.json()),
    ])
    setBudget(b)
    setUsage(u.usage || [])
    setRoleTools(r)
    setRefusals(f.refusals || [])
    setDraftBudget(String(b.monthly_budget_jpy))
    setDraftSoft(String(b.soft_limit_pct))
    setDraftPolicy(b.overage_policy)
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function saveBudget() {
    if (!API_URL) return
    const r = await fetch(`${API_URL}/api/v1/ai-governance/budget`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        monthly_budget_jpy: Number(draftBudget) || 0,
        soft_limit_pct: Number(draftSoft) || 0.8,
        overage_policy: draftPolicy,
      }),
    })
    if (r.ok) {
      setEditing(false)
      loadAll()
    }
  }

  if (!API_URL) {
    return <div className="p-6 text-sm text-slate-500">バックエンド未接続。NEXT_PUBLIC_API_URL を設定してください。</div>
  }
  if (!budget) return <div className="p-6">読み込み中...</div>

  const ratioPct = Math.round((budget.ratio || 0) * 100)
  const softPct = Math.round((budget.soft_limit_pct || 0) * 100)
  const ratioColor = ratioPct >= 100 ? "bg-red-500" : ratioPct >= softPct ? "bg-amber-500" : "bg-emerald-500"

  return (
    <div className="p-6 max-w-6xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">AI ガバナンス（予算・コスト・権限）</h1>
        <p className="text-sm text-slate-500">テナント月次予算 / role × tool / refusal を一括管理</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="月次予算" value={`¥${budget.monthly_budget_jpy.toLocaleString()}`} hint={`${budget.overage_policy === "block" ? "超過時拒否" : budget.overage_policy}`} />
        <Card title="今月使用" value={`¥${Math.round(budget.used_jpy).toLocaleString()}`} hint={`${ratioPct}% 消費 (soft ${softPct}%)`} />
        <Card title="状態" value={budget.status === "hard_limit" ? "🔴 上限到達" : budget.status === "soft_warning" ? "🟡 警戒" : "🟢 通常"} hint={budget.status} />
        <Card title="モデル数" value={String(usage.length || 0)} hint="今月の利用モデル数" />
      </section>

      <section className="rounded-lg border bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-medium">予算進捗</h2>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="text-xs text-slate-700 underline">編集</button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="text-xs text-slate-500 underline">キャンセル</button>
              <button onClick={saveBudget} className="text-xs rounded bg-slate-900 px-2 py-1 text-white">保存</button>
            </div>
          )}
        </div>
        <div className="h-3 rounded bg-slate-100 overflow-hidden">
          <div className={`h-full ${ratioColor} transition-all`} style={{ width: `${Math.min(ratioPct, 100)}%` }} />
        </div>
        {editing && (
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <label className="space-y-1">
              <span className="text-xs text-slate-500">月次予算 (JPY)</span>
              <input value={draftBudget} onChange={(e) => setDraftBudget(e.target.value)} className="w-full rounded border px-2 py-1" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-slate-500">soft limit (0-1)</span>
              <input value={draftSoft} onChange={(e) => setDraftSoft(e.target.value)} className="w-full rounded border px-2 py-1" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-slate-500">超過ポリシー</span>
              <select value={draftPolicy} onChange={(e) => setDraftPolicy(e.target.value)} className="w-full rounded border px-2 py-1">
                <option value="block">block (拒否)</option>
                <option value="throttle">throttle</option>
                <option value="bill">bill (超過課金)</option>
              </select>
            </label>
          </div>
        )}
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-medium">月次コスト推移</h2>
        {usage.length === 0 ? (
          <p className="text-xs text-slate-500">データなし</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs">
              <tr>
                <th className="text-left px-2 py-1">月</th>
                <th className="text-left px-2 py-1">モデル</th>
                <th className="text-right px-2 py-1">呼出数</th>
                <th className="text-right px-2 py-1">入力 tok</th>
                <th className="text-right px-2 py-1">出力 tok</th>
                <th className="text-right px-2 py-1">コスト (JPY)</th>
              </tr>
            </thead>
            <tbody>
              {usage.map((u, i) => (
                <tr key={i} className="border-t text-xs">
                  <td className="px-2 py-1">{u.month?.slice(0, 7) ?? "—"}</td>
                  <td className="px-2 py-1 font-mono">{u.model}</td>
                  <td className="px-2 py-1 text-right">{u.calls.toLocaleString()}</td>
                  <td className="px-2 py-1 text-right">{u.input_tokens.toLocaleString()}</td>
                  <td className="px-2 py-1 text-right">{u.output_tokens.toLocaleString()}</td>
                  <td className="px-2 py-1 text-right">¥{Math.round(u.cost_jpy).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-medium">Role × Tool マトリクス</h2>
        {!roleTools ? null : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-2 py-1">Role</th>
                  {roleTools.tools.map((t) => (
                    <th key={t.name} className="text-left px-2 py-1 font-mono">{t.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(roleTools.matrix).map(([role, allowed]) => (
                  <tr key={role} className="border-t">
                    <td className="px-2 py-1 font-medium">{role}</td>
                    {roleTools.tools.map((t) => (
                      <td key={t.name} className="px-2 py-1">
                        {allowed.includes("*") || allowed.includes(t.name) ? (
                          <span className="text-emerald-600">✓</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 font-medium">直近の Refusal</h2>
        {refusals.length === 0 ? (
          <p className="text-xs text-slate-500">直近の拒否はありません</p>
        ) : (
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-2 py-1">時刻</th>
                <th className="text-left px-2 py-1">理由</th>
                <th className="text-left px-2 py-1">メッセージ</th>
                <th className="text-left px-2 py-1">FP?</th>
              </tr>
            </thead>
            <tbody>
              {refusals.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-2 py-1">{r.timestamp?.slice(0, 19).replace("T", " ") ?? "—"}</td>
                  <td className="px-2 py-1 font-mono">{r.reason}</td>
                  <td className="px-2 py-1">{r.user_message.slice(0, 80)}</td>
                  <td className="px-2 py-1">
                    {r.is_false_positive == null ? "未判定" : r.is_false_positive ? "FP" : "正当"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

function Card({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}
