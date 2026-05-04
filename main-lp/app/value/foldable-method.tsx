"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export function FoldableMethod() {
  const [open, setOpen] = useState(false)

  const formulas: Array<{ label: string; formula: string; note: string }> = [
    {
      label: "廃棄削減",
      formula: "廃棄数量 × 原価",
      note:
        "POS 売上と仕入実績から日次で算出。原価は商品マスタの最新値を使用。",
    },
    {
      label: "欠品削減",
      formula: "欠品時間 × 平均時間帯売上 × 粗利率",
      note:
        "POS の売上ゼロ連続区間と発注/在庫データから欠品時間を特定。同時間帯の他店売上で機会損失を換算。",
    },
    {
      label: "人時売上改善",
      formula: "削減人時 × 平均人件費",
      note:
        "勤怠データから削減人時を抽出。人件費は給与システム or 人件費率の推定値を使用。",
    },
    {
      label: "経営工数削減",
      formula: "削減時間 × 平均人件費",
      note:
        "事前ヒアリング + ログ計測で実工数を測定。経営企画 / 本社部門の人件費単価を使用。",
    },
  ]

  return (
    <div className="mt-8 max-w-4xl">
      <button
        onClick={() => setOpen(!open)}
        className="w-full border border-white/[0.06] bg-white/[0.02] rounded-xl px-5 py-4 flex items-center justify-between hover:border-white/[0.12] transition-colors"
      >
        <span className="text-[13px] font-medium text-white/85">
          各効果の計算式 (詳細)
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
