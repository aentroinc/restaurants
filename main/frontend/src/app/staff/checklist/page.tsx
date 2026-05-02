"use client"

import { useRouter } from "next/navigation"
import { Sun, Sunset, Moon, CalendarDays, ArrowRight } from "lucide-react"
import { BigTapButton } from "@/components/staff/BigTapButton"

const templates = [
  { key: "opening", label: "開店前点検", sub: "OPENINGスタッフ向け", icon: Sun, tone: "primary" as const },
  { key: "4h", label: "4時間ごとの中間点検", sub: "ピーク後の温度・清掃", icon: Sunset, tone: "warn" as const },
  { key: "closing", label: "閉店点検", sub: "CLOSINGスタッフ向け", icon: Moon, tone: "ghost" as const },
  { key: "weekly", label: "週次点検", sub: "毎週月曜午前", icon: CalendarDays, tone: "ghost" as const },
]

export default function StaffChecklistLandingPage() {
  const router = useRouter()
  return (
    <div className="px-4 py-5 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">ライン点検</h1>
        <p className="text-sm text-white/60 mt-1">時間帯のテンプレを選択してください</p>
      </div>

      <div className="space-y-3">
        {templates.map((t) => {
          const Icon = t.icon
          return (
            <BigTapButton
              key={t.key}
              tone={t.tone}
              icon={<Icon className="h-6 w-6" />}
              label={t.label}
              sublabel={t.sub}
              onClick={() => router.push(`/line-check?template=${t.key}`)}
            />
          )
        })}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">本日の進捗</div>
          <div className="text-xs text-white/60 mt-1">開店前: 未実施 / 中間: 未実施</div>
        </div>
        <button
          onClick={() => router.push("/line-check")}
          className="text-sm flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
        >
          詳細 <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
