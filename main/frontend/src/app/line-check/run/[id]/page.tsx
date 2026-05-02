"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  ChecklistItem, ChecklistTemplate, lineCheckApi,
} from "@/lib/line-check-api"
import { offlineStore } from "@/lib/offline-store"
import { LoadingState, ErrorState } from "@/components/states"
import {
  Camera, Thermometer, AlertTriangle, CheckCircle2, MapPin, Clock,
  ChevronLeft, ChevronRight, Send, WifiOff,
} from "lucide-react"
import { useTranslations, type Translator } from "@/i18n/I18nProvider"

export default function LineCheckRunPage() {
  const params = useParams<{ id: string }>()
  const search = useSearchParams()
  const templateIdHint = search.get("template")
  const router = useRouter()
  const t = useTranslations("lineCheck.run")

  const runId = params.id
  const [tpl, setTpl] = useState<ChecklistTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, AnswerDraft>>({})
  const [elapsed, setElapsed] = useState(0)
  const [online, setOnline] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [doneStatus, setDoneStatus] = useState<"completed" | "failed" | null>(null)
  const startedAtRef = useRef<number>(Date.now())

  // Load template
  useEffect(() => {
    lineCheckApi.listTemplates()
      .then((tpls) => {
        const found = (templateIdHint && tpls.find((x) => x.id === templateIdHint)) || tpls[0]
        if (!found) throw new Error(t("templateNotFound"))
        setTpl(found)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateIdHint])

  // Timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)), 1000)
    return () => clearInterval(t)
  }, [])

  // Network
  useEffect(() => {
    if (typeof navigator === "undefined") return
    setOnline(navigator.onLine)
    const on = () => { setOnline(true); offlineStore.sync().catch(() => {}) }
    const off = () => setOnline(false)
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    return () => {
      window.removeEventListener("online", on)
      window.removeEventListener("offline", off)
    }
  }, [])

  const items: ChecklistItem[] = tpl?.items || []
  const current = items[step]
  const progress = items.length ? Math.round(((step) / items.length) * 100) : 0

  if (loading) return <Shell><LoadingState /></Shell>
  if (error || !tpl) return <Shell><ErrorState message={error || t("templateNotLoaded")} /></Shell>

  if (doneStatus) {
    const ok = doneStatus === "completed"
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          {ok ? (
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-4" />
          ) : (
            <AlertTriangle className="w-16 h-16 text-red-400 mb-4" />
          )}
          <div className="text-[18px] font-semibold text-white/90">
            {ok ? t("doneOk") : t("doneNg")}
          </div>
          <div className="text-[12px] text-white/50 mt-2 max-w-sm">
            {ok ? t("doneOkDesc") : t("doneNgDesc")}
          </div>
          <button
            className="mt-6 px-6 py-2 rounded-md bg-blue-500 text-white text-[14px]"
            onClick={() => router.push("/line-check")}
          >
            {t("backToList")}
          </button>
        </div>
      </Shell>
    )
  }

  async function setAnswer(itemId: string, patch: Partial<AnswerDraft>) {
    setAnswers((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || {}), ...patch },
    }))
  }

  async function handlePhoto(item: ChecklistItem, file: File) {
    // Try direct upload; fall back to offline-store on failure.
    try {
      const r = await lineCheckApi.uploadPhoto(file, runId)
      await setAnswer(item.id, { photoUrl: r.photo_url, photoBlobId: null })
    } catch {
      const blobId = await offlineStore.storePhoto(file)
      await setAnswer(item.id, { photoUrl: null, photoBlobId: blobId })
    }
  }

  async function persistAnswer(item: ChecklistItem): Promise<boolean> {
    const draft = answers[item.id] || {}
    const body = {
      item_id: item.id,
      value_text: draft.valueText ?? null,
      value_number: draft.valueNumber ?? null,
      photo_url: draft.photoUrl ?? null,
      comment: draft.comment ?? null,
    }
    try {
      await lineCheckApi.submitAnswer(runId, body)
      return true
    } catch {
      // Queue offline (we already have any photo blob id stored).
      await offlineStore.queueAnswer({
        runId,
        itemId: item.id,
        valueText: draft.valueText ?? null,
        valueNumber: draft.valueNumber ?? null,
        photoBlobId: draft.photoBlobId ?? null,
        comment: draft.comment ?? null,
      })
      return false
    }
  }

  async function next() {
    if (!current) return
    const draft = answers[current.id] || {}
    if (current.requires_photo && !draft.photoUrl && !draft.photoBlobId) {
      alert(t("photoMust"))
      return
    }
    if (current.requires_temperature && draft.valueNumber === undefined) {
      alert(t("tempMust"))
      return
    }
    setSubmitting(true)
    await persistAnswer(current)
    setSubmitting(false)
    if (step + 1 >= items.length) {
      finalize()
    } else {
      setStep(step + 1)
    }
  }

  async function finalize() {
    setSubmitting(true)
    try {
      const r = await lineCheckApi.completeRun(runId)
      setDoneStatus(r.status === "completed" ? "completed" : "failed")
    } catch {
      setDoneStatus("failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Shell>
      {/* Sticky top: progress + timer */}
      <div className="sticky top-0 z-10 bg-[#0a0e14]/95 backdrop-blur border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-3 text-[11px] text-white/60 mb-2">
          <Clock className="w-3.5 h-3.5" />
          <span className="font-mono tabular-nums">{formatElapsed(elapsed)}</span>
          <span className="ml-auto">{step + 1} / {items.length}</span>
          {!online && (
            <span className="flex items-center gap-1 text-amber-400">
              <WifiOff className="w-3.5 h-3.5" />
              {t("offline")}
            </span>
          )}
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full bg-blue-400" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Item */}
      <div className="px-4 py-5 max-w-xl mx-auto w-full">
        {current && (
          <ItemCard
            item={current}
            draft={answers[current.id] || {}}
            onChange={(p) => setAnswer(current.id, p)}
            onPhoto={(f) => handlePhoto(current, f)}
            t={t}
          />
        )}
      </div>

      {/* Bottom actions */}
      <div className="sticky bottom-0 px-4 py-3 border-t border-white/[0.06] bg-[#0a0e14] flex items-center gap-2">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="flex items-center gap-1 px-3 py-2 rounded-md border border-white/[0.08] text-[13px] text-white/70 disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
          {t("back")}
        </button>
        <button
          onClick={next}
          disabled={submitting}
          className="ml-auto flex items-center gap-1 px-4 py-2 rounded-md bg-blue-500 text-white text-[13px] font-medium disabled:opacity-50"
        >
          {step + 1 === items.length ? (
            <>
              <Send className="w-4 h-4" />
              {t("completeSend")}
            </>
          ) : (
            <>
              {t("nextItem")}
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </Shell>
  )
}

interface AnswerDraft {
  valueText?: string
  valueNumber?: number
  photoUrl?: string | null
  photoBlobId?: string | null
  comment?: string
}

function ItemCard({
  item, draft, onChange, onPhoto, t,
}: {
  item: ChecklistItem
  draft: AnswerDraft
  onChange: (p: Partial<AnswerDraft>) => void
  onPhoto: (f: File) => Promise<void>
  t: Translator
}) {
  const tempStatus = useMemo(() => tempCheck(item, draft.valueNumber, t), [item, draft.valueNumber, t])
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-5 space-y-4">
      <div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/40 mb-2">
          {item.requires_photo && (
            <span className="flex items-center gap-1 text-amber-400/80">
              <Camera className="w-3 h-3" /> {t("photoRequired")}
            </span>
          )}
          {item.requires_temperature && (
            <span className="flex items-center gap-1 text-cyan-400/80">
              <Thermometer className="w-3 h-3" />
              {t("tempRange", { min: item.min_temp ?? "?", max: item.max_temp ?? "?" })}
            </span>
          )}
        </div>
        <div className="text-[16px] font-semibold text-white/90">{item.text}</div>
      </div>

      {/* Number / temperature input */}
      {item.requires_temperature && (
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">
            {t("tempLabel")}
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={draft.valueNumber ?? ""}
            onChange={(e) =>
              onChange({
                valueNumber: e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
            className="w-full text-[18px] font-mono tabular-nums px-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-blue-400/40"
          />
          {tempStatus && (
            <div className={`mt-2 text-[12px] ${tempStatus.ok ? "text-emerald-400" : "text-red-400"} flex items-center gap-1`}>
              {tempStatus.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              {tempStatus.message}
            </div>
          )}
        </div>
      )}

      {/* Text input fallback */}
      {!item.requires_temperature && !item.requires_photo && (
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">
            {t("stateLabel")}
          </label>
          <select
            value={draft.valueText ?? ""}
            onChange={(e) => onChange({ valueText: e.target.value })}
            className="w-full text-[14px] px-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.08]"
          >
            <option value="">{t("selectPlaceholder")}</option>
            <option value="ok">OK</option>
            <option value="ng">NG</option>
          </select>
        </div>
      )}

      {/* Photo */}
      {item.requires_photo && (
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">
            {t("photoLabel")}
          </label>
          <PhotoInput
            current={draft.photoUrl || (draft.photoBlobId ? "queued" : null)}
            onFile={(f) => onPhoto(f)}
            t={t}
          />
        </div>
      )}

      {/* Comment */}
      <div>
        <label className="block text-[11px] uppercase tracking-wider text-white/40 mb-1">
          {t("memo")}
        </label>
        <textarea
          value={draft.comment ?? ""}
          onChange={(e) => onChange({ comment: e.target.value })}
          rows={2}
          className="w-full text-[13px] px-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.08] resize-none"
        />
      </div>
    </div>
  )
}

function PhotoInput({ current, onFile, t }: { current: string | null; onFile: (f: File) => void; t: Translator }) {
  const ref = useRef<HTMLInputElement | null>(null)
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md border-2 border-dashed border-white/[0.1] text-white/70 hover:border-blue-400/40 hover:text-white"
      >
        <Camera className="w-5 h-5" />
        <span className="text-[14px]">{current ? t("retake") : t("shoot")}</span>
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
        }}
      />
      {current === "queued" && (
        <div className="text-[11px] text-amber-400 flex items-center gap-1">
          <WifiOff className="w-3 h-3" />
          {t("queued")}
        </div>
      )}
      {current && current !== "queued" && (
        <div className="text-[11px] text-emerald-400 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          {t("captured")}
        </div>
      )}
    </div>
  )
}

function tempCheck(item: ChecklistItem, v: number | undefined, t: Translator) {
  if (!item.requires_temperature || v === undefined || v === null || Number.isNaN(v)) return null
  if (item.min_temp != null && v < item.min_temp) return { ok: false, message: t("tempBelow", { min: item.min_temp }) }
  if (item.max_temp != null && v > item.max_temp) return { ok: false, message: t("tempAbove", { max: item.max_temp }) }
  return { ok: true, message: t("tempOk") }
}

function formatElapsed(s: number) {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`
}

function Shell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("lineCheck.run")
  return (
    <div className="min-h-full bg-[#0a0e14] text-white/80 flex flex-col">
      <header className="flex items-center gap-3 px-4 h-12 border-b border-white/[0.06] bg-[#0c1017]">
        <MapPin className="w-4 h-4 text-emerald-400" />
        <h1 className="text-[14px] font-semibold text-white/90">{t("title")}</h1>
      </header>
      {children}
    </div>
  )
}
