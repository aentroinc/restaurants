"use client"

import { useMemo } from "react"
import type { OntoBranchDiff } from "@/lib/ontology-api"

type DiffEntry =
  | { kind: "added"; path: string; value: unknown }
  | { kind: "removed"; path: string; value: unknown }
  | { kind: "changed"; path: string; before: unknown; after: unknown }

interface BranchDiffProps {
  diff: OntoBranchDiff
  leftLabel?: string
  rightLabel?: string
}

function flatten(diff: OntoBranchDiff): DiffEntry[] {
  const out: DiffEntry[] = []
  Object.entries(diff.added || {}).forEach(([k, v]) => out.push({ kind: "added", path: k, value: v }))
  Object.entries(diff.removed || {}).forEach(([k, v]) => out.push({ kind: "removed", path: k, value: v }))
  Object.entries(diff.changed || {}).forEach(([k, v]) => out.push({ kind: "changed", path: k, before: v.before, after: v.after }))
  return out.sort((a, b) => a.path.localeCompare(b.path))
}

function pretty(value: unknown): string {
  if (value === undefined) return "—"
  try { return JSON.stringify(value, null, 2) } catch { return String(value) }
}

export default function BranchDiff({ diff, leftLabel = "before", rightLabel = "after" }: BranchDiffProps) {
  const entries = useMemo(() => flatten(diff), [diff])

  if (entries.length === 0) {
    return <div className="text-[12px] text-white/30 px-4 py-8 text-center">差分はありません</div>
  }

  const counts = {
    added: entries.filter((e) => e.kind === "added").length,
    removed: entries.filter((e) => e.kind === "removed").length,
    changed: entries.filter((e) => e.kind === "changed").length,
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 px-3 py-2 bg-white/[0.02] border border-white/[0.06] rounded-md text-[11px]">
        <span className="text-emerald-400">+ {counts.added} 追加</span>
        <span className="text-red-400">- {counts.removed} 削除</span>
        <span className="text-amber-400">~ {counts.changed} 変更</span>
      </div>
      <div className="space-y-2">
        {entries.map((e, i) => (
          <div key={i} className="border border-white/[0.06] rounded-md overflow-hidden">
            <div className="px-3 py-1.5 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between">
              <span className="text-[11px] font-mono text-white/70">{e.path}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                e.kind === "added" ? "bg-emerald-400/10 text-emerald-400" :
                e.kind === "removed" ? "bg-red-400/10 text-red-400" :
                "bg-amber-400/10 text-amber-400"
              }`}>
                {e.kind}
              </span>
            </div>
            {e.kind === "changed" ? (
              <div className="grid grid-cols-2 divide-x divide-white/[0.06]">
                <div className="p-3">
                  <div className="text-[10px] uppercase tracking-wider text-white/30 mb-1">{leftLabel}</div>
                  <pre className="text-[11px] font-mono text-red-300/80 whitespace-pre-wrap bg-red-400/5 border border-red-400/10 rounded p-2">{pretty(e.before)}</pre>
                </div>
                <div className="p-3">
                  <div className="text-[10px] uppercase tracking-wider text-white/30 mb-1">{rightLabel}</div>
                  <pre className="text-[11px] font-mono text-emerald-300/80 whitespace-pre-wrap bg-emerald-400/5 border border-emerald-400/10 rounded p-2">{pretty(e.after)}</pre>
                </div>
              </div>
            ) : (
              <div className="p-3">
                <pre className={`text-[11px] font-mono whitespace-pre-wrap rounded p-2 border ${
                  e.kind === "added"
                    ? "text-emerald-300/80 bg-emerald-400/5 border-emerald-400/10"
                    : "text-red-300/80 bg-red-400/5 border-red-400/10"
                }`}>{pretty(e.value)}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
