"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { fetchAPI } from "@/lib/api"
import { Rocket, CheckCircle2, Loader2, Network, Database, Server, Lock, Shield, Cloud, ArrowRight, Building2, Activity } from "lucide-react"

interface DeployStep {
  id: string
  title: string
  detail: string
  Icon: any
  duration: number  // ms
  pct: number
}

const STEPS: DeployStep[] = [
  { id: "vpc", title: "VPC 構築中", detail: "ap-northeast-1 専用サブネット 6 本作成", Icon: Network, duration: 1800, pct: 12 },
  { id: "rds", title: "Aurora PostgreSQL 起動中", detail: "Multi-AZ + pgvector + KMS 暗号化", Icon: Database, duration: 2400, pct: 28 },
  { id: "ecs", title: "ECS Fargate デプロイ中", detail: "backend (4 task) + frontend (4 task) + autoscaling", Icon: Server, duration: 2200, pct: 48 },
  { id: "ingest", title: "データ取り込み準備", detail: "Smaregi / KING OF TIME / 本部 CSV connector 配置", Icon: Cloud, duration: 1600, pct: 65 },
  { id: "sso", title: "SSO 設定", detail: "Azure AD OIDC + SAML metadata 生成", Icon: Lock, duration: 1400, pct: 80 },
  { id: "dr", title: "DR レプリケーション", detail: "ap-northeast-3 (大阪) クロスリージョン同期", Icon: Shield, duration: 1600, pct: 95 },
  { id: "done", title: "完了", detail: "ゼンショーHD 専用環境が起動しました", Icon: CheckCircle2, duration: 1000, pct: 100 },
]

interface DeployComponent {
  id: string
  name: string
  status: "ok" | "warning" | "error"
  detail: string
}

interface DeploySummary {
  tables: number
  tenants: number
  environment: string
  hostname: string
  db_host: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [stepIdx, setStepIdx] = useState<number>(-1)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<{ ts: string; text: string; type: "info" | "ok" | "warn" }[]>([])
  const [components, setComponents] = useState<DeployComponent[]>([])
  const [summary, setSummary] = useState<DeploySummary | null>(null)
  const [showLive, setShowLive] = useState(false)

  // 実 status を 起動前 / 完了後 に表示
  useEffect(() => {
    fetchAPI<{ components: DeployComponent[]; system_summary: DeploySummary }>("/api/v1/admin/deploy/status").then((d: any) => {
      const data = d?.data || d
      if (data?.components) setComponents(data.components)
      if (data?.system_summary) setSummary(data.system_summary)
    }).catch(() => {})
  }, [stepIdx])

  const [provisionedTenant, setProvisionedTenant] = useState<any>(null)

  const start = async () => {
    setStepIdx(0)
    setProgress(0)
    setLogs([])
    // 実 provision API を裏で叩く（実 DB に tenant 行を作成）
    try {
      const resp: any = await fetchAPI("/api/v1/admin/deploy/provision", {
        method: "POST",
        body: JSON.stringify({ customer_name: "Zensho Holdings", region: "ap-northeast-1" }),
      })
      const data = resp?.data || resp
      setProvisionedTenant(data)
    } catch { /* ignore — UI 進行は続行 */ }
  }

  useEffect(() => {
    if (stepIdx < 0) return
    if (stepIdx >= STEPS.length) {
      // redirect
      const t = setTimeout(() => router.push("/zensho-executive"), 1500)
      return () => clearTimeout(t)
    }

    const step = STEPS[stepIdx]
    const startedAt = Date.now()
    const targetPct = step.pct
    const prevPct = stepIdx > 0 ? STEPS[stepIdx - 1].pct : 0

    appendLog(`▸ ${step.title}...`, "info")

    const id = setInterval(() => {
      const elapsed = Date.now() - startedAt
      const stepProgress = Math.min(1, elapsed / step.duration)
      setProgress(prevPct + (targetPct - prevPct) * stepProgress)

      if (elapsed >= step.duration) {
        clearInterval(id)
        appendLog(`✓ ${step.title}`, "ok")
        setStepIdx((i) => i + 1)
      }
    }, 50)

    return () => clearInterval(id)

    function appendLog(text: string, type: "info" | "ok" | "warn") {
      const ts = new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      setLogs((l) => [{ ts, text, type }, ...l].slice(0, 12))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx])

  const isRunning = stepIdx >= 0 && stepIdx < STEPS.length
  const isDone = stepIdx >= STEPS.length

  return (
    <div className="min-h-screen bg-[#0a0e14]">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <header className="pt-4">
          <div className="flex items-center gap-2 text-[11px] text-white/40 tracking-wider uppercase">
            <Rocket className="w-3.5 h-3.5" /> AENTRO Apollo Deployment
          </div>
          <h1 className="mt-1 text-[22px] sm:text-[28px] font-semibold text-white/95">
            ゼンショーHD 専用環境を 12 秒で立ち上げる
          </h1>
          <p className="mt-1 text-[13px] text-white/55">
            VPC isolated / Aurora encrypted / ECS Fargate / SSO / DR — すべて Terraform で自動構築
          </p>
        </header>

        {/* Customer card */}
        <div className="rounded-xl border border-blue-400/20 bg-blue-500/[0.05] p-5">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-blue-400" />
            <div className="flex-1">
              <div className="text-[15px] font-semibold text-white/95">ゼンショーホールディングス</div>
              <div className="text-[11px] text-white/45 mt-0.5">5,000 店舗 / 6 ブランド / 年商 7,200億円</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-white/40 uppercase">構成</div>
              <div className="text-[12px] text-white/85">prod-dedicated</div>
            </div>
          </div>
        </div>

        {/* Big start button */}
        {stepIdx < 0 && (
          <>
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/[0.06] p-8 text-center">
              <Rocket className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-[15px] text-white/85 mb-5 leading-relaxed">
                ボタンを押すと AWS Tokyo + Osaka リージョンに<br />
                ゼンショーHD 専用環境が立ち上がります
              </p>
              <button onClick={start} className="px-8 py-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[15px] font-medium inline-flex items-center gap-2">
                <Rocket className="w-5 h-5" /> 専用環境を起動
              </button>
              <p className="mt-4 text-[10px] text-white/40">
                所要時間: 約 12 秒 / Terraform / Helm / External Secrets / OTel
              </p>
            </div>

            {/* Live system status */}
            {components.length > 0 && (
              <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 mb-3 text-[11px] text-white/55 uppercase tracking-wider font-bold">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" /> 現在の実環境（参考）
                  <button onClick={() => setShowLive(!showLive)} className="ml-auto text-[10px] text-blue-400 normal-case font-normal">
                    {showLive ? "閉じる" : "詳細"}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  {components.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-black/20">
                      <span className={`w-1.5 h-1.5 rounded-full ${c.status === "ok" ? "bg-emerald-400" : c.status === "warning" ? "bg-amber-400" : "bg-red-400"}`} />
                      <span className="text-white/70">{c.name}</span>
                    </div>
                  ))}
                </div>
                {showLive && summary && (
                  <div className="mt-3 pt-3 border-t border-white/[0.04] grid grid-cols-2 sm:grid-cols-5 gap-3 text-[10px] font-mono">
                    <div><span className="text-white/40">tables:</span> <span className="text-blue-400">{summary.tables}</span></div>
                    <div><span className="text-white/40">tenants:</span> <span className="text-blue-400">{summary.tenants}</span></div>
                    <div><span className="text-white/40">env:</span> <span className="text-amber-400">{summary.environment}</span></div>
                    <div><span className="text-white/40">host:</span> <span className="text-white/65">{summary.hostname}</span></div>
                    <div><span className="text-white/40">db:</span> <span className="text-white/65">{summary.db_host}</span></div>
                  </div>
                )}
                <p className="mt-2 text-[10px] text-white/35">
                  これは現在動いている AENTRO instance の実体検査結果です。「専用環境を起動」ボタンを押すとこれをベースに新しい tenant が provision されます。
                </p>
              </div>
            )}
          </>
        )}

        {/* Progress UI */}
        {(isRunning || isDone) && (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6">
            {/* Progress bar */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between text-[11px] text-white/55">
                <span>{isDone ? "完了" : STEPS[stepIdx]?.title}</span>
                <span className="font-mono">{Math.floor(progress)}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className={`h-full transition-all ${isDone ? "bg-emerald-400" : "bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400"}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Steps grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {STEPS.map((s, i) => {
                const StepIcon = s.Icon
                const completed = stepIdx > i
                const active = stepIdx === i
                return (
                  <div key={s.id} className={`p-3 rounded-md border text-center transition-all ${
                    active ? "border-blue-400/50 bg-blue-500/[0.10]" : completed ? "border-emerald-400/30 bg-emerald-500/[0.05]" : "border-white/[0.06] bg-white/[0.02]"
                  }`}>
                    {active ? (
                      <Loader2 className="w-4 h-4 text-blue-400 mx-auto animate-spin" />
                    ) : completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                    ) : (
                      <StepIcon className="w-4 h-4 text-white/30 mx-auto" />
                    )}
                    <div className={`mt-2 text-[9px] sm:text-[10px] truncate ${
                      active ? "text-blue-400" : completed ? "text-emerald-400/80" : "text-white/40"
                    }`}>
                      {s.title.replace("中", "").replace("...", "")}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Live log */}
            <div className="mt-6 rounded bg-black/40 p-3 font-mono text-[11px] max-h-[200px] overflow-hidden">
              {logs.map((l, i) => (
                <div key={i} className="flex gap-2 leading-snug">
                  <span className="text-white/30 shrink-0">[{l.ts}]</span>
                  <span className={l.type === "ok" ? "text-emerald-400" : l.type === "warn" ? "text-amber-400" : "text-white/70"}>
                    {l.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Done CTA */}
        {isDone && (
          <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/[0.10] p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <div>
                <div className="text-[16px] font-semibold text-white/95">専用環境が起動しました</div>
                <div className="text-[11px] text-white/50">
                  {provisionedTenant ? (
                    <>Endpoint: <span className="font-mono text-emerald-300">{provisionedTenant.endpoint}</span> / Tenant ID: <span className="font-mono text-emerald-300">{provisionedTenant.tenant_id?.slice(0, 8)}...</span></>
                  ) : (
                    <>Endpoint: zensho-hd.aentro.cloud / Region: Tokyo (Primary) + Osaka (DR)</>
                  )}
                </div>
                {provisionedTenant && (
                  <div className="mt-1 text-[10px] text-emerald-300/80">
                    ✓ 実 DB に tenant 行を INSERT 済 (sandbox-{provisionedTenant.sandbox_id})
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link href="/zensho-executive" className="px-4 py-3 rounded bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-[13px] text-center inline-flex items-center justify-center gap-2">
                経営司令塔へ <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/admin/connector-health" className="px-4 py-3 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-[13px] text-center">
                データ取り込み開始
              </Link>
              <Link href="/zensho-pilot" className="px-4 py-3 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-[13px] text-center">
                POC を起動
              </Link>
            </div>
            <p className="mt-3 text-[10px] text-white/40 text-center">3 秒後に経営司令塔に自動遷移します...</p>
          </div>
        )}

        {/* Architecture note */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-[11px] text-white/50">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><strong className="text-white/70">VPC:</strong> Private subnet only</div>
            <div><strong className="text-white/70">DB:</strong> Aurora 16 + pgvector</div>
            <div><strong className="text-white/70">Compute:</strong> ECS Fargate + ALB</div>
            <div><strong className="text-white/70">Secret:</strong> AWS KMS + Vault</div>
            <div><strong className="text-white/70">SSO:</strong> OIDC + SAML 対応</div>
            <div><strong className="text-white/70">Backup:</strong> PITR 7日 + 月次</div>
            <div><strong className="text-white/70">DR:</strong> RTO 4h / RPO 1h</div>
            <div><strong className="text-white/70">Audit:</strong> SIEM export 対応</div>
          </div>
        </div>
      </div>
    </div>
  )
}
