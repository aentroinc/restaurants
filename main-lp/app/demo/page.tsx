"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Mail,
  Briefcase,
  ShieldCheck,
  Hammer,
  Calculator,
  HelpCircle,
  PlayCircle,
  FileText,
  BookOpen,
  ChevronRight,
} from "lucide-react"
import { Section, SectionHeader } from "@/components/section"
import { cn } from "@/lib/utils"

/* =============================================================
   Form schema
============================================================= */

const SEGMENT_OPTIONS = [
  "牛丼",
  "ファミレス",
  "回転寿司",
  "ハンバーガー",
  "うどん・そば",
  "焼肉",
  "中華",
  "居酒屋",
  "カフェ",
  "その他",
] as const

const ROLE_OPTIONS = [
  { value: "executive", label: "経営層 (社長 / 副社長 / 取締役)" },
  { value: "planning", label: "経営企画" },
  { value: "business", label: "事業部 (ブランド責任者)" },
  { value: "it", label: "IT / 情報システム" },
  { value: "other", label: "その他" },
] as const

const formSchema = z.object({
  company: z.string().min(1, "会社名を入力してください"),
  name: z.string().min(1, "お名前を入力してください"),
  role: z.string().min(1, "役職を選択してください"),
  email: z.string().min(1, "メールアドレスを入力してください").email("メールアドレスの形式が正しくありません"),
  phone: z.string().optional(),
  storeCount: z
    .union([z.string(), z.number()])
    .refine((v) => v !== "" && v !== undefined && v !== null, { message: "店舗数を入力してください" })
    .transform((v) => Number(v))
    .refine((v) => Number.isFinite(v) && v > 0, { message: "店舗数は 1 以上を入力してください" }),
  segments: z.array(z.string()).min(1, "業態を 1 つ以上選択してください"),
  preferred1: z.string().min(1, "第一希望日時を入力してください"),
  preferred2: z.string().optional(),
  preferred3: z.string().optional(),
  message: z.string().max(2000, "2000 文字以内で入力してください").optional(),
})

type FormValues = z.infer<typeof formSchema>

/* =============================================================
   Page
============================================================= */

export default function DemoPage() {
  const [submitted, setSubmitted] = useState(false)

  return (
    <>
      {/* ====================== HERO ====================== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero pointer-events-none" />
        <div className="container-x relative pt-20 lg:pt-24 pb-12 lg:pb-16">
          <div className="max-w-4xl">
            <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.18em] uppercase text-blue-400 font-bold px-3 py-1 rounded-full border border-blue-400/20 bg-blue-500/[0.06]">
              DEMO
            </span>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white/95 leading-[1.1]">
              45 分のデモで、<span className="gradient-text">貴社に合うかが分かります</span>
            </h1>
            <p className="mt-6 text-lg text-white/65 leading-relaxed max-w-3xl">
              オンライン (Zoom) または訪問。AENTRO の創業者または事業責任者が、貴社の状況に合わせた具体例でデモします。
            </p>

            <div className="mt-8 flex flex-wrap gap-2.5">
              <DemoBadge icon={<Hammer className="w-3.5 h-3.5" />} label="実機を触る（お試し設定画面 / 朝のレポート）" />
              <DemoBadge icon={<Calculator className="w-3.5 h-3.5" />} label="いくら効くか試算（貴社の店舗数で）" />
              <DemoBadge icon={<ShieldCheck className="w-3.5 h-3.5" />} label="安全性に関する質問対応" />
            </div>
          </div>
        </div>
      </section>

      {/* ====================== SECTION 1: フォーム ====================== */}
      <Section>
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
          {/* LEFT: Form (or confirmation) */}
          <div>
            {!submitted ? (
              <DemoForm onSuccess={() => setSubmitted(true)} />
            ) : (
              <DemoConfirmation />
            )}
          </div>

          {/* RIGHT: Sample Q&A */}
          <div>
            <div className="mb-5">
              <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.18em] uppercase text-blue-400 font-bold px-3 py-1 rounded-full border border-blue-400/20 bg-blue-500/[0.06]">
                FAQ
              </span>
              <h2 className="mt-3 text-2xl lg:text-[28px] font-bold text-white/95 leading-tight tracking-tight">
                デモで聞かれること
              </h2>
              <p className="mt-2 text-[14px] text-white/55 leading-relaxed">
                よくいただく質問と、その場でお答えする要点を先にご紹介します。
              </p>
            </div>

            <div className="space-y-3">
              <FaqCard
                tone="blue"
                question="うちのチェーンでも効きますか？"
                answer="業態と規模をお伺いし、5 社事例から最も近いケースを選んでお答えします。牛丼 / 回転寿司 / ファミレス / ハンバーガー / 総合 HD で実績あり。"
              />
              <FaqCard
                tone="emerald"
                question="今のシステムを置き換える必要はありますか？"
                answer="いいえ。データを読むだけで、書き戻しも経営層の承認制です。今のシステムは 1 行も変えずに導入できます。"
              />
              <FaqCard
                tone="purple"
                question="データを AI 提供元（Anthropic）に渡すのが心配です"
                answer="Anthropic 社と直接契約し、データを残さない取り決めです。個人情報は AI に渡す前に自動で消します。詳細はデモでご説明します。"
              />
              <FaqCard
                tone="amber"
                question="8 週間で本当に効果が出ますか？"
                answer="過去 5 社中 4 社で統計的に確実な改善が出ました。残り 1 社も別の数字では改善が見られました。検出できなかった場合の返金条項もあります。"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* ====================== SECTION 2: デモの流れ ====================== */}
      <Section>
        <SectionHeader
          eyebrow="AGENDA"
          title="デモの流れ"
          description="45 分で経営層・事業部・情シスのすべての懸念に答えるよう設計しています。"
        />

        <div className="max-w-3xl mx-auto space-y-3">
          <TimelineStep
            order="01"
            time="0-5 分"
            tone="blue"
            title="ヒアリング"
            body="貴社の業態・規模・現状の課題を簡潔に共有いただきます。"
          />
          <TimelineStep
            order="02"
            time="5-15 分"
            tone="purple"
            title="プロダクトデモ"
            body="AENTRO のトップ画面・朝のレポート・自動改善サイクルを実機で操作しながらご覧いただきます。"
          />
          <TimelineStep
            order="03"
            time="15-25 分"
            tone="amber"
            title="いくら効くか試算"
            body="貴社の店舗数・年商を入力し、年間の想定改善額をその場で算出します。"
          />
          <TimelineStep
            order="04"
            time="25-35 分"
            tone="emerald"
            title="安全性 / 質疑応答"
            body="認証 / データ取扱 / 専用クラウド / 監査ログなど、情シス観点の質問にお答えします。"
          />
          <TimelineStep
            order="05"
            time="35-45 分"
            tone="blue"
            title="次のステップ"
            body="8 週間お試し導入のご相談と、次回打合せの日程設定までその場で完結します。"
            isLast
          />
        </div>
      </Section>

      {/* ====================== SECTION 3: お問合せ別パス ====================== */}
      <Section>
        <SectionHeader eyebrow="CONTACT" title="目的別の連絡先" />

        <div className="grid md:grid-cols-3 gap-5">
          <ContactCard
            icon={<PlayCircle className="w-5 h-5" />}
            tone="blue"
            label="デモ依頼"
            body="上記フォームから、または直接メールで。"
            ctaLabel="info@aentroinc.com"
            ctaHref="mailto:info@aentroinc.com"
          />
          <ContactCard
            icon={<ShieldCheck className="w-5 h-5" />}
            tone="emerald"
            label="安全性について先に確認したい"
            body="情シスが見るべきポイントをまとめたページがあります。"
            ctaLabel="安全性のページへ"
            ctaHref="/security"
            internal
          />
          <ContactCard
            icon={<Briefcase className="w-5 h-5" />}
            tone="amber"
            label="その他のお問合せ"
            body="採用、メディア、業務提携などはこちらまで。"
            ctaLabel="info@aentroinc.com"
            ctaHref="mailto:info@aentroinc.com"
          />
        </div>
      </Section>
    </>
  )
}

/* =============================================================
   Form
============================================================= */

function DemoForm({ onSuccess }: { onSuccess: () => void }) {
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company: "",
      name: "",
      role: "",
      email: "",
      phone: "",
      storeCount: undefined as unknown as number,
      segments: [],
      preferred1: "",
      preferred2: "",
      preferred3: "",
      message: "",
    },
  })

  const selectedSegments = watch("segments") || []

  const toggleSegment = (s: string) => {
    const current = selectedSegments
    if (current.includes(s)) {
      setValue(
        "segments",
        current.filter((x) => x !== s),
        { shouldValidate: true }
      )
    } else {
      setValue("segments", [...current, s], { shouldValidate: true })
    }
  }

  // Real submit endpoint will be wired later. Currently simulates 1.5s latency.
  const onSubmit = async (_data: FormValues) => {
    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 1500))
    setSubmitting(false)
    onSuccess()
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-6 lg:p-8"
      noValidate
    >
      <div className="mb-6">
        <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.18em] uppercase text-blue-400 font-bold px-3 py-1 rounded-full border border-blue-400/20 bg-blue-500/[0.06]">
          REQUEST
        </span>
        <h2 className="mt-3 text-2xl lg:text-[28px] font-bold text-white/95 leading-tight tracking-tight">
          デモを依頼する
        </h2>
        <p className="mt-2 text-[13px] text-white/50 leading-relaxed">
          24 時間以内に担当よりご返信します。
        </p>
      </div>

      {/* Company */}
      <Field label="会社名" required error={errors.company?.message}>
        <input
          type="text"
          {...register("company")}
          placeholder="株式会社○○ホールディングス"
          className={inputCls(!!errors.company)}
        />
      </Field>

      {/* Name */}
      <Field label="お名前" required error={errors.name?.message}>
        <input
          type="text"
          {...register("name")}
          placeholder="山田 太郎"
          className={inputCls(!!errors.name)}
        />
      </Field>

      {/* Role */}
      <Field label="役職" required error={errors.role?.message}>
        <select {...register("role")} className={cn(inputCls(!!errors.role), "appearance-none")}>
          <option value="" className="bg-bg-primary">
            選択してください
          </option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value} className="bg-bg-primary">
              {r.label}
            </option>
          ))}
        </select>
      </Field>

      {/* Email */}
      <Field label="メールアドレス" required error={errors.email?.message}>
        <input
          type="email"
          {...register("email")}
          placeholder="taro.yamada@example.co.jp"
          className={inputCls(!!errors.email)}
        />
      </Field>

      {/* Phone */}
      <Field label="電話番号" hint="任意" error={errors.phone?.message}>
        <input
          type="tel"
          {...register("phone")}
          placeholder="03-0000-0000"
          className={inputCls(!!errors.phone)}
        />
      </Field>

      {/* Store count */}
      <Field label="店舗数" required error={errors.storeCount?.message}>
        <input
          type="number"
          min={1}
          {...register("storeCount")}
          placeholder="500"
          className={inputCls(!!errors.storeCount)}
        />
      </Field>

      {/* Segments */}
      <Field label="業態（複数選択可）" required hint="複数選択可" error={errors.segments?.message as string | undefined}>
        <div className="flex flex-wrap gap-2 pt-1">
          {SEGMENT_OPTIONS.map((s) => {
            const active = selectedSegments.includes(s)
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSegment(s)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[12px] font-medium border transition-colors",
                  active
                    ? "bg-blue-500/15 border-blue-400/40 text-blue-300"
                    : "bg-white/[0.025] border-white/10 text-white/65 hover:border-white/25"
                )}
              >
                {s}
              </button>
            )
          })}
        </div>
      </Field>

      {/* Preferred dates */}
      <Field label="希望日時 1" required error={errors.preferred1?.message}>
        <input
          type="datetime-local"
          {...register("preferred1")}
          className={inputCls(!!errors.preferred1)}
        />
      </Field>
      <Field label="希望日時 2" hint="任意" error={errors.preferred2?.message}>
        <input
          type="datetime-local"
          {...register("preferred2")}
          className={inputCls(!!errors.preferred2)}
        />
      </Field>
      <Field label="希望日時 3" hint="任意" error={errors.preferred3?.message}>
        <input
          type="datetime-local"
          {...register("preferred3")}
          className={inputCls(!!errors.preferred3)}
        />
      </Field>

      {/* Message */}
      <Field label="ご質問 / 事前共有事項" hint="任意 / 2000 文字以内" error={errors.message?.message}>
        <textarea
          rows={5}
          {...register("message")}
          placeholder="現状の課題、特に確認したい論点、参加メンバー等"
          className={cn(inputCls(!!errors.message), "resize-y")}
        />
      </Field>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className={cn(
          "mt-6 w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-md text-white text-[14px] font-medium transition-colors",
          submitting
            ? "bg-blue-500/40 cursor-not-allowed"
            : "bg-blue-500 hover:bg-blue-600"
        )}
      >
        {submitting ? (
          <>送信中...</>
        ) : (
          <>
            デモを依頼
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <p className="mt-4 text-[11px] text-white/35 leading-relaxed flex items-start gap-1.5">
        <ShieldCheck className="w-3 h-3 mt-0.5 shrink-0" />
        ご記入いただいた情報は AENTRO のお問合せ対応のみに使用し、第三者には提供しません。
      </p>
    </form>
  )
}

function inputCls(hasError: boolean) {
  return cn(
    "w-full bg-white/[0.025] border rounded-md px-3 py-2.5 text-[14px] text-white/90 placeholder-white/30 focus:outline-none transition-colors",
    hasError
      ? "border-red-400/50 focus:border-red-400/70"
      : "border-white/10 focus:border-blue-400/50"
  )
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[12px] uppercase tracking-[0.12em] text-white/65 font-medium">
          {label}
          {required && <span className="ml-1 text-red-400/80">*</span>}
        </label>
        {hint && (
          <span className="text-[11px] text-white/35 font-mono">{hint}</span>
        )}
      </div>
      {children}
      {error && (
        <p className="mt-1.5 text-[12px] text-red-400 leading-snug">{error}</p>
      )}
    </div>
  )
}

/* =============================================================
   Confirmation
============================================================= */

function DemoConfirmation() {
  return (
    <div className="border border-emerald-400/25 bg-gradient-to-b from-emerald-500/[0.06] to-white/[0.01] rounded-xl p-7 lg:p-9">
      <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center mb-5">
        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
      </div>

      <h2 className="text-2xl lg:text-3xl font-bold text-white/95 leading-tight">
        ありがとうございます
      </h2>
      <p className="mt-3 text-[14px] text-white/65 leading-relaxed">
        担当からメールでご返信いたします（24 時間以内）。
        <br />
        その間に、こちらの資料をご覧いただけます。
      </p>

      <div className="mt-7 space-y-2.5">
        <ResourceLink
          icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
          label="安全性に関する説明"
          desc="認証 / データ取扱 / 監査"
          href="/security"
          rightIcon={<ArrowRight className="w-3.5 h-3.5 text-white/45" />}
        />
        <ResourceLink
          icon={<BookOpen className="w-4 h-4 text-blue-400" />}
          label="過去の事例 5 社を見る"
          desc="累計 ¥32.1 億の改善実績"
          href="/value#cases"
          rightIcon={<ChevronRight className="w-4 h-4 text-white/45" />}
        />
        <ResourceLink
          icon={<FileText className="w-4 h-4 text-purple-400" />}
          label="デモ + 個別相談"
          desc="検証フロー / 成果物 / 価格"
          href="/poc"
          rightIcon={<ChevronRight className="w-4 h-4 text-white/45" />}
        />
      </div>

      <div className="mt-7 pt-5 border-t border-white/[0.06] flex items-center gap-2 text-[12px] text-white/45">
        <Mail className="w-3.5 h-3.5" />
        ご返信先: ご記入いただいたメールアドレス宛
      </div>
    </div>
  )
}

function ResourceLink({
  icon,
  label,
  desc,
  href,
  rightIcon,
}: {
  icon: React.ReactNode
  label: string
  desc: string
  href: string
  rightIcon: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.04] hover:border-white/[0.12] transition-colors"
    >
      <div className="w-9 h-9 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-white/90">{label}</div>
        <div className="text-[11px] text-white/45 mt-0.5">{desc}</div>
      </div>
      {rightIcon}
    </Link>
  )
}

/* =============================================================
   sub components
============================================================= */

function DemoBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.025] text-[12px] text-white/75">
      <span className="text-blue-400">{icon}</span>
      {label}
    </span>
  )
}

function FaqCard({
  tone,
  question,
  answer,
}: {
  tone: "blue" | "emerald" | "purple" | "amber"
  question: string
  answer: string
}) {
  const toneCls = {
    blue: "bg-blue-500/15 text-blue-400 border-blue-400/25",
    emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-400/25",
    purple: "bg-purple-500/15 text-purple-400 border-purple-400/25",
    amber: "bg-amber-500/15 text-amber-400 border-amber-400/25",
  }[tone]
  return (
    <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-5 lg:p-6">
      <div className="flex items-start gap-3">
        <div className={cn("w-9 h-9 rounded-md border flex items-center justify-center shrink-0", toneCls)}>
          <HelpCircle className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-bold text-white/95 leading-snug mb-2">
            「{question}」
          </h3>
          <p className="text-[13px] text-white/65 leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  )
}

function TimelineStep({
  order,
  time,
  tone,
  title,
  body,
  isLast,
}: {
  order: string
  time: string
  tone: "blue" | "purple" | "amber" | "emerald"
  title: string
  body: string
  isLast?: boolean
}) {
  const toneText = {
    blue: "text-blue-400",
    purple: "text-purple-400",
    amber: "text-amber-400",
    emerald: "text-emerald-400",
  }[tone]
  const toneRing = {
    blue: "border-blue-400/40 bg-blue-500/15",
    purple: "border-purple-400/40 bg-purple-500/15",
    amber: "border-amber-400/40 bg-amber-500/15",
    emerald: "border-emerald-400/40 bg-emerald-500/15",
  }[tone]
  return (
    <div className="relative">
      <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-5 lg:p-6 flex items-start gap-5">
        <div className="flex flex-col items-center shrink-0">
          <div className={cn("w-11 h-11 rounded-full border flex items-center justify-center", toneRing)}>
            <span className={cn("font-mono text-[13px] font-bold", toneText)}>{order}</span>
          </div>
          {!isLast && <div className="mt-2 w-px flex-1 min-h-[24px] bg-white/10" />}
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center gap-3 mb-1.5">
            <h3 className="text-[16px] font-bold text-white/95">{title}</h3>
            <span className={cn("font-mono text-[11px] tracking-[0.12em]", toneText)}>{time}</span>
          </div>
          <p className="text-[13px] text-white/60 leading-relaxed">{body}</p>
        </div>
      </div>
    </div>
  )
}

function ContactCard({
  icon,
  tone,
  label,
  body,
  ctaLabel,
  ctaHref,
  internal,
}: {
  icon: React.ReactNode
  tone: "blue" | "emerald" | "amber"
  label: string
  body: string
  ctaLabel: string
  ctaHref: string
  internal?: boolean
}) {
  const toneCls = {
    blue: "bg-blue-500/15 text-blue-400 border-blue-400/25",
    emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-400/25",
    amber: "bg-amber-500/15 text-amber-400 border-amber-400/25",
  }[tone]
  const Wrapper: React.ElementType = internal ? Link : "a"
  return (
    <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-7 flex flex-col">
      <div className={cn("w-11 h-11 rounded-lg border flex items-center justify-center mb-5", toneCls)}>
        {icon}
      </div>
      <h3 className="text-[16px] font-bold text-white/95 mb-1.5">{label}</h3>
      <p className="text-[13px] text-white/60 leading-relaxed mb-5">{body}</p>
      <Wrapper
        href={ctaHref}
        className="mt-auto inline-flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-md border border-white/15 hover:border-white/30 hover:bg-white/[0.04] text-[13px] text-white/90 transition-colors"
      >
        <span className="truncate">{ctaLabel}</span>
        {internal ? <ChevronRight className="w-4 h-4 text-white/55 shrink-0" /> : <ArrowRight className="w-3.5 h-3.5 text-white/55 shrink-0" />}
      </Wrapper>
    </div>
  )
}

