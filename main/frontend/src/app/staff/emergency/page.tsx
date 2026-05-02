"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Flame, Activity, ShieldOff, Soup, HeartPulse, Phone } from "lucide-react"

type Scenario = "fire" | "earthquake" | "robbery" | "food_poisoning" | "injury" | "anaphylaxis"

interface ScenarioDef {
  key: Scenario
  title: string
  icon: React.ReactNode
  color: string
  steps: string[]
  call?: { label: string; number: string }[]
}

const scenarios: ScenarioDef[] = [
  {
    key: "fire",
    title: "火災",
    icon: <Flame className="h-6 w-6" />,
    color: "border-red-500/40 bg-red-500/10 text-red-100",
    call: [{ label: "119（消防）", number: "119" }],
    steps: [
      "大声で「火事だー！」と叫ぶ。スタッフ全員に周知。",
      "お客様を非常口へ誘導（避難経路図参照）。",
      "可能なら初期消火（消火器・天ぷら油は布で蓋）。",
      "ガス元栓・電気ブレーカーを切る。",
      "119へ通報。住所・店名を伝える。",
      "店外集合場所に集合し、人数確認。店長へ連絡。",
    ],
  },
  {
    key: "earthquake",
    title: "地震",
    icon: <Activity className="h-6 w-6" />,
    color: "border-amber-500/40 bg-amber-500/10 text-amber-100",
    steps: [
      "「地震です！身を低く！」と大声で。",
      "お客様にテーブル下に隠れるよう案内。",
      "厨房スタッフは火を止める。コンロから離れる。",
      "揺れが収まったら出口を確保（ドアを開ける）。",
      "ガス漏れ確認、漏れていたら換気・火気厳禁。",
      "店長へ報告、被害状況を確認。",
    ],
  },
  {
    key: "robbery",
    title: "強盗",
    icon: <ShieldOff className="h-6 w-6" />,
    color: "border-purple-500/40 bg-purple-500/10 text-purple-100",
    call: [{ label: "110（警察）", number: "110" }],
    steps: [
      "抵抗しない。命が最優先。",
      "犯人の指示に従い金銭を渡す。",
      "犯人の特徴を観察（身長・服装・声・凶器）。",
      "犯人が立ち去ったら、すぐにドアを施錠。",
      "110通報。現場保存（触らない）。",
      "防犯カメラ映像を確認、店長・本部へ連絡。",
    ],
  },
  {
    key: "food_poisoning",
    title: "食中毒疑い",
    icon: <Soup className="h-6 w-6" />,
    color: "border-orange-500/40 bg-orange-500/10 text-orange-100",
    steps: [
      "お客様の症状を聴取（嘔吐・下痢・発熱）。発生時刻と摂取メニューも記録。",
      "重症の場合は救急車を要請（119）。",
      "該当メニュー・原材料を保管（廃棄禁止）。",
      "店長・本部品質管理に即時連絡。",
      "保健所からの聞き取りに備え、提供記録を整理。",
      "お客様には誠意を持って対応。賠償の話は本部判断。",
    ],
  },
  {
    key: "injury",
    title: "お客様怪我",
    icon: <HeartPulse className="h-6 w-6" />,
    color: "border-pink-500/40 bg-pink-500/10 text-pink-100",
    call: [{ label: "119（救急）", number: "119" }],
    steps: [
      "お客様の意識・呼吸を確認。重症なら119。",
      "出血があれば清潔な布で圧迫止血。",
      "やけどは流水で冷却（10〜20分）。",
      "AEDが必要なら近くから取得（場所は店舗マップ）。",
      "怪我の発生状況を記録（時刻・場所・原因）。",
      "店長・本部へ即時連絡。お客様情報を控える。",
    ],
  },
  {
    key: "anaphylaxis",
    title: "アナフィラキシー",
    icon: <HeartPulse className="h-6 w-6" />,
    color: "border-red-500/40 bg-red-500/10 text-red-100",
    call: [{ label: "119（救急）", number: "119" }],
    steps: [
      "ただちに 119 通報。「アナフィラキシーです」と伝える。",
      "お客様を仰向けに寝かせ、足を上げる（ショック体位）。",
      "本人がエピペン所持なら使用を支援（太もも外側に注射）。",
      "気道確保。意識・呼吸を観察し続ける。",
      "嘔吐の場合は横向きに。",
      "救急隊到着まで離れない。摂取したメニュー・成分を記録。",
    ],
  },
]

export default function StaffEmergencyPage() {
  return (
    <Suspense fallback={<div className="px-4 py-5 text-white/60">読み込み中...</div>}>
      <EmergencyInner />
    </Suspense>
  )
}

function EmergencyInner() {
  const searchParams = useSearchParams()
  const initial = searchParams.get("scenario") as Scenario | null
  const [picked, setPicked] = useState<Scenario | null>(null)

  useEffect(() => {
    if (initial && scenarios.some((s) => s.key === initial)) setPicked(initial)
  }, [initial])

  if (picked) {
    const s = scenarios.find((x) => x.key === picked)!
    return (
      <div className={`px-4 py-5 space-y-5`}>
        <button onClick={() => setPicked(null)} className="text-sm text-white/60">← 一覧</button>
        <div className={`rounded-2xl border ${s.color} p-5 flex items-center gap-3`}>
          <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center">{s.icon}</div>
          <h1 className="text-3xl font-bold">{s.title}</h1>
        </div>

        {s.call && (
          <div className="space-y-2">
            {s.call.map((c) => (
              <a
                key={c.number}
                href={`tel:${c.number}`}
                className="w-full rounded-2xl bg-red-500 hover:bg-red-400 active:scale-[0.98] text-white font-bold px-5 py-5 flex items-center justify-center gap-3 text-2xl shadow-lg"
              >
                <Phone className="h-7 w-7" /> {c.label}
              </a>
            ))}
          </div>
        )}

        <ol className="space-y-3">
          {s.steps.map((step, i) => (
            <li
              key={i}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 flex gap-3 items-start"
            >
              <div className="h-9 w-9 shrink-0 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-base">
                {i + 1}
              </div>
              <div className="text-base leading-relaxed pt-1">{step}</div>
            </li>
          ))}
        </ol>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/60 text-center">
          焦らず、声を出し、仲間と連携。
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-5 space-y-4">
      <h1 className="text-2xl font-bold">緊急マニュアル</h1>
      <p className="text-sm text-white/60">該当シナリオをタップ</p>
      <div className="space-y-3">
        {scenarios.map((s) => (
          <button
            key={s.key}
            onClick={() => setPicked(s.key)}
            className={`w-full rounded-2xl border p-5 flex items-center gap-4 text-left active:scale-[0.99] ${s.color}`}
          >
            <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              {s.icon}
            </div>
            <div className="flex-1">
              <div className="text-xl font-bold">{s.title}</div>
              <div className="text-xs opacity-80 mt-1">{s.steps.length} ステップ</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
