"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
} from "recharts"

interface ProductDetail {
  id: string
  name: string
  brand_name: string
  category: string
  price: number
  theoretical_cost: number
  cost_rate: number
  monthly_sales: number
  elasticity: number
  elasticity_ci: number[]
  monthly_trend: { month: string; sales: number; quantity: number }[]
  price_history: { date: string; old_price: number; new_price: number; reason: string; actual_volume_change: string }[]
  bom: { ingredient: string; quantity: number; unit: string; unit_price: number; subtotal: number }[]
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [product, setProduct] = useState<ProductDetail | null>(null)

  useEffect(() => {
    fetchAPI<ProductDetail>(`/api/v1/vertical/products/${id}`).then(setProduct)
  }, [id])

  if (!product) {
    return (
      <div className="min-h-full bg-[#0a0e14] text-white/80 flex items-center justify-center">
        <div className="text-white/40 text-[13px]">読み込み中...</div>
      </div>
    )
  }

  const absElasticity = Math.abs(product.elasticity)
  const elasticityLabel =
    absElasticity < 0.5 ? "非弾力的 — 値上げ余地あり" :
    absElasticity < 1.0 ? "中程度 — 慎重に判断" :
    "弾力的 — 値上げ注意"
  const elasticityColor =
    absElasticity < 0.5 ? "text-emerald-400" :
    absElasticity < 1.0 ? "text-amber-400" :
    "text-red-400"

  const bomTotal = product.bom.reduce((s, b) => s + b.subtotal, 0)

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#0a0e14] text-white/80">
      <ContextHeader
        title={product.name}
        description={`${product.brand_name} · ${product.category}`}
        actions={
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[11px] text-white/50 hover:text-white/80 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />戻る
          </button>
        }
      />

      <div className="px-6 py-5 space-y-5">
        {/* Brand badge */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-400/10 border border-blue-400/20 text-blue-400 uppercase tracking-wider">
            {product.brand_name}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-white/50">
            {product.category}
          </span>
          <span className="text-[10px] text-white/30 font-mono">{product.id}</span>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="売価" value={`¥${product.price.toLocaleString()}`} tone="white" />
          <KpiCard label="理論原価" value={`¥${product.theoretical_cost.toLocaleString()}`} tone="blue" />
          <KpiCard label="原価率" value={`${product.cost_rate}%`} tone={product.cost_rate > 35 ? "amber" : "emerald"} />
          <KpiCard label="月間販売数" value={`${product.monthly_sales.toLocaleString()}`} tone="emerald" />
        </div>

        {/* Section 1: 売上・数量推移 */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-3 font-semibold">
            売上・数量推移（12ヶ月）
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={product.monthly_trend} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                tickFormatter={(v: string) => v.slice(5)} />
              <YAxis yAxisId="left" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                tickFormatter={(v: number) => `¥${(v / 1000000).toFixed(0)}M`}
                label={{ value: "売上", angle: -90, position: "insideLeft", fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                label={{ value: "数量", angle: 90, position: "insideRight", fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
              <RechartsTooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                itemStyle={{ color: "rgba(255,255,255,0.7)" }}
                formatter={(value: number, name: string) => {
                  if (name === "売上") return [`¥${value.toLocaleString()}`, name]
                  return [value.toLocaleString(), name]
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }} />
              <Line yAxisId="left" type="monotone" dataKey="sales" name="売上" stroke="#60a5fa" strokeWidth={2} dot={{ r: 2 }} />
              <Line yAxisId="right" type="monotone" dataKey="quantity" name="数量" stroke="#34d399" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Section 2: 価格弾力性 */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-3 font-semibold">
            価格弾力性
          </div>
          <div className="flex items-center gap-6">
            <div>
              <div className="text-[10px] text-white/40 mb-1">弾力性係数</div>
              <div className={`font-mono tabular-nums text-2xl font-semibold ${elasticityColor}`}>
                {product.elasticity.toFixed(2)}
              </div>
              <div className="text-[10px] text-white/30 mt-1 font-mono">
                95% CI [{product.elasticity_ci[0].toFixed(2)}, {product.elasticity_ci[1].toFixed(2)}]
              </div>
            </div>
            <div className={`rounded-md border px-4 py-2 ${
              absElasticity < 0.5 ? "border-emerald-400/20 bg-emerald-400/[0.04]" :
              absElasticity < 1.0 ? "border-amber-400/20 bg-amber-400/[0.04]" :
              "border-red-400/20 bg-red-400/[0.04]"
            }`}>
              <div className={`text-[12px] font-medium ${elasticityColor}`}>{elasticityLabel}</div>
              <div className="text-[10px] text-white/40 mt-0.5">
                |ε| = {absElasticity.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: 価格変更履歴 */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <div className="px-4 py-2 border-b border-white/[0.06]">
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
              価格変更履歴
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-white/30 border-b border-white/[0.06]">
                  <th className="text-left px-4 py-2 font-medium">変更日</th>
                  <th className="text-right px-3 py-2 font-medium">旧価格</th>
                  <th className="text-right px-3 py-2 font-medium">新価格</th>
                  <th className="text-left px-3 py-2 font-medium">変更理由</th>
                  <th className="text-right px-3 py-2 font-medium">実績影響</th>
                </tr>
              </thead>
              <tbody>
                {product.price_history.map((ph, i) => (
                  <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 font-mono tabular-nums text-white/60">{ph.date}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-white/50">¥{ph.old_price}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-white/80">¥{ph.new_price}</td>
                    <td className="px-3 py-2.5 text-white/60">{ph.reason}</td>
                    <td className={`px-3 py-2.5 text-right font-mono tabular-nums ${
                      ph.actual_volume_change.startsWith("+") ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {ph.actual_volume_change}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: レシピ・BOM */}
        {product.bom && product.bom.length > 0 && (
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <div className="px-4 py-2 border-b border-white/[0.06]">
              <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
                レシピ・BOM
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-white/30 border-b border-white/[0.06]">
                    <th className="text-left px-4 py-2 font-medium">食材名</th>
                    <th className="text-right px-3 py-2 font-medium">数量</th>
                    <th className="text-left px-3 py-2 font-medium">単位</th>
                    <th className="text-right px-3 py-2 font-medium">単価</th>
                    <th className="text-right px-3 py-2 font-medium">小計</th>
                  </tr>
                </thead>
                <tbody>
                  {product.bom.map((b, i) => (
                    <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-white/80">{b.ingredient}</td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-white/60">{b.quantity}</td>
                      <td className="px-3 py-2.5 text-white/50">{b.unit}</td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-white/60">¥{b.unit_price}</td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-white/80">¥{b.subtotal}</td>
                    </tr>
                  ))}
                  <tr className="bg-white/[0.02]">
                    <td colSpan={4} className="px-4 py-2.5 text-right font-medium text-white/60">合計</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-white font-semibold">¥{bomTotal}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function KpiCard({ label, value, tone }: { label: string; value: string; tone: "emerald" | "blue" | "amber" | "white" }) {
  const toneText = {
    emerald: "text-emerald-400", blue: "text-blue-400", amber: "text-amber-400", white: "text-white/85",
  }[tone]
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-colors">
      <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">{label}</div>
      <div className={`font-mono tabular-nums text-xl font-semibold ${toneText}`}>{value}</div>
    </div>
  )
}
