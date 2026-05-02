"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const PRESETS: { label: string; cron: string }[] = [
  { label: "毎日 0:00", cron: "0 0 * * *" },
  { label: "毎日 3:00 (深夜バッチ)", cron: "0 3 * * *" },
  { label: "毎時", cron: "0 * * * *" },
  { label: "毎週月曜 8:00", cron: "0 8 * * 1" },
  { label: "毎月 1日 0:00", cron: "0 0 1 * *" },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  branches: string[]
  onSave: (cron: string, branch: string, description: string) => void
  initialCron?: string
  initialBranch?: string
}

export function ScheduleDialog({ open, onOpenChange, branches, onSave, initialCron, initialBranch }: Props) {
  const [cron, setCron] = useState(initialCron ?? "0 0 * * *")
  const [branch, setBranch] = useState(initialBranch ?? "main")
  const [description, setDescription] = useState("")
  const [usePreset, setUsePreset] = useState(true)

  const handleSave = () => {
    onSave(cron.trim(), branch, description.trim())
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0c1017] border border-white/[0.08] text-white/85">
        <DialogHeader>
          <DialogTitle className="text-white/90">スケジュール設定</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/45 mb-2">プリセット</div>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.cron}
                  onClick={() => { setCron(p.cron); setUsePreset(true) }}
                  className={`px-3 py-2 rounded border text-[11px] text-left ${cron === p.cron ? "border-blue-400/60 bg-blue-500/10 text-blue-300" : "border-white/[0.08] bg-white/[0.02] text-white/70 hover:bg-white/[0.04]"}`}
                >
                  <div className="font-medium">{p.label}</div>
                  <div className="font-mono text-[10px] text-white/40">{p.cron}</div>
                </button>
              ))}
              <button
                onClick={() => setUsePreset(false)}
                className={`px-3 py-2 rounded border text-[11px] text-left ${!usePreset ? "border-purple-400/60 bg-purple-500/10 text-purple-300" : "border-white/[0.08] bg-white/[0.02] text-white/70 hover:bg-white/[0.04]"}`}
              >
                <div className="font-medium">カスタム</div>
                <div className="text-[10px] text-white/40">cron 式を直接入力</div>
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/45">cron 式</label>
            <input
              value={cron}
              onChange={(e) => { setCron(e.target.value); setUsePreset(false) }}
              placeholder="0 0 * * *"
              className="mt-1 w-full px-3 py-2 rounded bg-black/40 border border-white/[0.08] text-[12px] text-white/85 font-mono focus:outline-none focus:border-blue-400/40"
            />
            <div className="text-[10px] text-white/40 mt-1">分 時 日 月 曜日</div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/45">実行ブランチ</label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded bg-black/40 border border-white/[0.08] text-[12px] text-white/85 focus:outline-none focus:border-blue-400/40"
            >
              {branches.map((b) => (
                <option key={b} value={b} className="bg-[#0c1017]">{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/45">説明 (任意)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="毎日 3:00 POS 取込"
              className="mt-1 w-full px-3 py-2 rounded bg-black/40 border border-white/[0.08] text-[12px] text-white/85 focus:outline-none focus:border-blue-400/40"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white/60 hover:bg-white/[0.04]">キャンセル</Button>
          <Button onClick={handleSave} className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30">登録</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
