"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export function FoldableMethod() {
  const [open, setOpen] = useState(false)

  const formulas: Array<{ label: string; formula: string; note: string }> = [
    {
      label: "廃棄ロスの削減",
      formula: "捨てた食材の量 × 仕入れ値",
      note:
        "POS の売上データと仕入実績から、毎日自動で計算します。仕入れ値は商品マスタの最新値を使います。",
    },
    {
      label: "欠品による機会損失の削減",
      formula: "品切れの時間 × その時間帯の平均売上 × 粗利率",
      note:
        "POS で売上ゼロの時間が続いた区間と、発注・在庫データから品切れの時間を特定。同じ時間帯の他店の売上を使って、いくら売り逃したかを円に換算します。",
    },
    {
      label: "人件費の最適化",
      formula: "減らせた労働時間 × 平均時給",
      note:
        "勤怠データから減らせた労働時間を出します。時給は給与システムの数字、または人件費率からの推定値を使います。",
    },
    {
      label: "経営の作業時間削減",
      formula: "節約できた時間 × 平均時給",
      note:
        "事前のヒアリングと作業ログから、実際の作業時間を測ります。時給は経営企画や本社部門の単価を使います。",
    },
  ]

  return (
    <div className="mt-8 max-w-4xl">
      <button
        onClick={() => setOpen(!open)}
        className="w-full border border-white/[0.06] bg-white/[0.02] rounded-xl px-5 py-4 flex items-center justify-between hover:border-white/[0.12] transition-colors"
      >
        <span className="text-[13px] font-medium text-white/85">
          各効果の計算式（詳細）
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-white/55 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="mt-3 border border-white/[0.06] bg-white/[0.02] rounded-xl p-5 lg:p-6">
          <div className="grid sm:grid-cols-2 gap-4">
            {formulas.map((f) => (
              <div
                key={f.label}
                className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-4"
              >
                <div className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-1.5">
                  {f.label}
                </div>
                <div className="font-mono text-[13px] text-emerald-400 mb-2">
                  = {f.formula}
                </div>
                <p className="text-[12px] text-white/55 leading-relaxed">
                  {f.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
