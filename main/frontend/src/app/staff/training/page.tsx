"use client"

import { useMemo, useState } from "react"
import { GraduationCap, Play, Award, Check, X } from "lucide-react"
import { BigTapButton } from "@/components/staff/BigTapButton"

type Role = "hall" | "kitchen" | "register" | "all"

interface Video {
  id: string
  title: string
  duration: string
  role: Role
  youtubeId: string
  description: string
}

const videos: Video[] = [
  {
    id: "v-onboard",
    title: "新人オリエンテーション",
    duration: "5:30",
    role: "all",
    youtubeId: "dQw4w9WgXcQ",
    description: "AENTRO店舗の理念と基本ルール",
  },
  {
    id: "v-hall-greet",
    title: "ホール: お客様お迎え",
    duration: "3:10",
    role: "hall",
    youtubeId: "dQw4w9WgXcQ",
    description: "笑顔・声かけ・席案内の基本",
  },
  {
    id: "v-hall-clean",
    title: "ホール: テーブル清掃",
    duration: "4:00",
    role: "hall",
    youtubeId: "dQw4w9WgXcQ",
    description: "5S徹底とアルコール消毒",
  },
  {
    id: "v-kitchen-temp",
    title: "キッチン: 温度管理",
    duration: "6:15",
    role: "kitchen",
    youtubeId: "dQw4w9WgXcQ",
    description: "HACCP準拠のCCP記録方法",
  },
  {
    id: "v-kitchen-allergen",
    title: "キッチン: アレルゲン分離",
    duration: "5:45",
    role: "kitchen",
    youtubeId: "dQw4w9WgXcQ",
    description: "クロスコンタミ防止プロトコル",
  },
  {
    id: "v-register-cash",
    title: "レジ: 釣銭ミスを防ぐ",
    duration: "4:30",
    role: "register",
    youtubeId: "dQw4w9WgXcQ",
    description: "二度確認とPOS入力の基礎",
  },
]

const roleTabs: { key: Role; label: string }[] = [
  { key: "all", label: "全員" },
  { key: "hall", label: "ホール" },
  { key: "kitchen", label: "キッチン" },
  { key: "register", label: "レジ" },
]

const sampleQuiz = [
  {
    q: "ホット商品の保管温度の下限は？",
    options: ["55℃", "60℃", "65℃", "75℃"],
    correct: 2,
  },
  {
    q: "アレルゲン提供時に最初に確認すべきことは？",
    options: ["価格", "材料表示", "数量", "提供時間"],
    correct: 1,
  },
  {
    q: "閉店点検で必ず行うのは？",
    options: ["在庫補充", "金庫照合", "メニュー変更", "求人掲載"],
    correct: 1,
  },
]

export default function StaffTrainingPage() {
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
        <button onClick={() => setPlaying(null)} className="text-sm text-white/60">← 戻る</button>
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
        <BigTapButton tone="success" label="視聴完了 → 確認テスト" onClick={() => { setPlaying(null); setQuizMode(true) }} />
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
            <h2 className="text-3xl font-bold">{passed ? "認定取得！" : "もう一度挑戦"}</h2>
            <div className="text-white/70 mt-2">
              {score} / {sampleQuiz.length} 問正解
            </div>
          </div>
          {passed && (
            <div className="mx-auto max-w-sm rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-transparent p-5 text-left">
              <div className="text-xs text-emerald-300/70">AENTRO 認定証</div>
              <div className="text-lg font-bold mt-1">店舗オペレーション基礎 修了</div>
              <div className="text-xs text-white/60 mt-2">
                発行日 {new Date().toLocaleDateString("ja-JP")} ・ ID: CERT-{Math.random().toString(36).slice(2, 8).toUpperCase()}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <BigTapButton
              tone="primary"
              label="もう一度受験"
              onClick={() => { setAnswers([]); setQIdx(0); setDone(false) }}
            />
            <BigTapButton tone="ghost" label="動画一覧に戻る" onClick={() => { setQuizMode(false); setDone(false); setAnswers([]); setQIdx(0) }} />
          </div>
        </div>
      )
    }
    const cur = sampleQuiz[qIdx]
    return (
      <div className="px-4 py-5 space-y-5">
        <div className="text-xs text-white/50">確認テスト {qIdx + 1} / {sampleQuiz.length}</div>
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
        <h1 className="text-2xl font-bold">学習・トレーニング</h1>
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
          <div className="text-sm font-semibold">確認テスト</div>
          <div className="text-xs text-white/60 mt-0.5">3問・2問正解で認定証発行</div>
        </div>
        <button
          onClick={() => setQuizMode(true)}
          className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold"
        >
          受験
        </button>
      </div>
    </div>
  )
}
