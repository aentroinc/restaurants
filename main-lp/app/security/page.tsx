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
    "上場企業の情シス審査を通せる安全性を初日から。シングルサインオン / 2 段階認証 / 操作ログ / 暗号鍵管理 / 専用クラウドなど、情シスが確認する項目をすべて最初から準備。情シス向け資料を即時ダウンロード可能。",
}

type Status = "ok" | "wip" | "na"

const COMPLIANCE: { item: string; status: Status; detail: string }[] = [
  { item: "会社ごとに完全に分離", status: "ok", detail: "他社のデータは見えません" },
  { item: "シングルサインオン", status: "ok", detail: "Azure AD / Okta などに対応" },
  { item: "2 段階認証", status: "ok", detail: "ワンタイムパスワード + 指紋・顔認証" },
  { item: "個人情報の自動マスキング", status: "ok", detail: "個人情報を見られる人を制限" },
  { item: "操作ログ", status: "ok", detail: "誰がいつ何を見たか全て記録、社内システムに送信可" },
  { item: "データ保管・通信ともに暗号化", status: "ok", detail: "暗号鍵管理サービス / TLS（通信の暗号化）" },
  { item: "専用クラウド環境", status: "ok", detail: "オプション" },
  { item: "バックアップと災害対策", status: "ok", detail: "任意の時点に戻せる / 月次 / 別のデータセンターにもコピー" },
  { item: "GDPR / APPI（個人情報保護の法律）対応", status: "ok", detail: "" },
  { item: "SOC2 Type II（情報セキュリティの国際基準）", status: "wip", detail: "進行中（2026 年 7-9 月 取得目標）" },
  { item: "ISO 27001（情報セキュリティの国際基準）", status: "wip", detail: "進行中" },
  { item: "FedRAMP", status: "na", detail: "該当なし（国内専用）" },
]

const REVIEW_PACK_SECTIONS: { title: string; body: string }[] = [
  { title: "ネットワーク構成", body: "クラウド構成図 + データの流れ" },
  { title: "認証・権限の流れ", body: "シングルサインオン / 2 段階認証 / 役割別アクセス" },
  { title: "データの取扱・保管・破棄", body: "収集対象 / 保持期間 / 解約後の削除手順" },
  { title: "操作ログの記録項目", body: "誰が / 何を / どの対象に / 変更前後 の全項目一覧" },
  { title: "暗号化の方式（鍵の管理含む）", body: "保管時（暗号鍵管理サービス）/ 通信時（TLS）/ 鍵の更新周期" },
  { title: "バックアップと災害対策", body: "過去 7 日は任意の時点に戻せる / 月次 30 日 / 別拠点コピー / 復旧時間 4h / 復旧地点 15 分" },
  { title: "障害発生時の対応プロセス", body: "検知 → 切り分け → 顧客通知の期限 → 復旧 → 事後報告" },
  { title: "AI 利用ポリシー", body: "Anthropic 社にデータを残さない契約 / 個人情報の自動マスキング / 操作ログ" },
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
              上場企業の情シス審査を通せる安全性を、<span className="gradient-text">初日から。</span>
            </h1>
            <p className="mt-6 text-lg text-white/65 max-w-3xl leading-relaxed">
              情シス・監査チームが確認する項目を、すべて最初から準備しています。1 ページで情シス向け資料をダウンロードできます。
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <Link
                href="#review-pack"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-[14px] font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                情シス向け資料をダウンロード
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
        <SectionHeader eyebrow="ARCHITECTURE" title="ネットワーク・データの流れ" />

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 lg:p-8">
          {/* Architecture diagram */}
          <div className="space-y-3">
            <ArchNode icon={<Eye className="w-4 h-4" />} tone="white" label="訪問者 / ブラウザ" sub="HTTPS のみ" />
            <ArchArrow />
            <ArchNode icon={<Cloud className="w-4 h-4" />} tone="blue" label="CloudFront（CDN + WAF）" sub="TLS（通信の暗号化）/ DDoS 緩和" />
            <ArchArrow />
            <ArchNode icon={<Network className="w-4 h-4" />} tone="blue" label="ALB（ロードバランサー）" sub="専用クラウド、外部公開ゾーン" />
            <ArchArrow />
            <ArchNode icon={<Server className="w-4 h-4" />} tone="purple" label="ECS Fargate（アプリ + API）" sub="非公開ゾーン / IAM ロール認証" />

            {/* ECS branches: outbound resources */}
            <div className="grid sm:grid-cols-3 gap-2 pt-2">
              <ArchSideNode icon={<KeyRound className="w-3.5 h-3.5" />} tone="amber" label="Secrets Manager" sub="API キー / DB 認証情報" />
              <ArchSideNode icon={<Lock className="w-3.5 h-3.5" />} tone="amber" label="暗号鍵管理サービス" sub="貴社管理の鍵にも対応可" />
              <ArchSideNode icon={<FileText className="w-3.5 h-3.5" />} tone="emerald" label="クラウドログ" sub="操作ログ → 社内システムに送信" />
            </div>

            <ArchArrow />
            <ArchNode
              icon={<Database className="w-4 h-4" />}
              tone="emerald"
              label="Aurora PostgreSQL（複数拠点コピー）"
              sub="東京（本番）+ 大阪（別のデータセンターにもコピー）/ 保管時暗号化"
            />
          </div>

          {/* Network notes */}
          <div className="grid md:grid-cols-3 gap-3 mt-8">
            <NoteBox icon={<Network className="w-3.5 h-3.5" />} label="専用クラウド" body="外部通信は NAT 経由のみ、DB / アプリは非公開ゾーンで保護" />
            <NoteBox icon={<Lock className="w-3.5 h-3.5" />} label="貴社管理の暗号鍵" body="貴社側で鍵の更新を制御可、削除時は鍵ごと破棄" />
            <NoteBox icon={<Shield className="w-3.5 h-3.5" />} label="完全分離オプション" body="専用クラウド + Private Link で完全分離も可能" />
          </div>

          <p className="mt-6 text-[13px] text-white/55 leading-relaxed">
            データはすべて貴社の環境内にとどまります。専用クラウドオプションで完全分離も可能です。
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
              "物流 / 配送遅延（オプション）",
              "レビュー / 監査記録（オプション）",
            ]}
            note="個人情報は最小限、自動マスキング"
          />
          <DataCard
            icon={<Clock className="w-5 h-5" />}
            tone="amber"
            title="保持期間"
            items={[
              "運用データ: 契約期間 + 1 年",
              "操作ログ: 5 年",
              "AI 利用履歴: 2 年（個人情報マスキング後）",
              "バックアップ: 過去 7 日は任意の時点に戻せる、月次バックアップは 30 日保管",
            ]}
          />
          <DataCard
            icon={<Shield className="w-5 h-5" />}
            tone="emerald"
            title="第三者開示"
            items={[
              "法令 / 裁判所命令時のみ",
              "顧客通知あり（事前同意取得）",
              "AI（Anthropic 社）にデータを残さない契約済み",
            ]}
          />
        </div>
      </Section>

      {/* ====================== SECTION 4 — LLM Policy ====================== */}
      <Section>
        <SectionHeader eyebrow="AI POLICY" title="AI 利用ポリシー" />

        <div className="max-w-4xl">
          <p className="text-[15px] text-white/70 leading-relaxed mb-8">
            AI 提供元の Anthropic 社と直接契約し、貴社のデータを AI の学習や永続保存に使わない契約をしています。
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <RuleCard
              n="01"
              title="Anthropic 側にデータを残さない"
              body="Anthropic 側でのデータ保持なし。質問内容と回答は処理が終わると消去されます。"
            />
            <RuleCard
              n="02"
              title="個人情報を AI に渡す前に自動マスク"
              body="氏名 / 電話 / メール / 住所 / 社員 ID を送信前に自動マスク。マスキング結果は AI 利用履歴に記録。"
            />
            <RuleCard
              n="03"
              title="役職ごとに AI で見られる範囲を制限"
              body="役職 × AI 機能の権限表で最小権限。SV は閲覧のみ、CFO は財務機能まで開放、といった制御。"
            />
            <RuleCard
              n="04"
              title="AI への質問と回答を全て記録"
              body="すべての AI 利用が AI 利用履歴に保存され、監査ログを社内システムに送信できます。事後の説明責任を担保します。"
            />
          </div>
        </div>
      </Section>

      {/* ====================== SECTION 5 — Review Pack ====================== */}
      <Section id="review-pack">
        <SectionHeader
          eyebrow="DOCUMENT"
          title="情シス向け資料に含まれるもの（60 ページ）"
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
            情シス向け資料（60 ページ PDF）をダウンロード
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
              情シス向け資料をダウンロード
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
