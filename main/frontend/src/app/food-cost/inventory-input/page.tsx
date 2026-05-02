"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ContextHeader } from "@/components/context-header"
import {
  submitInventoryCount,
  computeVariance,
  demoStores,
  demoIngredients,
  type InventoryCountRow,
} from "@/lib/food-cost-api"
import { Save, Calculator, ArrowLeft, CheckCircle2 } from "lucide-react"

const DEFAULT_PERIOD = "2026-04-30"

interface RowEntry {
  ingredient_id: string
  ingredient_name: string
  unit: string
  qty_actual: string // text input
  unit_cost: string
}

const DEFAULT_UNITS: Record<string, string> = {
  "i-beef": "g",
  "i-rice": "g",
  "i-onion": "kg",
  "i-egg": "個",
  "i-cheese": "g",
  "i-tomato": "kg",
  "i-pasta": "g",
  "i-shrimp": "g",
}

const DEFAULT_PRICE: Record<string, string> = {
  "i-beef": "2.0",
  "i-rice": "0.5",
  "i-onion": "120",
  "i-egg": "20",
  "i-cheese": "1.5",
  "i-tomato": "200",
  "i-pasta": "0.6",
  "i-shrimp": "3.5",
}

export default function InventoryInputPage() {
  const [storeId, setStoreId] = useState<string>(demoStores[0]?.id || "")
  const [countDate, setCountDate] = useState<string>(DEFAULT_PERIOD)
  const [rows, setRows] = useState<RowEntry[]>([])
  const [savedCount, setSavedCount] = useState<number | null>(null)
  const [computeResult, setComputeResult] = useState<{ theoretical_count: number; variance_count: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [computing, setComputing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRows(
      demoIngredients.map((ig) => ({
        ingredient_id: ig.id,
        ingredient_name: ig.name,
        unit: DEFAULT_UNITS[ig.id] || "g",
        qty_actual: "",
        unit_cost: DEFAULT_PRICE[ig.id] || "0",
      })),
    )
  }, [])

  const totalEntered = useMemo(() => rows.filter((r) => r.qty_actual && Number(r.qty_actual) > 0).length, [rows])

  function updateRow(idx: number, key: keyof RowEntry, value: string) {
    setRows((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [key]: value }
      return next
    })
  }

  async function handleSave() {
    setSubmitting(true)
    setError(null)
    try {
      const payload: InventoryCountRow[] = rows
        .filter((r) => r.qty_actual && Number(r.qty_actual) > 0)
        .map((r) => ({
          store_id: storeId,
          count_date: countDate,
          ingredient_id: r.ingredient_id,
          qty_actual: Number(r.qty_actual),
          unit_cost: Number(r.unit_cost) || 0,
        }))
      if (payload.length === 0) {
        setError("数量が入力されていません")
        return
      }
      const result = await submitInventoryCount(payload)
      setSavedCount(result.inserted)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCompute() {
    setComputing(true)
    setError(null)
    try {
      const result = await computeVariance(storeId, countDate)
      setComputeResult(result)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setComputing(false)
    }
  }

  return (
    <div className="min-h-full bg-[#0a0e14] text-white/80">
      <ContextHeader
        title="棚卸入力"
        description="食材ごとの実残数量を入力し、理論原価との差分計算を起動"
      />
      <div className="px-5 py-5 space-y-5 max-w-5xl">
        <Link
          href="/food-cost"
          className="inline-flex items-center gap-1.5 text-[11px] text-blue-400 hover:text-blue-300"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          ヒートマップへ戻る
        </Link>

        {/* meta */}
        <section className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">店舗</label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.08] text-[13px] text-white/85 focus:outline-none focus:ring-1 focus:ring-blue-400/50"
            >
              {demoStores.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#0c1017]">
                  {s.name}（{s.code}）
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">棚卸日</label>
            <input
              type="date"
              value={countDate}
              onChange={(e) => setCountDate(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.08] text-[13px] text-white/85 focus:outline-none focus:ring-1 focus:ring-blue-400/50"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">入力済み件数</label>
            <div className="font-mono tabular-nums text-base text-white/85 px-3 py-2">{totalEntered} / {rows.length}</div>
          </div>
        </section>

        {/* table */}
        <section className="rounded-lg border border-white/[0.06] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">食材</th>
                <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">単位</th>
                <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">実残数量</th>
                <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">単価 (¥/単位)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.ingredient_id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-4 py-2 text-white/85">{r.ingredient_name}</td>
                  <td className="px-4 py-2 text-white/50">{r.unit}</td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={r.qty_actual}
                      onChange={(e) => updateRow(idx, "qty_actual", e.target.value)}
                      placeholder="0"
                      className="w-32 px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-[13px] text-white/85 font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-blue-400/50"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={r.unit_cost}
                      onChange={(e) => updateRow(idx, "unit_cost", e.target.value)}
                      className="w-24 px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-[13px] text-white/85 font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-blue-400/50"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {error && (
          <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-[12px] text-red-300">
            {error}
          </div>
        )}

        {/* actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSave}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-blue-400/30 bg-blue-500/15 text-blue-200 hover:bg-blue-500/25 disabled:opacity-50 transition-colors text-[13px]"
          >
            <Save className="w-4 h-4" />
            {submitting ? "保存中..." : "棚卸を保存"}
          </button>
          <button
            onClick={handleCompute}
            disabled={computing || savedCount === null}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-emerald-400/30 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50 transition-colors text-[13px]"
            title={savedCount === null ? "先に棚卸を保存してください" : ""}
          >
            <Calculator className="w-4 h-4" />
            {computing ? "計算中..." : "理論原価 × 差分を再計算"}
          </button>

          {savedCount !== null && (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
              {savedCount} 件を保存しました
            </span>
          )}
          {computeResult && (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
              理論 {computeResult.theoretical_count} 食材 / 差分 {computeResult.variance_count} 件を再計算
            </span>
          )}

          <Link
            href={`/food-cost/${storeId}`}
            className="ml-auto text-[12px] px-3 py-1.5 rounded-md border border-white/[0.08] text-white/70 hover:bg-white/[0.04]"
          >
            この店舗の詳細を見る →
          </Link>
        </div>
      </div>
    </div>
  )
}
