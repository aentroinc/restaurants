"use client"

import type { ReactElement } from "react"
import type { MarkdownTile as MarkdownTileSpec } from "@/lib/canvas-spec"

// 軽量 Markdown レンダラー（# / ## / - / **bold** / *italic* / 改行）
function renderMarkdown(src: string): ReactElement[] {
  const lines = src.split("\n")
  const out: ReactElement[] = []
  let listBuf: string[] = []

  function flushList() {
    if (listBuf.length === 0) return
    out.push(
      <ul key={`ul-${out.length}`} className="list-disc pl-5 space-y-1 my-2 text-white/75 text-[12px]">
        {listBuf.map((t, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inline(t) }} />)}
      </ul>
    )
    listBuf = []
  }

  function inline(t: string): string {
    return t
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, '<code class="bg-white/[0.06] px-1 rounded">$1</code>')
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line.startsWith("## ")) {
      flushList()
      out.push(<h3 key={out.length} className="text-[13px] font-semibold text-white/90 mt-2 mb-1">{line.slice(3)}</h3>)
    } else if (line.startsWith("# ")) {
      flushList()
      out.push(<h2 key={out.length} className="text-[15px] font-semibold text-white/95 mt-2 mb-1">{line.slice(2)}</h2>)
    } else if (line.startsWith("- ")) {
      listBuf.push(line.slice(2))
    } else if (line.trim() === "") {
      flushList()
    } else {
      flushList()
      out.push(<p key={out.length} className="text-[12px] text-white/70 my-1" dangerouslySetInnerHTML={{ __html: inline(line) }} />)
    }
  }
  flushList()
  return out
}

export function MarkdownTile({ tile }: { tile: MarkdownTileSpec }) {
  return (
    <div className="h-full w-full overflow-auto p-4">
      {renderMarkdown(tile.body || "")}
    </div>
  )
}
