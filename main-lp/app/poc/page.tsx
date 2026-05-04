import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  Download,
  Trash2,
  Clock,
  Target,
  ClipboardCheck,
  GitMerge,
  CheckCircle2,
  Shield,
  AlertTriangle,
  FileText,
  Presentation,
  FileCode2,
  FileSpreadsheet,
  TrendingUp,
  Calendar,
  Users,
  ListChecks,
  MapPin,
  Handshake,
  CheckSquare,
} from "lucide-react"
import { Section, SectionHeader } from "@/components/section"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "8週間 POC",
  description:
    "8 週間 で経営判断材料を作る。1 ブランド・1 テーマから対照群比較で改善効果を統計的に証明。価格は一括 / 成功報酬 / ハイブリッドの 3 オプション。",
}

type Tone = "amber" | "purple" | "blue" | "emerald" | "rose"

const TONE_BG: Record<Tone, string> = {
  amber: "bg-amber-500/15 text-amber-400 border-amber-400/25",
  purple: "bg-purple-500/15 text-purple-400 border-purple-400/25",
  blue: "bg-blue-500/15 text-blue-400 border-blue-400/25",
  emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-400/25",
  rose: "bg-rose-500/15 text-rose-400 border-rose-400/25",
}

const TONE_TEXT: Record<Tone, string> = {
  amber: "text-amber-400",
  purple: "text-purple-400",
  blue: "text-blue-400",
  emerald: "text-emerald-400",
  rose: "text-rose-400",
}

const THEMES: {
  code: string
  tone: Tone
  icon: React.ReactNode
  title: string
  formats: string
  kpis: string[]
  improvement: string[]
  annual: string
  data: string[]
}[] = [
  {
    code: "ZP-01",
    tone: "amber",
    icon: <Trash2 className="w-5 h-5" />,
    title: "欠品・廃棄削減",
    formats: "はま寿司 / すき家 / その他丼物",
    kpis: ["廃棄金額", "欠品率", "粗利率"],
    improvement: ["廃棄 -3%", "欠品 -5%"],
    annual: "¥4 億 / 500 店舗",
    data: ["daily_sales", "product_sales", "inventory_snapshot"],
  },
  {
    code: "ZP-02",
    tone: "purple",
    icon: <Clock className="w-5 h-5" />,
    title: "深夜帯人員配置最適化",
    formats: "深夜営業店全般",
    kpis: ["人時売上", "残業時間", "機会損失"],
    improvement: ["人時売上 +3%", "人件費率 -2pt"],
    annual: "¥1.2 億 / 100 店舗",
    data: ["labor_actual", "hourly_sales", "shift"],
  },
  {
    code: "ZP-03",
    tone: "blue",
    icon: <Target className="w-5 h-5" />,
    title: "SV 訪問優先順位最適化",
    formats: "ファミレス / 多店舗運営",
    kpis: ["SV 訪問効果", "underperformer 数", "health score"],
    improvement: ["underperformer -30%", "health score +5"],
    annual: "¥6 億 / 500 店舗",
    data: ["sv_visit", "kpi", "store"],
  },
  {
    code: "ZP-04",
    tone: "emerald",
    icon: <ClipboardCheck className="w-5 h-5" />,
    title: "QSC/HACCP 監査統合",
    formats: "全業態",
    kpis: ["QSC スコア", "HACCP 遵守率", "是正完了率"],
    improvement: ["HACCP +5pt", "是正 +10pt"],
    annual: "¥4 千万 / 100 店舗 (リスク回避)",
    data: ["qsc_audit", "haccp_monitoring"],
  },
  {
    code: "ZP-05",
    tone: "rose",
    icon: <GitMerge className="w-5 h-5" />,
    title: "M&A ブランド可視化",
    formats: "M&A 後の PMI フェーズ",
    kpis: ["データ統合率", "KPI 統一率"],
    improvement: ["PMI 期間 -50%"],
    annual: "¥3 億 / ブランド (機会価値)",
    data: ["全データ source"],
  },
]

const TIMELINE: { week: string; title: string; body: string; owner: string; tone: Tone }[] = [
  { week: "W0", title: "キックオフ + 契約", body: "環境構築 / 関係者顔合わせ / アクセス権限付与", owner: "AENTRO CS + 顧客側", tone: "purple" },
  { week: "W1", title: "データ取り込み開始", body: "CSV または実 connector 経由でデータ受け入れ", owner: "AENTRO CS", tone: "blue" },
  { week: "W2", title: "ベースライン KPI 確定", body: "DQ レビュー / 計測点固定 / 対照群選定", owner: "AENTRO CS + 顧客側", tone: "blue" },
  { week: "W3-4", title: "介入実施 + 日次モニタリング", body: "SV mission 配布、現場フィードバック収集", owner: "顧客側 (SV) + AENTRO CS", tone: "amber" },
  { week: "W5-6", title: "効果計測 + 仮説検証", body: "DiD 中間レビュー、ノイズ要因分離", owner: "AENTRO CS", tone: "amber" },
  { week: "W7", title: "中間レポート + 経営報告", body: "改善継続 / 追加打ち手の検討", owner: "AENTRO CS + 顧客側経営層", tone: "emerald" },
  { week: "W8", title: "最終報告書 + 本契約提案", body: "ROI 確定 / 本展開ロードマップ", owner: "AENTRO CS", tone: "emerald" },
]

const DELIVERABLES: { icon: React.ReactNode; tone: Tone; title: string; format: string }[] = [
  { icon: <FileText className="w-5 h-5" />, tone: "emerald", title: "経営層向け 1 ページサマリ", format: "PDF" },
  { icon: <Presentation className="w-5 h-5" />, tone: "blue", title: "事業部長向け詳細分析", format: "PowerPoint" },
  { icon: <FileCode2 className="w-5 h-5" />, tone: "purple", title: "情シス向け技術評価", format: "Markdown + Architecture" },
  { icon: <FileSpreadsheet className="w-5 h-5" />, tone: "amber", title: "現場向けアクション一覧", format: "CSV" },
  { icon: <TrendingUp className="w-5 h-5" />, tone: "rose", title: "年間 ROI 試算 + 本展開ロードマップ", format: "Excel + PDF" },
]

const WIZARD_STEPS: { n: string; title: string; body: string; icon: React.ReactNode }[] = [
  { n: "01", title: "テーマ選択", body: "5 種の標準テーマから 1 つ選ぶ (複数選択可)", icon: <ListChecks className="w-4 h-4" /> },
  { n: "02", title: "対象店舗・期間", body: "対照群と処置群を自動推奨、期間は標準 8 週", icon: <MapPin className="w-4 h-4" /> },
  { n: "03", title: "スポンサー・連携モード", body: "経営スポンサー / read-only or write-back を選択", icon: <Handshake className="w-4 h-4" /> },
  { n: "04", title: "確認 → POC 起動", body: "費用 / スケジュール / 成果物を最終確認", icon: <CheckSquare className="w-4 h-4" /> },
]

export default function PocPage() {
  return (
    <>
      {/* ====================== HERO ====================== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero pointer-events-none" />
        <div className="container-x relative pt-20 lg:pt-28 pb-16 lg:pb-20">
          <div className="max-w-4xl">
            <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.18em] uppercase text-blue-400 font-bold px-3 py-1 rounded-full border border-blue-400/20 bg-blue-500/[0.06]">
              <Calendar className="w-3.5 h-3.5" />
              8-WEEK POC
            </span>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white/95 leading-[1.1]">
              8 週間で<span className="gradient-text">経営判断材料</span>を作る。
            </h1>
            <p className="mt-6 text-lg text-white/65 max-w-3xl leading-relaxed">
              1 ブランド・1 テーマから、対照群比較で改善効果を統計的に証明します。
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <a
                href="#"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-[14px] font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                POC 提案書 (PDF) ダウンロード
              </a>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md border border-white/15 hover:border-white/30 hover:bg-white/[0.04] text-white/90 text-[14px] font-medium transition-colors"
              >
                デモ + テーマ選定の打ち合わせ
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ====================== SECTION 1 — 5 themes ====================== */}
      <Section>
        <SectionHeader
          eyebrow="5 STANDARD THEMES"
          title="POC テーマを選ぶ"
          description="選択は POC キックオフで確定。複数テーマの組み合わせも可能。"
        />

        <div className="grid lg:grid-cols-2 gap-5">
          {THEMES.slice(0, 4).map((t) => (
            <ThemeCard key={t.code} theme={t} />
          ))}
        </div>
        <div className="mt-5 grid lg:grid-cols-2 gap-5">
          <div className="hidden lg:block" />
          <ThemeCard theme={THEMES[4]} />
        </div>
        <div className="mt-5 lg:hidden">
          <ThemeCard theme={THEMES[4]} />
        </div>
      </Section>

      {/* ====================== SECTION 2 — Timeline ====================== */}
      <Section>
        <SectionHeader eyebrow="TIMELINE" title="8 週間の流れ" />

        <div className="relative max-w-4xl">
          {/* vertical line */}
          <div className="absolute left-[14px] top-2 bottom-2 w-px bg-gradient-to-b from-purple-400/40 via-blue-400/40 to-emerald-400/40" />

          <div className="space-y-4">
            {TIMELINE.map((t) => (
              <div key={t.week} className="relative pl-12">
                {/* dot */}
                <div
                  className={cn(
                    "absolute left-0 top-3 w-7 h-7 rounded-full border-2 bg-bg-primary flex items-center justify-center",
                    TONE_BG[t.tone]
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full", TONE_BG[t.tone].split(" ")[0])} />
                </div>

                <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-5">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-mono font-bold",
                        TONE_BG[t.tone]
                      )}
                    >
                      {t.week}
                    </span>
                    <h4 className="text-[15px] font-bold text-white/95">{t.title}</h4>
                  </div>
                  <p className="text-[13px] text-white/60 leading-relaxed">{t.body}</p>
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-white/40">
                    <Users className="w-3 h-3" />
                    主担当: {t.owner}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ====================== SECTION 3 — Pricing ====================== */}
      <Section>
        <SectionHeader eyebrow="PRICING" title="価格オプション" />

        <div className="grid md:grid-cols-3 gap-5">
          <PriceCard
            tag="一括"
            recommended
            price="¥4,000,000"
            unit="/ POC"
            features={[
              "全機能利用可",
              "8 週間サポート込",
              "POC 中いつでも中止可",
              "残期間返金なし",
            ]}
          />
          <PriceCard
            tag="成功報酬"
            price="¥0"
            unit="+ 改善額の 20%"
            features={[
              "統計的有意 (p<0.05) のみ請求",
              "上限 ¥10,000,000",
              "改善が出なければ無料",
              "効果検証は AENTRO 側負担",
            ]}
          />
          <PriceCard
            tag="ハイブリッド"
            popular
            price="¥2,000,000"
            unit="+ 改善額の 10%"
            features={[
              "リスク分散型",
              "最も人気",
              "前金 + 成果連動の中間",
              "p<0.05 で成果報酬発生",
            ]}
          />
        </div>
      </Section>

      {/* ====================== SECTION 4 — Deliverables ====================== */}
      <Section>
        <SectionHeader eyebrow="DELIVERABLES" title="8 週後にお渡しするもの" />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DELIVERABLES.map((d) => (
            <div
              key={d.title}
              className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-6 flex flex-col"
            >
              <div className={cn("w-10 h-10 rounded-lg border flex items-center justify-center mb-4", TONE_BG[d.tone])}>
                {d.icon}
              </div>
              <h4 className="text-[15px] font-bold text-white/95 leading-snug">{d.title}</h4>
              <div className="mt-3 pt-3 border-t border-white/[0.05] text-[11px] text-white/40 font-mono uppercase tracking-[0.14em]">
                {d.format}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ====================== SECTION 5 — Risk ====================== */}
      <Section>
        <SectionHeader eyebrow="RISK + GUARANTEE" title="POC のリスクと保証" />

        <div className="grid md:grid-cols-2 gap-5">
          <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-7">
            <div className="flex items-center gap-2 mb-5">
              <div className={cn("w-10 h-10 rounded-lg border flex items-center justify-center", TONE_BG.amber)}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-[16px] font-bold text-white/95">顧客側のリスク</h3>
            </div>
            <ul className="space-y-3">
              {[
                "POS への書き戻しは初期は無効、希望時のみ承認制",
                "データ移動は顧客環境内で完結",
                "既存システム改修は不要",
              ].map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-[13px] text-white/70 leading-relaxed">
                  <span className="shrink-0 mt-1.5 w-1 h-1 rounded-full bg-amber-400" />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-emerald-400/20 bg-emerald-500/[0.04] rounded-xl p-7">
            <div className="flex items-center gap-2 mb-5">
              <div className={cn("w-10 h-10 rounded-lg border flex items-center justify-center", TONE_BG.emerald)}>
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-[16px] font-bold text-white/95">AENTRO 側の保証</h3>
            </div>
            <ul className="space-y-3">
              {[
                "W4 時点で「データ取り込み不能」と判明した場合: 全額返金",
                "統計的有意な改善が出ない場合: 原因仮説と次の打ち手を提示",
                "過去 5 社で本契約転換率 100%",
              ].map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-[13px] text-white/80 leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* ====================== SECTION 6 — Wizard preview ====================== */}
      <Section>
        <SectionHeader eyebrow="HOW TO START" title="POC 起動は 4 ステップ" />

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {WIZARD_STEPS.map((s, i) => (
            <div
              key={s.n}
              className="relative border border-white/[0.06] bg-white/[0.02] rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-[11px] tracking-[0.16em] text-blue-400 font-bold">
                  STEP {s.n}
                </span>
                <div className={cn("w-8 h-8 rounded-md border flex items-center justify-center", TONE_BG.blue)}>
                  {s.icon}
                </div>
              </div>
              <h4 className="text-[14px] font-bold text-white/95 mb-2 leading-snug">{s.title}</h4>
              <p className="text-[12px] text-white/55 leading-relaxed">{s.body}</p>

              {i < WIZARD_STEPS.length - 1 && (
                <div className="hidden lg:flex absolute right-[-10px] top-1/2 -translate-y-1/2 z-10 w-5 h-5 rounded-full bg-bg-primary border border-white/[0.08] items-center justify-center">
                  <ArrowRight className="w-3 h-3 text-white/40" />
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-[13px] text-white/45">
          実プロダクトでこの Wizard を試したい場合は{" "}
          <Link href="/demo" className="text-blue-400 hover:text-blue-300 transition-colors">
            デモ
          </Link>{" "}
          にて
        </p>
      </Section>

      {/* ====================== SECTION 7 — Final CTA ====================== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero pointer-events-none" />
        <div className="container-x relative py-24 lg:py-32 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-white/95 leading-tight max-w-4xl mx-auto">
            <span className="gradient-text">8 週間</span>で、<br className="hidden sm:block" />
            判断に必要な数字を作りませんか
          </h2>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="#"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-[14px] font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              POC 提案書 (PDF) ダウンロード
            </a>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-md border border-white/15 hover:border-white/30 hover:bg-white/[0.04] text-white/95 text-[14px] font-medium transition-colors"
            >
              デモ + テーマ選定の打ち合わせ依頼
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

/* ====================== sub components ====================== */

function ThemeCard({ theme: t }: { theme: (typeof THEMES)[number] }) {
  return (
    <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-6 lg:p-7 flex flex-col h-full">
      {/* header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("w-11 h-11 rounded-lg border flex items-center justify-center shrink-0", TONE_BG[t.tone])}>
            {t.icon}
          </div>
          <div className="min-w-0">
            <div className={cn("font-mono text-[11px] tracking-[0.18em] font-bold", TONE_TEXT[t.tone])}>
              {t.code}
            </div>
            <h3 className="text-[18px] font-bold text-white/95 leading-snug truncate">{t.title}</h3>
          </div>
        </div>
      </div>

      {/* formats */}
      <div className="text-[12px] text-white/55 leading-relaxed mb-4">
        <span className="text-white/35">業態例:</span> {t.formats}
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        {/* KPIs */}
        <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3.5">
          <div className={cn("text-[10px] tracking-[0.14em] uppercase font-bold mb-2", TONE_TEXT[t.tone])}>
            主要 KPI
          </div>
          <ul className="space-y-1">
            {t.kpis.map((k) => (
              <li key={k} className="flex items-center gap-2 text-[12px] text-white/70">
                <span className={cn("w-1 h-1 rounded-full shrink-0", TONE_BG[t.tone].split(" ")[0])} />
                {k}
              </li>
            ))}
          </ul>
        </div>

        {/* Improvement */}
        <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3.5">
          <div className={cn("text-[10px] tracking-[0.14em] uppercase font-bold mb-2", TONE_TEXT[t.tone])}>
            想定改善
          </div>
          <ul className="space-y-1">
            {t.improvement.map((i) => (
              <li key={i} className="flex items-center gap-2 text-[12px] text-white/70">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                {i}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* annual impact */}
      <div className="rounded-lg border border-emerald-400/15 bg-emerald-500/[0.04] p-3.5 mb-4">
        <div className="text-[10px] tracking-[0.14em] uppercase text-emerald-400 font-bold mb-1">
          期待年間効果
        </div>
        <div className="font-mono text-[16px] font-bold text-white/95">{t.annual}</div>
      </div>

      {/* required data */}
      <div className="mt-auto pt-4 border-t border-white/[0.05]">
        <div className="text-[10px] tracking-[0.14em] uppercase text-white/35 font-bold mb-2">
          必要データ
        </div>
        <div className="flex flex-wrap gap-1.5">
          {t.data.map((d) => (
            <span
              key={d}
              className="px-2 py-0.5 rounded border border-white/10 bg-white/[0.025] text-[11px] text-white/55 font-mono"
            >
              {d}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function PriceCard({
  tag,
  price,
  unit,
  features,
  recommended,
  popular,
}: {
  tag: string
  price: string
  unit: string
  features: string[]
  recommended?: boolean
  popular?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-7 flex flex-col h-full relative",
        recommended
          ? "border-emerald-400/30 bg-emerald-500/[0.04]"
          : "border-white/[0.06] bg-white/[0.02]"
      )}
    >
      {(recommended || popular) && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          <span
            className={cn(
              "text-[10px] tracking-[0.16em] uppercase font-bold border rounded-full px-2.5 py-0.5",
              recommended
                ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-400"
                : "border-blue-400/30 bg-blue-500/15 text-blue-400"
            )}
          >
            {recommended ? "推奨" : "人気"}
          </span>
        </div>
      )}

      <div className="text-[12px] tracking-[0.16em] uppercase font-bold text-white/55 mb-4">
        {tag}
      </div>

      <div className="mb-5">
        <div className="font-mono text-3xl lg:text-4xl font-bold text-white/95 leading-none tracking-tight">
          {price}
        </div>
        <div className="text-[12px] text-white/45 mt-2">{unit}</div>
      </div>

      <ul className="space-y-2.5 mt-auto">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[13px] text-white/70 leading-relaxed">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
