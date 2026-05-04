import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  Download,
  Shield,
  ShieldCheck,
  Database,
  Clock,
  CheckCircle2,
  Lock,
  KeyRound,
  Server,
  Cloud,
  Network,
  FileText,
  Eye,
  HardDrive,
} from "lucide-react"
import { Section, SectionHeader } from "@/components/section"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Enterprise Security",
  description:
    "上場大企業基準のセキュリティを初日から。SSO / MFA / 監査ログ / KMS / dedicated VPC など情シス審査の標準項目を満たす設計。Security Review Pack を即時ダウンロード可能。",
}

type Status = "ok" | "wip" | "na"

const COMPLIANCE: { item: string; status: Status; detail: string }[] = [
  { item: "マルチテナント分離", status: "ok", detail: "tenant_id row-level、行レベル ACL" },
  { item: "SSO (OIDC + SAML)", status: "ok", detail: "Azure AD / Okta 対応" },
  { item: "MFA (TOTP + WebAuthn)", status: "ok", detail: "FIDO2 対応" },
  { item: "列マスキング (PII)", status: "ok", detail: "Column policy + 行 ACL" },
  { item: "監査ログ", status: "ok", detail: "全 API request、SIEM export" },
  { item: "暗号化 (at rest / transit)", status: "ok", detail: "KMS / Fernet / TLS 1.2+" },
  { item: "dedicated VPC", status: "ok", detail: "オプション" },
  { item: "バックアップ / DR", status: "ok", detail: "PITR 7日 / 月次 / cross-region" },
  { item: "GDPR / APPI 対応", status: "ok", detail: "" },
  { item: "SOC2 Type II", status: "wip", detail: "進行中 (Q3 2026 取得目標)" },
  { item: "ISO 27001", status: "wip", detail: "進行中" },
  { item: "FedRAMP", status: "na", detail: "該当なし (国内専用)" },
]

const REVIEW_PACK_SECTIONS: { title: string; body: string }[] = [
  { title: "ネットワーク構成", body: "VPC / Subnet / Security Group / NAT 構成図 + データフロー" },
  { title: "認証・認可フロー", body: "SSO (OIDC / SAML) / MFA / RBAC / role-tool matrix" },
  { title: "データ取扱・保持・破棄", body: "収集対象 / 保持期間 / 顧客解約後の削除手順" },
  { title: "監査ログ仕様", body: "actor / action / target / before-after の全フィールド一覧" },
  { title: "暗号化方式", body: "at rest (KMS) / in transit (TLS 1.2+) / key rotation 周期" },
  { title: "バックアップ・DR・RTO/RPO", body: "PITR 7日 / 月次 30日 / cross-region / RTO 4h / RPO 15min" },
  { title: "インシデント対応プロセス", body: "検知 → トリアージ → 顧客通知 SLA → 復旧 → 事後報告" },
  { title: "LLM 利用ポリシー", body: "Anthropic Enterprise zero-retention / PII redaction / 監査ログ" },
]

export default function SecurityPage() {
  return (
    <>
      {/* ====================== HERO ====================== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero pointer-events-none" />
        <div className="container-x relative pt-20 lg:pt-28 pb-16 lg:pb-20">
          <div className="max-w-4xl">
            <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.18em] uppercase text-blue-400 font-bold px-3 py-1 rounded-full border border-blue-400/20 bg-blue-500/[0.06]">
              <ShieldCheck className="w-3.5 h-3.5" />
              ENTERPRISE SECURITY
            </span>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white/95 leading-[1.1]">
              上場大企業基準のセキュリティを、<span className="gradient-text">初日から。</span>
            </h1>
            <p className="mt-6 text-lg text-white/65 max-w-3xl leading-relaxed">
              情シス審査の標準項目をすべて満たす設計。1 ページで Security Review Pack をダウンロードできます。
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <Link
                href="#review-pack"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-[14px] font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Security Review Pack をダウンロード
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md border border-white/15 hover:border-white/30 hover:bg-white/[0.04] text-white/90 text-[14px] font-medium transition-colors"
              >
                情シス向けデモを依頼
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ====================== SECTION 1 — Compliance Status ====================== */}
      <Section>
        <SectionHeader eyebrow="STATUS" title="対応状況一覧" />

        {/* Desktop table */}
        <div className="hidden md:block rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-white/[0.025] border-b border-white/[0.06]">
              <tr>
                <th className="px-5 py-3 text-[11px] tracking-[0.16em] uppercase text-white/45 font-bold w-[34%]">項目</th>
                <th className="px-5 py-3 text-[11px] tracking-[0.16em] uppercase text-white/45 font-bold w-[14%]">対応状況</th>
                <th className="px-5 py-3 text-[11px] tracking-[0.16em] uppercase text-white/45 font-bold">詳細</th>
              </tr>
            </thead>
            <tbody>
              {COMPLIANCE.map((row, i) => (
                <tr
                  key={row.item}
                  className={cn(
                    "border-b border-white/[0.04] last:border-b-0",
                    i % 2 === 1 && "bg-white/[0.012]"
                  )}
                >
                  <td className="px-5 py-3.5 text-[14px] text-white/85">{row.item}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-white/60">{row.detail || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {COMPLIANCE.map((row) => (
            <div
              key={row.item}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-[14px] text-white/90 font-medium">{row.item}</span>
                <StatusBadge status={row.status} />
              </div>
              {row.detail && <p className="text-[12px] text-white/55 leading-relaxed">{row.detail}</p>}
            </div>
          ))}
        </div>
      </Section>

      {/* ====================== SECTION 2 — Architecture ====================== */}
      <Section>
        <SectionHeader eyebrow="ARCHITECTURE" title="ネットワーク・データフロー構成" />

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 lg:p-8">
          {/* Architecture diagram */}
          <div className="space-y-3">
            <ArchNode icon={<Eye className="w-4 h-4" />} tone="white" label="訪問者 / Browser" sub="HTTPS only" />
            <ArchArrow />
            <ArchNode icon={<Cloud className="w-4 h-4" />} tone="blue" label="CloudFront (CDN + WAF)" sub="TLS 1.2+ / DDoS 緩和" />
            <ArchArrow />
            <ArchNode icon={<Network className="w-4 h-4" />} tone="blue" label="ALB (Application Load Balancer)" sub="VPC isolated, public subnet" />
            <ArchArrow />
            <ArchNode icon={<Server className="w-4 h-4" />} tone="purple" label="ECS Fargate (App + API)" sub="Private subnet / IAM Role 認証" />

            {/* ECS branches: outbound resources */}
            <div className="grid sm:grid-cols-3 gap-2 pt-2">
              <ArchSideNode icon={<KeyRound className="w-3.5 h-3.5" />} tone="amber" label="Secrets Manager" sub="API Key / DB credentials" />
              <ArchSideNode icon={<Lock className="w-3.5 h-3.5" />} tone="amber" label="KMS (CMK)" sub="Customer-managed key option" />
              <ArchSideNode icon={<FileText className="w-3.5 h-3.5" />} tone="emerald" label="Cloud Logging" sub="audit log → SIEM export" />
            </div>

            <ArchArrow />
            <ArchNode
              icon={<Database className="w-4 h-4" />}
              tone="emerald"
              label="Aurora PostgreSQL (Multi-AZ)"
              sub="Tokyo (primary) + Osaka (cross-region replica) / encrypted at rest"
            />
          </div>

          {/* Network notes */}
          <div className="grid md:grid-cols-3 gap-3 mt-8">
            <NoteBox icon={<Network className="w-3.5 h-3.5" />} label="VPC isolated" body="NAT Gateway 経由のみ egress、private subnet で DB / App を保護" />
            <NoteBox icon={<Lock className="w-3.5 h-3.5" />} label="Customer-managed KMS" body="顧客側で key rotation 制御可、削除時は cryptographic erasure" />
            <NoteBox icon={<Shield className="w-3.5 h-3.5" />} label="Private Link option" body="dedicated VPC + Private Link で完全分離も可能" />
          </div>

          <p className="mt-6 text-[13px] text-white/55 leading-relaxed">
            全データは顧客環境内で完結。dedicated VPC オプションで完全分離も可能。
          </p>
        </div>
      </Section>

      {/* ====================== SECTION 3 — Data Handling ====================== */}
      <Section>
        <SectionHeader eyebrow="DATA HANDLING" title="データ取扱" />

        <div className="grid md:grid-cols-3 gap-5">
          <DataCard
            icon={<Database className="w-5 h-5" />}
            tone="blue"
            title="収集する情報"
            items={[
              "POS 売上 / 在庫 / 商品マスタ",
              "勤怠実績 / シフト / 残業",
              "物流 / 配送遅延 (オプション)",
              "レビュー / 監査記録 (オプション)",
            ]}
            note="個人情報は最小限、自動 redaction"
          />
          <DataCard
            icon={<Clock className="w-5 h-5" />}
            tone="amber"
            title="保持期間"
            items={[
              "運用データ: 契約期間 + 1 年",
              "監査ログ: 5 年",
              "AI session: 2 年（PII redacted 後）",
              "バックアップ: PITR 7日 + 月次 30日",
            ]}
          />
          <DataCard
            icon={<Shield className="w-5 h-5" />}
            tone="emerald"
            title="第三者開示"
            items={[
              "法令 / 裁判所命令時のみ",
              "顧客通知あり（事前同意取得）",
              "LLM API は zero-retention 契約済",
            ]}
          />
        </div>
      </Section>

      {/* ====================== SECTION 4 — LLM Policy ====================== */}
      <Section>
        <SectionHeader eyebrow="AI POLICY" title="AI / LLM 利用ポリシー" />

        <div className="max-w-4xl">
          <p className="text-[15px] text-white/70 leading-relaxed mb-8">
            AENTRO は Anthropic Enterprise tier との直接契約により、顧客データを LLM の学習や永続化に使用しません。
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <RuleCard
              n="01"
              title="データ非永続化"
              body="Anthropic 側でのデータ保持なし (zero retention)。プロンプトとレスポンスは推論完了後に消去される。"
            />
            <RuleCard
              n="02"
              title="PII 自動 redaction"
              body="氏名 / 電話 / メール / 住所 / 社員 ID を送信前に自動マスク。redaction 結果は AIQueryLog に記録。"
            />
            <RuleCard
              n="03"
              title="役割別 tool 制御"
              body="role × AI tool の権限 matrix で min-priv。SV は read-only tool のみ、CFO は財務 tool 解放。"
            />
            <RuleCard
              n="04"
              title="全 prompt + response 監査"
              body="全 LLM 呼出が AIQueryLog に保存され、SIEM に export 可能。事後の説明責任を担保。"
            />
          </div>
        </div>
      </Section>

      {/* ====================== SECTION 5 — Review Pack ====================== */}
      <Section id="review-pack">
        <SectionHeader
          eyebrow="DOCUMENT"
          title="Security Review Pack に含まれるもの (60ページ)"
          description="情シス審査で頻出する 8 セクションをまとめた PDF。質問事項チェックリストにそのまま添付できます。"
        />

        <div className="grid md:grid-cols-2 gap-3">
          {REVIEW_PACK_SECTIONS.map((s, i) => (
            <div
              key={s.title}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 flex items-start gap-4"
            >
              <span className="font-mono text-[13px] text-blue-400 font-bold shrink-0 mt-0.5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <div className="text-[14px] font-bold text-white/95 leading-snug">{s.title}</div>
                <div className="text-[12px] text-white/55 mt-1 leading-relaxed">{s.body}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <a
            href="#"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-[14px] font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Security Review Pack をダウンロード (PDF, 60ページ)
          </a>
        </div>
      </Section>

      {/* ====================== SECTION 6 — Final CTA ====================== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero pointer-events-none" />
        <div className="container-x relative py-24 lg:py-32 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-white/95 leading-tight max-w-4xl mx-auto">
            情シス審査をスムーズに通すための資料を、<br className="hidden sm:block" />
            <span className="gradient-text">即時ダウンロード可能</span>です
          </h2>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="#"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-[14px] font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Security Review Pack ダウンロード
            </a>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-md border border-white/15 hover:border-white/30 hover:bg-white/[0.04] text-white/95 text-[14px] font-medium transition-colors"
            >
              情シス向けデモを依頼
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

/* ====================== sub components ====================== */

function StatusBadge({ status }: { status: Status }) {
  if (status === "ok") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-emerald-400/25 bg-emerald-500/[0.08] text-emerald-400 text-[12px] font-mono font-bold">
        <CheckCircle2 className="w-3.5 h-3.5" />
        対応済
      </span>
    )
  }
  if (status === "wip") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-amber-400/25 bg-amber-500/[0.08] text-amber-400 text-[12px] font-mono font-bold">
        <Clock className="w-3.5 h-3.5" />
        進行中
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-white/10 bg-white/[0.03] text-white/30 text-[12px] font-mono font-bold">
      —
    </span>
  )
}

const ARCH_TONE: Record<"white" | "blue" | "purple" | "amber" | "emerald", string> = {
  white: "border-white/15 bg-white/[0.04] text-white/85",
  blue: "border-blue-400/25 bg-blue-500/[0.08] text-blue-400",
  purple: "border-purple-400/25 bg-purple-500/[0.08] text-purple-400",
  amber: "border-amber-400/25 bg-amber-500/[0.08] text-amber-400",
  emerald: "border-emerald-400/25 bg-emerald-500/[0.08] text-emerald-400",
}

function ArchNode({
  icon,
  tone,
  label,
  sub,
}: {
  icon: React.ReactNode
  tone: "white" | "blue" | "purple" | "amber" | "emerald"
  label: string
  sub: string
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 flex items-center gap-3">
      <div className={cn("w-9 h-9 rounded-md border flex items-center justify-center shrink-0", ARCH_TONE[tone])}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[14px] font-bold text-white/95 leading-tight">{label}</div>
        <div className="text-[12px] text-white/50 mt-0.5 leading-relaxed">{sub}</div>
      </div>
    </div>
  )
}

function ArchSideNode({
  icon,
  tone,
  label,
  sub,
}: {
  icon: React.ReactNode
  tone: "white" | "blue" | "purple" | "amber" | "emerald"
  label: string
  sub: string
}) {
  return (
    <div className="rounded-lg border border-white/[0.05] bg-white/[0.015] px-3 py-2.5 flex items-start gap-2">
      <div className={cn("w-7 h-7 rounded-md border flex items-center justify-center shrink-0", ARCH_TONE[tone])}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[12px] font-bold text-white/90 leading-tight">{label}</div>
        <div className="text-[11px] text-white/45 mt-0.5 leading-snug">{sub}</div>
      </div>
    </div>
  )
}

function ArchArrow() {
  return (
    <div className="flex justify-center">
      <div className="w-px h-5 bg-gradient-to-b from-white/20 to-white/5" />
    </div>
  )
}

function NoteBox({ icon, label, body }: { icon: React.ReactNode; label: string; body: string }) {
  return (
    <div className="rounded-lg border border-white/[0.05] bg-white/[0.015] p-4">
      <div className="flex items-center gap-1.5 text-[11px] tracking-[0.14em] uppercase text-white/55 font-bold mb-1.5">
        {icon}
        {label}
      </div>
      <p className="text-[12px] text-white/60 leading-relaxed">{body}</p>
    </div>
  )
}

function DataCard({
  icon,
  tone,
  title,
  items,
  note,
}: {
  icon: React.ReactNode
  tone: "blue" | "amber" | "emerald"
  title: string
  items: string[]
  note?: string
}) {
  const toneCls = {
    blue: "bg-blue-500/15 text-blue-400 border-blue-400/25",
    amber: "bg-amber-500/15 text-amber-400 border-amber-400/25",
    emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-400/25",
  }[tone]
  return (
    <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-6 lg:p-7 h-full flex flex-col">
      <div className={cn("w-10 h-10 rounded-lg border flex items-center justify-center mb-5", toneCls)}>{icon}</div>
      <h3 className="text-[17px] font-bold text-white/95 mb-4">{title}</h3>
      <ul className="space-y-2 flex-1">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-2.5 text-[13px] text-white/70 leading-relaxed">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
      {note && (
        <div className="mt-5 pt-4 border-t border-white/[0.05] text-[11px] text-white/45 flex items-start gap-1.5">
          <HardDrive className="w-3 h-3 mt-0.5 shrink-0" />
          ※ {note}
        </div>
      )}
    </div>
  )
}

function RuleCard({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-5 lg:p-6 flex items-start gap-4">
      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-mono text-[10px] tracking-[0.16em] text-white/35 font-bold">RULE {n}</span>
        </div>
        <h4 className="text-[15px] font-bold text-white/95 leading-snug">{title}</h4>
        <p className="text-[13px] text-white/65 mt-2 leading-relaxed">{body}</p>
      </div>
    </div>
  )
}
