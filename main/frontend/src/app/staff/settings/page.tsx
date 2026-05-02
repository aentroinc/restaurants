"use client"

import { useEffect, useState } from "react"
import { Smartphone, KeyRound, User, Wifi, Trash2, Download, ShieldCheck, FileText, Globe } from "lucide-react"
import { BigTapButton } from "@/components/staff/BigTapButton"
import { staffIdentity, clockLog } from "@/lib/staff-api"
import { listMyConsents, requestDataDeletion, withdrawConsent, type ConsentRecord } from "@/lib/consent"
import { useTranslations } from "@/i18n/I18nProvider"
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher"

export default function StaffSettingsPage() {
  const t = useTranslations("settings")
  const tCommon = useTranslations("common")
  const [empId, setEmpId] = useState("")
  const [pin1, setPin1] = useState("")
  const [pin2, setPin2] = useState("")
  const [installable, setInstallable] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [online, setOnline] = useState(true)
  const [msg, setMsg] = useState("")
  const [consents, setConsents] = useState<ConsentRecord[]>([])
  const [delScope, setDelScope] = useState<"all" | "face" | "personal" | "training">("all")
  const [delSubmitting, setDelSubmitting] = useState(false)

  useEffect(() => {
    listMyConsents().then(setConsents)
  }, [])

  useEffect(() => {
    setEmpId(staffIdentity.employeeId)
    if (typeof navigator !== "undefined") setOnline(navigator.onLine)
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setInstallable(true)
    }
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [])

  function saveId() {
    staffIdentity.setEmployeeId(empId)
    setMsg(t("empSaved"))
    setTimeout(() => setMsg(""), 2000)
  }

  function savePin() {
    if (pin1.length !== 4) return setMsg(t("pinDigits"))
    if (pin1 !== pin2) return setMsg(t("pinMismatch"))
    staffIdentity.setPin(pin1)
    setPin1("")
    setPin2("")
    setMsg(t("pinSaved"))
    setTimeout(() => setMsg(""), 2000)
  }

  async function install() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setInstallable(false)
  }

  function clearLog() {
    if (!confirm(t("clearConfirm"))) return
    clockLog.clear()
    setMsg(t("logsCleared"))
    setTimeout(() => setMsg(""), 2000)
  }

  async function handleRequestDeletion() {
    const labels: Record<string, string> = {
      all: "すべての個人データ",
      face: "顔認証データのみ",
      personal: "個人情報（氏名等）のみ",
      training: "学習・面談記録のみ",
    }
    if (!confirm(`${labels[delScope]} の削除を申請します。撤回できません。よろしいですか？`)) return
    setDelSubmitting(true)
    try {
      const r = await requestDataDeletion(delScope)
      if (r) setMsg(`削除リクエストを受け付けました（管理者承認待ち）`)
      else setMsg("申請に失敗しました")
    } finally {
      setDelSubmitting(false)
      setTimeout(() => setMsg(""), 4000)
    }
  }

  async function handleWithdraw(recordId: string) {
    if (!confirm("この同意を撤回しますか？")) return
    const ok = await withdrawConsent(recordId)
    if (ok) {
      setConsents(await listMyConsents())
      setMsg("同意を撤回しました")
      setTimeout(() => setMsg(""), 3000)
    }
  }

  return (
    <div className="px-4 py-5 space-y-5">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {msg && <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-200">{msg}</div>}

      {/* Language picker — placed near top so foreign trainees can find it fast. */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-sky-400" />
          <div className="font-semibold">{t("languageTitle")}</div>
        </div>
        <p className="text-xs text-white/60">{t("languageHint")}</p>
        <LanguageSwitcher variant="inline" />
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-emerald-400" />
          <div className="font-semibold">{t("empIdTitle")}</div>
        </div>
        <input
          value={empId}
          onChange={(e) => setEmpId(e.target.value)}
          className="w-full h-12 px-3 rounded-lg bg-white/[0.05] border border-white/10 focus:outline-none focus:border-emerald-400"
        />
        <BigTapButton tone="primary" label={tCommon("save")} onClick={saveId} />
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-amber-400" />
          <div className="font-semibold">{t("pinTitle")}</div>
        </div>
        <input
          inputMode="numeric"
          maxLength={4}
          value={pin1}
          onChange={(e) => setPin1(e.target.value.replace(/\D/g, ""))}
          placeholder={t("pinNew")}
          className="w-full h-12 px-3 rounded-lg bg-white/[0.05] border border-white/10 focus:outline-none focus:border-emerald-400 tracking-widest"
        />
        <input
          inputMode="numeric"
          maxLength={4}
          value={pin2}
          onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))}
          placeholder={t("pinReenter")}
          className="w-full h-12 px-3 rounded-lg bg-white/[0.05] border border-white/10 focus:outline-none focus:border-emerald-400 tracking-widest"
        />
        <BigTapButton tone="primary" label={t("pinUpdate")} onClick={savePin} />
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-sky-400" />
          <div className="font-semibold">{t("installTitle")}</div>
        </div>
        {installable ? (
          <BigTapButton
            tone="success"
            icon={<Download className="h-5 w-5" />}
            label={t("installCta")}
            onClick={install}
          />
        ) : (
          <div className="text-sm text-white/60 whitespace-pre-line">
            {t("installHint")}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Wifi className={`h-5 w-5 ${online ? "text-emerald-400" : "text-red-400"}`} />
          <div className="font-semibold">{t("connectionTitle")}</div>
        </div>
        <div className="text-sm text-white/70">
          {online ? tCommon("online") : tCommon("offline")}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-red-400" />
          <div className="font-semibold">{t("localDataTitle")}</div>
        </div>
        <BigTapButton tone="danger" label={t("clearLogs")} onClick={clearLog} />
      </section>

      {/* ── 同意履歴 ── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          <div className="font-semibold">個人情報の同意履歴</div>
        </div>
        {consents.length === 0 ? (
          <div className="text-sm text-white/60">同意履歴はまだありません。</div>
        ) : (
          <div className="space-y-2">
            {consents.map((c) => (
              <div key={c.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[13px]">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium text-white">{c.template_code}</div>
                    <div className="text-[11px] text-white/50">
                      v{c.template_version} ・ {new Date(c.granted_at).toLocaleString("ja-JP")}
                      {c.withdrawn_at && (
                        <span className="ml-2 text-amber-300">撤回済 {new Date(c.withdrawn_at).toLocaleString("ja-JP")}</span>
                      )}
                    </div>
                  </div>
                  {!c.withdrawn_at && (
                    <button
                      type="button"
                      onClick={() => handleWithdraw(c.id)}
                      className="text-[12px] px-2 py-1 rounded-md border border-amber-400/40 text-amber-300 hover:bg-amber-400/10"
                    >
                      撤回
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 削除リクエスト ── */}
      <section className="rounded-2xl border border-red-500/25 bg-red-500/[0.04] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-red-300" />
          <div className="font-semibold">データ削除を申請する</div>
        </div>
        <p className="text-[12px] text-white/65 leading-relaxed">
          個人情報保護法に基づき、保有する個人データの削除を申請できます。<br />
          管理者の承認後に処理されます。労基法上の保管義務がある打刻記録（3年）は経過後のみ削除されます。
        </p>
        <select
          value={delScope}
          onChange={(e) => setDelScope(e.target.value as "all" | "face" | "personal" | "training")}
          className="w-full h-12 px-3 rounded-lg bg-white/[0.05] border border-white/10 text-white"
        >
          <option value="all">すべて削除</option>
          <option value="face">顔認証データのみ</option>
          <option value="personal">個人情報（氏名等）のみ</option>
          <option value="training">学習・面談記録のみ</option>
        </select>
        <BigTapButton
          tone="danger"
          label={delSubmitting ? "申請中…" : "削除を申請する"}
          onClick={handleRequestDeletion}
        />
      </section>

      <div className="text-[11px] text-white/40 text-center pt-2">
        <a href="/legal/privacy-policy" className="underline hover:text-white/70">プライバシーポリシー</a>
        <span className="mx-2">/</span>
        <a href="/legal/terms" className="underline hover:text-white/70">利用規約</a>
      </div>
    </div>
  )
}
