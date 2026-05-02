"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2 } from "lucide-react"

interface JsonSchemaEditorProps {
  value: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}

// 簡易バリデーション: parse できるか + 最低限の JSON Schema 構造
function validate(text: string): { ok: boolean; error?: string; parsed?: Record<string, unknown> } {
  try {
    const parsed = JSON.parse(text)
    if (typeof parsed !== "object" || parsed === null) return { ok: false, error: "オブジェクトを返す必要があります" }
    if ("type" in parsed && parsed.type !== "object") {
      return { ok: false, error: "ルートの type は \"object\" にしてください" }
    }
    if ("properties" in parsed && (typeof parsed.properties !== "object" || parsed.properties === null)) {
      return { ok: false, error: "properties はオブジェクトです" }
    }
    if ("required" in parsed && !Array.isArray(parsed.required)) {
      return { ok: false, error: "required は配列です" }
    }
    return { ok: true, parsed: parsed as Record<string, unknown> }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export default function JsonSchemaEditor({ value, onChange }: JsonSchemaEditorProps) {
  const [text, setText] = useState(JSON.stringify(value, null, 2))
  const [result, setResult] = useState<ReturnType<typeof validate>>({ ok: true })

  useEffect(() => {
    setText(JSON.stringify(value, null, 2))
  }, [value])

  const handleChange = (next: string) => {
    setText(next)
    const v = validate(next)
    setResult(v)
    if (v.ok && v.parsed) onChange(v.parsed)
  }

  const fieldList = result.ok && result.parsed && typeof result.parsed.properties === "object" && result.parsed.properties
    ? Object.keys(result.parsed.properties as Record<string, unknown>)
    : []
  const requiredList = result.ok && result.parsed && Array.isArray(result.parsed.required)
    ? (result.parsed.required as string[])
    : []

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full h-48 bg-[#0a0e14] border border-white/[0.08] rounded px-3 py-2 text-[12px] font-mono text-white/80 outline-none focus:border-blue-400/40 resize-y"
        spellCheck={false}
      />
      <div className="flex items-start gap-2 text-[11px]">
        {result.ok ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-emerald-400">有効な JSON Schema</span>
              {fieldList.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {fieldList.map((f) => (
                    <span key={f} className={`px-1.5 py-0.5 rounded font-mono ${requiredList.includes(f) ? "bg-blue-500/15 text-blue-300 border border-blue-400/20" : "bg-white/[0.04] text-white/50 border border-white/[0.08]"}`}>
                      {f}{requiredList.includes(f) ? "*" : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
            <span className="text-red-400">{result.error}</span>
          </>
        )}
      </div>
    </div>
  )
}
