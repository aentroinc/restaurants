"use client"

import { useEffect, useMemo, useState } from "react"
import { ShieldCheck, AlertTriangle, FileText, X } from "lucide-react"
import { type ConsentTemplate, getRequiredConsents, grantConsent } from "@/lib/consent"

/**
 * Modal that walks the user through outstanding consents one at a time.
 * Mounted at the top of each PWA layout via useConsentGate(). Once empty,
 * the dialog returns null (renders nothing).
 */
export function ConsentDialog({
  required,
  onResolved,
  onCancel,
}: {
  required: ConsentTemplate[]
  onResolved: () => void
  onCancel?: () => void
}) {
  const [idx, setIdx] = useState(0)
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const current = required[idx]

  useEffect(() => {
    setAgreed(false)
  }, [idx])

  if (!current) return null

  const isLast = idx >= required.length - 1

  async function handleAccept() {
    if (!current || !agreed) return
    setSubmitting(true)
    const scope: Record<string, boolean> = {}
    ;(current.required_fields || [current.code]).forEach((f) => {
      scope[f] = true
    })
    scope[current.code] = true
    const ok = await grantConsent(current.id, scope)
    setSubmitting(false)
    if (!ok) return
    if (isLast) onResolved()
    else setIdx(idx + 1)
  }

  function handleDecline() {
    if (onCancel) onCancel()
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[90vh] bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl flex flex-col">
        <header className="shrink-0 flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-emerald-300/80 font-semibold">
              個人情報の取り扱い同意 ({idx + 1} / {required.length})
            </div>
            <div className="text-base font-bold text-white truncate">{current.title}</div>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={handleDecline}
              className="p-2 -mr-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5"
              aria-label="閉じる"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 px-3 py-2 flex gap-2 text-[12px] text-amber-100">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              個人情報保護法（2022改正）に基づく同意取得です。同意は<strong className="font-semibold">いつでも撤回できます</strong>（設定画面）。
            </div>
          </div>

          <article className="prose prose-invert prose-sm max-w-none text-white/85">
            <SimpleMarkdown md={current.body_md} />
          </article>

          <details className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[12px]">
            <summary className="cursor-pointer text-white/70 font-medium flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" />
              この同意で取り扱う対象データ
            </summary>
            <ul className="mt-2 ml-5 list-disc space-y-0.5 text-white/60">
              {(current.required_fields || [current.code]).map((f) => (
                <li key={f} className="font-mono text-[11px]">
                  {f}
                </li>
              ))}
            </ul>
          </details>
        </div>

        <footer className="shrink-0 px-5 py-4 border-t border-white/10 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-5 w-5 rounded border-white/20 bg-white/5 accent-emerald-500"
            />
            <span className="text-sm text-white/85 leading-snug">
              上記内容を確認し、データの取得・利用に同意します。
            </span>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDecline}
              disabled={submitting}
              className="flex-1 h-12 rounded-xl border border-white/15 text-white/70 hover:bg-white/5 hover:text-white text-sm font-medium disabled:opacity-50"
            >
              同意しない
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={!agreed || submitting}
              className="flex-[2] h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold disabled:bg-white/10 disabled:text-white/40 transition-colors"
            >
              {submitting ? "処理中…" : isLast ? "同意してアプリを開始" : "同意して次へ"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

/**
 * 起動時 consent ゲート. PWA layout でラップして使う。
 *
 * <ConsentGate>{children}</ConsentGate>
 */
export function ConsentGate({ children }: { children: React.ReactNode }) {
  const [required, setRequired] = useState<ConsentTemplate[] | null>(null)
  const [, setReloadKey] = useState(0)

  useEffect(() => {
    let alive = true
    getRequiredConsents().then((tmpls) => {
      if (alive) setRequired(tmpls)
    })
    return () => {
      alive = false
    }
  }, [])

  if (required === null) return <>{children}</>

  if (required.length === 0) return <>{children}</>

  return (
    <>
      {children}
      <ConsentDialog
        required={required}
        onResolved={async () => {
          const next = await getRequiredConsents()
          setRequired(next)
          setReloadKey((k) => k + 1)
        }}
      />
    </>
  )
}

// ---- minimal markdown renderer ---------------------------------------------

function SimpleMarkdown({ md }: { md: string }) {
  // Avoid a heavy markdown dep — handle the small subset our seeds use:
  // # / ## headings, paragraphs, bullet lists, **bold**.
  const blocks = useMemo(() => parseBlocks(md), [md])
  return (
    <div className="space-y-2.5">
      {blocks.map((b, i) => {
        if (b.kind === "h1")
          return (
            <h2 key={i} className="text-lg font-bold text-white mt-2">
              {b.text}
            </h2>
          )
        if (b.kind === "h2")
          return (
            <h3 key={i} className="text-base font-semibold text-white mt-2">
              {b.text}
            </h3>
          )
        if (b.kind === "ul")
          return (
            <ul key={i} className="ml-5 list-disc space-y-1 text-[13px] text-white/80">
              {b.items.map((it, j) => (
                <li key={j} dangerouslySetInnerHTML={{ __html: renderInline(it) }} />
              ))}
            </ul>
          )
        return (
          <p
            key={i}
            className="text-[13px] leading-relaxed text-white/80"
            dangerouslySetInnerHTML={{ __html: renderInline(b.text) }}
          />
        )
      })}
    </div>
  )
}

type Block =
  | { kind: "h1"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }

function parseBlocks(md: string): Block[] {
  const lines = md.split("\n")
  const blocks: Block[] = []
  let para: string[] = []
  let bullets: string[] = []

  function flushPara() {
    if (para.length) {
      blocks.push({ kind: "p", text: para.join(" ").trim() })
      para = []
    }
  }
  function flushBullets() {
    if (bullets.length) {
      blocks.push({ kind: "ul", items: bullets })
      bullets = []
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      flushPara()
      flushBullets()
      continue
    }
    if (trimmed.startsWith("# ")) {
      flushPara()
      flushBullets()
      blocks.push({ kind: "h1", text: trimmed.slice(2) })
    } else if (trimmed.startsWith("## ")) {
      flushPara()
      flushBullets()
      blocks.push({ kind: "h2", text: trimmed.slice(3) })
    } else if (trimmed.startsWith("- ")) {
      flushPara()
      bullets.push(trimmed.slice(2))
    } else {
      flushBullets()
      para.push(trimmed)
    }
  }
  flushPara()
  flushBullets()
  return blocks
}

function renderInline(s: string): string {
  // **bold** + escape HTML
  const escaped = s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
  return escaped.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
}
