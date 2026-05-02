"use client"

import { useState } from "react"
import { authHeaders } from "@/lib/auth"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

type FormulaPreviewRow = Record<string, unknown> & { value: number | null }

const SAMPLE_FORMULAS: { label: string; formula: string }[] = [
  { label: "粗利率", formula: "({net_sales} - {cogs}) / {net_sales}" },
  { label: "FL比率", formula: "({labor_cost} + {cogs}) / {net_sales}" },
  { label: "人件費率", formula: "{labor_cost} / {net_sales}" },
  { label: "客単価", formula: "{net_sales} / {customer_count}" },
]

const COHORT_PRESETS = [
  {
    label: "首都圏 駅前 + 粗利率<25%",
    spec: {
      object_type: "Store",
      and: [
        { property: "trade_area_type", op: "==", value: "駅前" },
        { property: "prefecture", op: "in", value: ["東京都", "神奈川県", "埼玉県", "千葉県"] },
        { kpi: "gross_profit", op: "<", value: 0.25, period: { from: "2026-01-01", to: "2026-04-30" } },
      ],
    },
  },
  {
    label: "ロードサイド店",
    spec: {
      object_type: "Store",
      and: [{ property: "trade_area_type", op: "==", value: "ロードサイド" }],
    },
  },
]


export default function WorkspacePage() {
  const [formula, setFormula] = useState(SAMPLE_FORMULAS[0].formula)
  const [groupBy, setGroupBy] = useState("month")
  const [previewRows, setPreviewRows] = useState<FormulaPreviewRow[] | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const [cohortSpec, setCohortSpec] = useState(JSON.stringify(COHORT_PRESETS[0].spec, null, 2))
  const [cohortInstances, setCohortInstances] = useState<Record<string, unknown>[] | null>(null)
  const [cohortError, setCohortError] = useState<string | null>(null)
  const [cohortLoading, setCohortLoading] = useState(false)

  async function previewFormula() {
    setPreviewLoading(true)
    setPreviewError(null)
    try {
      const r = await fetch(`${API_URL}/api/v1/workspace-engine/preview-formula`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          formula,
          target_object_type: "Store",
          aggregation_axis: [groupBy],
        }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.detail || `HTTP ${r.status}`)
      }
      const body = (await r.json()) as { rows: FormulaPreviewRow[] }
      setPreviewRows(body.rows)
    } catch (err: unknown) {
      setPreviewError(err instanceof Error ? err.message : "preview failed")
    } finally {
      setPreviewLoading(false)
    }
  }

  async function runCohort() {
    setCohortLoading(true)
    setCohortError(null)
    try {
      const spec = JSON.parse(cohortSpec)
      const r = await fetch(`${API_URL}/api/v1/workspace-engine/run-cohort`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ spec }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.detail || `HTTP ${r.status}`)
      }
      const body = await r.json()
      setCohortInstances(body.instances || [])
    } catch (err: unknown) {
      setCohortError(err instanceof Error ? err.message : "cohort failed")
    } finally {
      setCohortLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">分析ワークスペース</h1>
        <p className="text-sm text-slate-500">
          Custom KPI 式を組み立て、コホートで店舗を絞り込み、保存・再利用する。
        </p>
      </header>

      <section className="rounded-lg border bg-white">
        <header className="border-b p-4">
          <h2 className="font-medium">Custom KPI Builder</h2>
          <p className="text-xs text-slate-500">
            {`{net_sales}, {cogs}, {labor_cost}, {customer_count}` + ` などのフィールドを参照できる安全な式`}
          </p>
        </header>
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {SAMPLE_FORMULAS.map((s) => (
              <button
                key={s.label}
                onClick={() => setFormula(s.formula)}
                className="rounded border px-3 py-1 text-xs hover:bg-slate-50"
              >
                {s.label}
              </button>
            ))}
          </div>
          <textarea
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            rows={3}
            className="w-full rounded border px-3 py-2 font-mono text-sm"
          />
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-600">集約軸</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="rounded border px-2 py-1 text-sm"
            >
              <option value="month">月次</option>
              <option value="brand">ブランド別</option>
              <option value="region">地域別</option>
              <option value="store">店舗別</option>
            </select>
            <button
              onClick={previewFormula}
              disabled={previewLoading}
              className="rounded bg-slate-900 px-4 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {previewLoading ? "計算中..." : "プレビュー"}
            </button>
          </div>
          {previewError && (
            <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{previewError}</p>
          )}
          {previewRows && (
            <div className="rounded border overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {Object.keys(previewRows[0] || {}).map((k) => (
                      <th key={k} className="px-3 py-2 text-left text-xs font-medium text-slate-700">
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-t">
                      {Object.entries(row).map(([k, v]) => (
                        <td key={k} className="px-3 py-1.5 text-xs">
                          {v == null ? "—" : String(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border bg-white">
        <header className="border-b p-4">
          <h2 className="font-medium">コホートビルダー</h2>
          <p className="text-xs text-slate-500">
            条件で店舗を絞り込み、結果を保存・再利用する。
          </p>
        </header>
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {COHORT_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setCohortSpec(JSON.stringify(p.spec, null, 2))}
                className="rounded border px-3 py-1 text-xs hover:bg-slate-50"
              >
                {p.label}
              </button>
            ))}
          </div>
          <textarea
            value={cohortSpec}
            onChange={(e) => setCohortSpec(e.target.value)}
            rows={10}
            className="w-full rounded border px-3 py-2 font-mono text-xs"
          />
          <button
            onClick={runCohort}
            disabled={cohortLoading}
            className="rounded bg-slate-900 px-4 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {cohortLoading ? "実行中..." : "実行"}
          </button>
          {cohortError && (
            <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{cohortError}</p>
          )}
          {cohortInstances && (
            <div className="rounded border overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {(["code", "name", "brand", "region", "prefecture", "trade_area_type"]).map((k) => (
                      <th key={k} className="px-3 py-2 text-left text-xs font-medium text-slate-700">
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cohortInstances.map((row, i) => (
                    <tr key={i} className="border-t">
                      {(["code", "name", "brand", "region", "prefecture", "trade_area_type"]).map((k) => (
                        <td key={k} className="px-3 py-1.5 text-xs">
                          {row[k] == null ? "—" : String(row[k])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t bg-slate-50 px-3 py-2 text-xs text-slate-500">
                {cohortInstances.length} 件
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
