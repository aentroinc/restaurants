"use client"

import { useEffect, useState } from "react"
import { ContextHeader } from "@/components/context-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fetchAPI } from "@/lib/api"
import type { RecipeItem, IngredientItem } from "@/lib/types"
import { ChevronDown, ChevronRight } from "lucide-react"

const statusBadge: Record<string, string> = {
  active: "text-emerald-400 bg-emerald-400/10",
  draft: "text-amber-400 bg-amber-400/10",
  archived: "text-white/40 bg-white/[0.06]",
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<RecipeItem[]>([])
  const [ingredients, setIngredients] = useState<IngredientItem[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetchAPI<RecipeItem[]>("/api/v1/vertical/recipes").then(setRecipes)
    fetchAPI<IngredientItem[]>("/api/v1/vertical/ingredients").then(setIngredients)
  }, [])

  const avgTheoreticalCost = recipes.length ? Math.round(recipes.reduce((s, r) => s + (r.theoretical_cost || 0), 0) / recipes.length) : 0
  const avgActualCost = Math.round(avgTheoreticalCost * 1.08)

  return (
    <div className="min-h-full bg-[#0a0e14] text-white/80 flex flex-col">
      <ContextHeader title="レシピ・原価管理" description="レシピ定義と食材マスタの管理" />

      <div className="px-5 py-5">
        <Tabs defaultValue="recipes" className="w-full">
          <TabsList className="bg-white/[0.04] border border-white/[0.06]">
            <TabsTrigger value="recipes" className="data-[state=active]:bg-white/[0.08] data-[state=active]:text-white text-white/50">レシピ一覧</TabsTrigger>
            <TabsTrigger value="ingredients" className="data-[state=active]:bg-white/[0.08] data-[state=active]:text-white text-white/50">食材マスタ</TabsTrigger>
          </TabsList>

          <TabsContent value="recipes" className="mt-4">
            <div className="rounded-lg border border-white/[0.06] overflow-hidden">
              <table className="w-full text-[13px]">
                <thead><tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="w-8 px-2"></th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">商品名</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">バージョン</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">理論原価</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">BOM数</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">ステータス</th>
                </tr></thead>
                <tbody>
                  {recipes.map((r) => (
                    <>
                      <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                        <td className="px-2 text-white/30">{expandedId === r.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</td>
                        <td className="px-4 py-3 text-white/80 font-medium">{r.product_name}</td>
                        <td className="px-4 py-3 font-mono text-white/50">v{r.version}</td>
                        <td className="px-4 py-3 font-mono tabular-nums text-white/70">{r.theoretical_cost ? `¥${r.theoretical_cost}` : "-"}</td>
                        <td className="px-4 py-3 font-mono tabular-nums text-white/50">{r.bom_count}</td>
                        <td className="px-4 py-3"><span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${statusBadge[r.status] || statusBadge.draft}`}>{r.status}</span></td>
                      </tr>
                      {expandedId === r.id && (
                        <tr key={`${r.id}-detail`} className="bg-white/[0.01]">
                          <td colSpan={6} className="px-8 py-4">
                            <div className="text-[11px] text-white/40 mb-2">BOM構成（デモ）</div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                              {ingredients.slice(0, r.bom_count).map((ig) => (
                                <div key={ig.id} className="rounded border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px]">
                                  <span className="text-white/70">{ig.name}</span>
                                  <span className="text-white/30 ml-2">¥{ig.standard_cost_per_unit}/{ig.unit}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="ingredients" className="mt-4 space-y-4">
            {/* 原価サマリ */}
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-3">原価サマリ</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-[10px] text-white/40">平均理論原価</div>
                  <div className="font-mono tabular-nums text-xl text-white/80">¥{avgTheoreticalCost}</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/40">平均実原価</div>
                  <div className="font-mono tabular-nums text-xl text-white/80">¥{avgActualCost}</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/40">差異</div>
                  <div className="font-mono tabular-nums text-xl text-amber-400">+¥{avgActualCost - avgTheoreticalCost} ({((avgActualCost - avgTheoreticalCost) / avgTheoreticalCost * 100).toFixed(1)}%)</div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-white/[0.06] overflow-hidden">
              <table className="w-full text-[13px]">
                <thead><tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">食材名</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">単位</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">基準単価</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">保管温度</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">賞味期限</th>
                </tr></thead>
                <tbody>
                  {ingredients.map((ig) => (
                    <tr key={ig.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-white/80">{ig.name}</td>
                      <td className="px-4 py-3 text-white/50">{ig.unit}</td>
                      <td className="px-4 py-3 font-mono tabular-nums text-white/70">¥{ig.standard_cost_per_unit.toLocaleString()}</td>
                      <td className="px-4 py-3 text-white/50 text-[12px]">{ig.storage_temperature}</td>
                      <td className="px-4 py-3 font-mono tabular-nums text-white/50">{ig.shelf_life_days}日</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
