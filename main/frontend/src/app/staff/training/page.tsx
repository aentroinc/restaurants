"use client"

import { useMemo, useState } from "react"
import { GraduationCap, Play, Award, Check, X } from "lucide-react"
import { BigTapButton } from "@/components/staff/BigTapButton"
import { useTranslations, useLocale } from "@/i18n/I18nProvider"
import { formatDate } from "@/lib/format"

type Role = "hall" | "kitchen" | "register" | "all"

interface Video {
  id: string
  title: string
  duration: string
  role: Role
  youtubeId: string
  description: string
}

interface VideoSeed {
  id: string
  duration: string
  role: Role
  youtubeId: string
}

const videoSeeds: VideoSeed[] = [
  { id: "v-onboard", duration: "5:30", role: "all", youtubeId: "dQw4w9WgXcQ" },
  { id: "v-hall-greet", duration: "3:10", role: "hall", youtubeId: "dQw4w9WgXcQ" },
  { id: "v-hall-clean", duration: "4:00", role: "hall", youtubeId: "dQw4w9WgXcQ" },
  { id: "v-kitchen-temp", duration: "6:15", role: "kitchen", youtubeId: "dQw4w9WgXcQ" },
  { id: "v-kitchen-allergen", duration: "5:45", role: "kitchen", youtubeId: "dQw4w9WgXcQ" },
  { id: "v-register-cash", duration: "4:30", role: "register", youtubeId: "dQw4w9WgXcQ" },
]

const roleKeys: Role[] = ["all", "hall", "kitchen", "register"]
const quizKeys = ["q1", "q2", "q3"] as const
const quizCorrect: number[] = [2, 1, 1]

export default function StaffTrainingPage() {
  const t = useTranslations("training")
  const tCommon = useTranslations("common")
  const locale = useLocale()
  const videos: Video[] = videoSeeds.map((v) => ({
    ...v,
    title: t(`videos.${v.id}.title`),
    description: t(`videos.${v.id}.desc`),
  }))
  const roleTabs = roleKeys.map((k) => ({ key: k, label: t(`roles.${k}`) }))
  const sampleQuiz = quizKeys.map((q, i) => ({
    q: t(`quiz.${q}.q`),
    options: t.raw(`quiz.${q}.a`) as string[],
    correct: quizCorrect[i],
  }))
  const [role, setRole] = useState<Role>("all")
  const [playing, setPlaying] = useState<Video | null>(null)
  const [quizMode, setQuizMode] = useState(false)
  const [qIdx, setQIdx] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [done, setDone] = useState(false)

  const list = useMemo(
    () => (role === "all" ? videos : videos.filter((v) => v.role === role || v.role === "all")),
    [role],
  )

  const score = answers.filter((a, i) => a === sampleQuiz[i].correct).length

  if (playing) {
    return (
      <div className="px-4 py-5 space-y-4">
        <button onClick={() => setPlaying(null)} className="text-sm text-white/60">← {tCommon("back")}</button>
        <div className="aspect-video rounded-xl overflow-hidden border border-white/10">
          <iframe
            src={`https://www.youtube.com/embed/${playing.youtubeId}`}
            title={playing.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div>
          <h2 className="text-xl font-bold">{playing.title}</h2>
          <p className="text-sm text-white/60 mt-1">{playing.description}</p>
        </div>
        <BigTapButton tone="success" label={t("watchedNext")} onClick={() => { setPlaying(null); setQuizMode(true) }} />
      </div>
    )
  }

  if (quizMode) {
    if (done) {
      const passed = score >= 2
      return (
        <div className="px-4 py-10 text-center space-y-6">
          {passed ? (
            <div className="mx-auto h-28 w-28 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Award className="h-14 w-14 text-emerald-400" />
            </div>
          ) : (
            <div className="mx-auto h-28 w-28 rounded-full bg-amber-500/20 flex items-center justify-center">
              <X className="h-14 w-14 text-amber-400" />
            </div>
          )}
          <div>
            <h2 className="text-3xl font-bold">{passed ? t("passed") : t("failed")}</h2>
            <div className="text-white/70 mt-2">
              {t("score", { score, total: sampleQuiz.length })}
            </div>
          </div>
          {passed && (
            <div className="mx-auto max-w-sm rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-transparent p-5 text-left">
              <div className="text-xs text-emerald-300/70">{t("certTitle")}</div>
              <div className="text-lg font-bold mt-1">{t("certBody")}</div>
              <div className="text-xs text-white/60 mt-2">
                {t("certIssued", { date: formatDate(new Date(), locale), id: "CERT-" + Math.random().toString(36).slice(2, 8).toUpperCase() })}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <BigTapButton
              tone="primary"
              label={t("retake")}
              onClick={() => { setAnswers([]); setQIdx(0); setDone(false) }}
            />
            <BigTapButton tone="ghost" label={t("backToList")} onClick={() => { setQuizMode(false); setDone(false); setAnswers([]); setQIdx(0) }} />
          </div>
        </div>
      )
    }
    const cur = sampleQuiz[qIdx]
    return (
      <div className="px-4 py-5 space-y-5">
        <div className="text-xs text-white/50">{t("quizProgress", { cur: qIdx + 1, total: sampleQuiz.length })}</div>
        <h2 className="text-xl font-bold">{cur.q}</h2>
        <div className="space-y-3">
          {cur.options.map((o, i) => (
            <button
              key={i}
              onClick={() => {
                const next = [...answers, i]
                setAnswers(next)
                if (qIdx + 1 >= sampleQuiz.length) setDone(true)
                else setQIdx(qIdx + 1)
              }}
              className="w-full min-h-[60px] rounded-xl border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] active:scale-[0.98] px-4 py-3 text-left text-base"
            >
              {o}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-5 space-y-5">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-6 w-6 text-indigo-400" />
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {roleTabs.map((r) => (
          <button
            key={r.key}
            onClick={() => setRole(r.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
              role === r.key ? "bg-emerald-500 text-white" : "bg-white/[0.06] text-white/70 hover:bg-white/[0.10]"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {list.map((v) => (
          <button
            key={v.id}
            onClick={() => setPlaying(v)}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] p-4 flex items-center gap-3 text-left active:scale-[0.99]"
          >
            <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Play className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">{v.title}</div>
              <div className="text-xs text-white/50 mt-0.5">{v.description}</div>
            </div>
            <div className="text-xs text-white/50 tabular-nums">{v.duration}</div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 flex items-center gap-3">
        <Check className="h-5 w-5 text-indigo-300" />
        <div className="flex-1">
          <div className="text-sm font-semibold">{t("quizCard")}</div>
          <div className="text-xs text-white/60 mt-0.5">{t("quizDesc")}</div>
        </div>
        <button
          onClick={() => setQuizMode(true)}
          className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold"
        >
          {t("quizCta")}
        </button>
      </div>
    </div>
  )
}
