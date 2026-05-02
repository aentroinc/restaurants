"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, MessageCircle, Phone } from "lucide-react"
import { getEntryById, HELP_CATEGORIES } from "@/data/help-content"

export default function HelpTopicPage() {
  const params = useParams<{ topic: string }>()
  const topic = typeof params?.topic === "string" ? params.topic : ""
  const entry = getEntryById(topic)

  if (!entry) {
    return (
      <div className="min-h-screen bg-[#0a0e14] text-white flex flex-col items-center justify-center px-4">
        <div className="text-lg font-semibold mb-2">トピックが見つかりません</div>
        <Link href="/help" className="text-emerald-400 underline text-sm">ヘルプ一覧へ戻る</Link>
      </div>
    )
  }

  const cat = HELP_CATEGORIES.find((c) => c.id === entry.category)

  return (
    <div className="min-h-screen bg-[#0a0e14] text-white">
      <header className="sticky top-0 z-10 bg-[#0a0e14]/95 backdrop-blur border-b border-white/[0.08]">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/help" className="-ml-2 p-2 text-white/60 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-base font-semibold truncate">ヘルプ</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="space-y-2">
          {cat && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] text-[11px] font-mono">
              <span>{cat.emoji}</span>
              {cat.label}
            </span>
          )}
          <h2 className="text-2xl font-bold leading-tight">{entry.question}</h2>
        </div>

        <article className="prose prose-invert max-w-none text-[14px] leading-relaxed">
          <SimpleMarkdown text={entry.answer} />
        </article>

        {entry.related && entry.related.length > 0 && (
          <div className="border-t border-white/[0.08] pt-5">
            <div className="text-[12px] font-semibold text-white/60 mb-2">関連トピック</div>
            <div className="space-y-2">
              {entry.related.map((rid) => {
                const r = getEntryById(rid)
                if (!r) return null
                return (
                  <Link
                    key={rid}
                    href={`/help/${rid}`}
                    className="block bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-md p-3 text-[13px]"
                  >
                    {r.question}
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        <div className="border-t border-white/[0.08] pt-5">
          <div className="text-[12px] font-semibold text-white/60 mb-3">この回答で解決しましたか？</div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/support"
              className="inline-flex items-center gap-1.5 bg-blue-500 hover:bg-blue-400 text-white text-[12px] font-semibold px-3 py-2 rounded-md"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              サポートに問い合わせる
            </Link>
            <a
              href="tel:0120-000-000"
              className="inline-flex items-center gap-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-white text-[12px] font-semibold px-3 py-2 rounded-md"
            >
              <Phone className="w-3.5 h-3.5" />
              0120-XXX-XXX
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}

// Minimal markdown renderer (headings, bold, lists, code, tables-as-text).
function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split("\n")
  const out: JSX.Element[] = []
  let listBuf: string[] = []
  let listType: "ul" | "ol" | null = null

  function flushList() {
    if (!listType || listBuf.length === 0) return
    if (listType === "ul") {
      out.push(
        <ul key={`ul-${out.length}`} className="list-disc pl-6 space-y-1 my-3 text-white/85">
          {listBuf.map((l, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: inline(l) }} />
          ))}
        </ul>,
      )
    } else {
      out.push(
        <ol key={`ol-${out.length}`} className="list-decimal pl-6 space-y-1 my-3 text-white/85">
          {listBuf.map((l, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: inline(l) }} />
          ))}
        </ol>,
      )
    }
    listBuf = []
    listType = null
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line.startsWith("## ")) {
      flushList()
      out.push(
        <h3 key={out.length} className="text-lg font-semibold text-white mt-5 mb-2">
          {line.slice(3)}
        </h3>,
      )
      continue
    }
    if (line.startsWith("# ")) {
      flushList()
      out.push(
        <h2 key={out.length} className="text-xl font-bold text-white mt-6 mb-2">
          {line.slice(2)}
        </h2>,
      )
      continue
    }
    if (/^\d+\.\s/.test(line)) {
      if (listType !== "ol") flushList()
      listType = "ol"
      listBuf.push(line.replace(/^\d+\.\s/, ""))
      continue
    }
    if (line.startsWith("- ")) {
      if (listType !== "ul") flushList()
      listType = "ul"
      listBuf.push(line.slice(2))
      continue
    }
    if (line === "") {
      flushList()
      continue
    }
    flushList()
    out.push(
      <p
        key={out.length}
        className="text-white/85 my-2"
        dangerouslySetInnerHTML={{ __html: inline(line) }}
      />,
    )
  }
  flushList()
  return <>{out}</>
}

function inline(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/`(.+?)`/g, '<code class="bg-white/[0.06] px-1 py-0.5 rounded text-emerald-300">$1</code>')
}
