"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Search, ChevronRight, ArrowLeft } from "lucide-react"
import {
  HELP_CATEGORIES,
  HELP_ENTRIES,
  searchEntries,
  type HelpCategory,
} from "@/data/help-content"

export default function HelpPage() {
  const [query, setQuery] = useState("")
  const [activeCat, setActiveCat] = useState<HelpCategory | "all">("all")

  const filtered = useMemo(() => {
    if (query.trim()) return searchEntries(query)
    if (activeCat === "all") return HELP_ENTRIES
    return HELP_ENTRIES.filter((e) => e.category === activeCat)
  }, [query, activeCat])

  return (
    <div className="min-h-screen bg-[#0a0e14] text-white">
      <header className="sticky top-0 z-10 bg-[#0a0e14]/95 backdrop-blur border-b border-white/[0.08]">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/" className="-ml-2 p-2 text-white/60 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">ヘルプ・FAQ</h1>
          <span className="ml-auto text-[11px] text-white/40 font-mono">{HELP_ENTRIES.length} 件</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="search"
            placeholder="キーワードで検索 (例: PIN、廃棄、シフト)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-3 bg-white/[0.04] border border-white/10 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>

        {!query && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCat("all")}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition ${
                activeCat === "all" ? "bg-emerald-500 text-black" : "bg-white/[0.06] text-white/70 hover:bg-white/[0.1]"
              }`}
            >
              すべて
            </button>
            {HELP_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition ${
                  activeCat === c.id ? "bg-emerald-500 text-black" : "bg-white/[0.06] text-white/70 hover:bg-white/[0.1]"
                }`}
              >
                <span className="mr-1">{c.emoji}</span>
                {c.label}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-white/50 text-sm">
              該当する FAQ が見つかりません。
              <Link href="/support" className="block mt-3 text-emerald-400 underline">
                サポートへ問い合わせる →
              </Link>
            </div>
          )}
          {filtered.map((entry) => {
            const cat = HELP_CATEGORIES.find((c) => c.id === entry.category)
            return (
              <Link
                key={entry.id}
                href={`/help/${entry.id}`}
                className="block bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-lg p-4 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl shrink-0">{cat?.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium">{entry.question}</div>
                    <div className="text-[11px] text-white/40 mt-0.5">{cat?.label}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
                </div>
              </Link>
            )
          })}
        </div>

        <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="text-[13px] font-medium mb-1">解決しませんか？</div>
          <div className="text-[12px] text-white/60 mb-3">サポートチームにお問い合わせください。9:00 - 22:00 対応。</div>
          <Link
            href="/support"
            className="inline-flex items-center gap-1.5 bg-blue-500 hover:bg-blue-400 text-white text-[12px] font-semibold px-3 py-1.5 rounded-md"
          >
            お問い合わせフォーム
          </Link>
        </div>
      </main>
    </div>
  )
}
