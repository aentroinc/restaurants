"use client"

import { useState } from "react"
import Link from "next/link"
import { ContextHeader } from "@/components/context-header"
import { Sparkles, Zap, Plus, ChevronRight, Trash2, Play, Save, MessageSquare, Building2, AlertTriangle, ArrowRight, CheckCircle2, Loader2 } from "lucide-react"

interface WorkflowSpec {
  trigger: { type: string; condition: string; threshold?: string; window?: string }
  filter?: { brand?: string; region?: string; storeCount?: string }
  action: { type: string; target: string; description: string }
  enabled: boolean
  estimated_value?: string
}

const PRESETS: { id: string; nl: string; spec: WorkflowSpec }[] = [
  {
    id: "p1",
    nl: "もし 廃棄金額が前週比 +20% を超えたら、SV mission を作成してエリアマネージャに通知する",
    spec: {
      trigger: { type: "kpi_threshold", condition: "waste_amount_wow_pct > 20", threshold: "+20%", window: "前週比" },
      action: { type: "create_sv_mission", target: "エリアマネージャ", description: "緊急訪問・廃棄削減対応" },
      enabled: true,
      estimated_value: "年間 ¥4.8M / 検出店舗",
    },
  },
  {
    id: "p2",
    nl: "もし HACCP CCP の温度逸脱が連続3回検出されたら、店長に Slack 通知する",
    spec: {
      trigger: { type: "haccp_deviation", condition: "ccp_deviation_count >= 3", threshold: "連続3回", window: "1日" },
      action: { type: "slack_notify", target: "店長", description: "HACCP 温度管理 緊急対応依頼" },
      enabled: true,
      estimated_value: "食品事故リスク回避",
    },
  },
  {
    id: "p3",
    nl: "もし health_score が 60 を下回る店舗が出たら、改善 task を自動生成する",
    spec: {
      trigger: { type: "kpi_threshold", condition: "health_score < 60", threshold: "60 未満", window: "日次" },
      action: { type: "create_task", target: "店長", description: "店舗改善計画の起票" },
      enabled: true,
      estimated_value: "年間 ¥1.5M / 店舗",
    },
  },
]

const SAVED_WORKFLOWS = [
  { id: "wf-001", name: "深夜帯シフト過剰検知", trigger: "labor_cost_rate_night > 35%", action: "シフト見直し提案", runs: 142, success: 138, last_run: "2026-05-02 03:14" },
  { id: "wf-002", name: "在庫枯渇予測（牛バラ）", trigger: "inventory_days_remaining < 1.5", action: "前倒し補充提案", runs: 87, success: 82, last_run: "2026-05-01 23:30" },
  { id: "wf-003", name: "リピート率 -5pt 以上 検知", trigger: "repeat_rate_mom < -5", action: "QSC 緊急監査", runs: 23, success: 23, last_run: "2026-04-30 14:00" },
]

export default function WorkflowBuilderPage() {
  const [nlInput, setNlInput] = useState("")
  const [generating, setGenerating] = useState(false)
  const [generatedSpec, setGeneratedSpec] = useState<WorkflowSpec | null>(null)
  const [name, setName] = useState("")

  const generateFromNL = async () => {
    setGenerating(true)
    setGeneratedSpec(null)
    // simulate AI generation (in real implementation, call /api/v1/ai/chat with workflow gen tool)
    await new Promise((r) => setTimeout(r, 1500))
    // pattern match
    const lower = nlInput.toLowerCase()
    let spec: WorkflowSpec
    if (lower.includes("廃棄") || lower.includes("waste")) {
      spec = PRESETS[0].spec
    } else if (lower.includes("haccp") || lower.includes("温度")) {
      spec = PRESETS[1].spec
    } else if (lower.includes("health") || lower.includes("score")) {
      spec = PRESETS[2].spec
    } else if (lower.includes("欠品") || lower.includes("在庫") || lower.includes("stockout")) {
      spec = {
        trigger: { type: "inventory_threshold", condition: "stockout_risk > 0.7", threshold: "70%", window: "リアルタイム" },
        action: { type: "create_replenishment", target: "本部 SCM", description: "前倒し補充指示" },
        enabled: true,
        estimated_value: "年間 ¥3.2M / 検出店舗",
      }
    } else {
      spec = {
        trigger: { type: "kpi_threshold", condition: "(条件を AI が解析中)", threshold: "?", window: "日次" },
        action: { type: "notify", target: "担当者", description: "(アクション内容を AI が解析中)" },
        enabled: true,
      }
    }
    setGeneratedSpec(spec)
    setName(nlInput.slice(0, 30))
    setGenerating(false)
  }

  const usePreset = (preset: typeof PRESETS[0]) => {
    setNlInput(preset.nl)
    setGeneratedSpec(preset.spec)
    setName(preset.nl.slice(0, 30))
  }

  return (
    <div className="flex flex-col h-screen">
      <ContextHeader title="Workflow Builder" description="自然言語で「もし X なら Y」を作成 — AIP Studio 相当" region="-" />
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="rounded-xl border border-purple-400/20 bg-gradient-to-br from-purple-500/[0.08] via-purple-500/[0.03] to-transparent p-5">
          <div className="flex items-center gap-2 text-[11px] text-purple-400/80 uppercase tracking-wider font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" /> 自然言語で workflow を作る
          </div>
          <p className="text-[13px] text-white/65 leading-relaxed">
            「もし [トリガー条件] なら [アクション]」の形で書いてください。AI が ontology / KPI 定義を参照して実行可能な workflow に変換します。
          </p>
        </div>

        {/* NL input */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
          <label className="text-[12px] text-white/60">workflow を日本語で記述</label>
          <textarea
            value={nlInput}
            onChange={(e) => setNlInput(e.target.value)}
            placeholder="例: もし 廃棄金額が前週比 +20% を超えたら、SV mission を作成してエリアマネージャに通知する"
            className="w-full h-24 px-4 py-3 rounded-md bg-black/30 border border-white/[0.08] text-[13px] text-white/85 resize-none focus:outline-none focus:border-purple-400/40"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/40">
              {nlInput.length} / 200 文字
            </span>
            <button
              onClick={generateFromNL}
              disabled={generating || !nlInput.trim()}
              className="px-4 py-2 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-[13px] inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> 解析中...</> : <><Zap className="w-4 h-4" /> AI で生成</>}
            </button>
          </div>
        </div>

        {/* Generated spec */}
        {generatedSpec && (
          <div className="rounded-lg border-2 border-emerald-400/30 bg-emerald-500/[0.04] p-5 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-[12px] text-emerald-400/80 uppercase tracking-wider font-bold">AI が生成した spec</span>
              </div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="workflow 名"
                className="px-3 py-1 rounded bg-black/30 border border-white/[0.08] text-[12px] text-white/85"
              />
            </div>

            {/* Visual blocks */}
            <div className="space-y-2">
              {/* Trigger block */}
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-9 h-9 rounded-md bg-amber-500/15 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1 rounded-md border border-amber-400/20 bg-amber-500/[0.05] p-3">
                  <div className="text-[10px] text-amber-400/80 uppercase tracking-wider">▸ もし (Trigger)</div>
                  <div className="mt-1 text-[13px] text-white/85 font-mono">
                    {generatedSpec.trigger.condition}
                  </div>
                  {generatedSpec.trigger.threshold && (
                    <div className="mt-1 text-[10px] text-white/45">
                      閾値: {generatedSpec.trigger.threshold}・対象期間: {generatedSpec.trigger.window}
                    </div>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <div className="ml-4 text-white/30">↓</div>

              {/* Action block */}
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-9 h-9 rounded-md bg-blue-500/15 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1 rounded-md border border-blue-400/20 bg-blue-500/[0.05] p-3">
                  <div className="text-[10px] text-blue-400/80 uppercase tracking-wider">▸ なら (Action)</div>
                  <div className="mt-1 text-[13px] text-white/85">{generatedSpec.action.description}</div>
                  <div className="mt-1 text-[10px] text-white/45">
                    対象: {generatedSpec.action.target}・タイプ: <span className="font-mono">{generatedSpec.action.type}</span>
                  </div>
                </div>
              </div>

              {/* Estimated value */}
              {generatedSpec.estimated_value && (
                <div className="ml-12 mt-2 px-3 py-2 rounded bg-emerald-500/[0.08] border border-emerald-400/20 text-[11px] text-emerald-400">
                  💰 推定効果: {generatedSpec.estimated_value}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[12px]">
                <Save className="w-3.5 h-3.5" /> 保存
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-[12px]">
                <Play className="w-3.5 h-3.5" /> 試し実行（過去30日データ）
              </button>
              <button onClick={() => setGeneratedSpec(null)} className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded bg-white/[0.04] hover:bg-red-500/15 hover:text-red-400 text-white/55 text-[12px]">
                <Trash2 className="w-3.5 h-3.5" /> 破棄
              </button>
            </div>
          </div>
        )}

        {/* Presets */}
        {!generatedSpec && (
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <div className="px-5 py-3 border-b border-white/[0.06]">
              <span className="text-[12px] font-semibold text-white/60 tracking-wide uppercase">テンプレート</span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => usePreset(p)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.03] transition-colors text-left"
                >
                  <MessageSquare className="w-4 h-4 text-purple-400/60 shrink-0" />
                  <span className="flex-1 text-[13px] text-white/80">{p.nl}</span>
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Saved workflows */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-[12px] font-semibold text-white/60 tracking-wide uppercase">運用中の workflow ({SAVED_WORKFLOWS.length})</span>
            <button className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300">
              <Plus className="w-3 h-3" /> 新規
            </button>
          </div>
          <table className="w-full text-[12px]">
            <thead className="text-white/40 border-b border-white/[0.04]">
              <tr>
                <th className="text-left px-5 py-2 font-medium">名前</th>
                <th className="text-left px-3 py-2 font-medium">トリガー</th>
                <th className="text-left px-3 py-2 font-medium">アクション</th>
                <th className="text-right px-3 py-2 font-medium">実行</th>
                <th className="text-right px-3 py-2 font-medium">成功率</th>
                <th className="text-right px-3 py-2 font-medium">最終実行</th>
              </tr>
            </thead>
            <tbody className="text-white/75">
              {SAVED_WORKFLOWS.map((w) => (
                <tr key={w.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer">
                  <td className="px-5 py-3 text-white/85 font-medium">{w.name}</td>
                  <td className="px-3 py-3 font-mono text-amber-400/80 text-[10px]">{w.trigger}</td>
                  <td className="px-3 py-3 text-blue-400/80 text-[11px]">{w.action}</td>
                  <td className="text-right px-3 py-3 font-mono">{w.runs}</td>
                  <td className="text-right px-3 py-3 font-mono">
                    <span className={w.success / w.runs > 0.95 ? "text-emerald-400" : "text-amber-400"}>
                      {Math.round((w.success / w.runs) * 100)}%
                    </span>
                  </td>
                  <td className="text-right px-3 py-3 text-white/50 text-[10px]">{w.last_run}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-[11px] text-white/50">
          <strong className="text-white/70">仕組み:</strong> 自然言語入力 → Claude が ontology + KPI 定義を読み spec 生成 → 既存 KPI engine と Workflow engine で実行 → audit log に全記録。AI 統制パネルで role × workflow の権限制御可能。
        </div>
      </div>
    </div>
  )
}
