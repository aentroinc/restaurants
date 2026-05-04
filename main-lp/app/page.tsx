"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Brain,
  Repeat,
  Zap,
  FlaskConical,
  Sparkles,
  Smartphone,
  Building2,
  Database,
  Banknote,
  Network,
  CheckCircle2,
  Shield,
  Download,
  PlayCircle,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChevronRight,
  XCircle,
  Check,
  ArrowUpRight,
} from "lucide-react"
import { Section, SectionHeader } from "@/components/section"
import { cn } from "@/lib/utils"

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

export default function HomePage() {
  return (
    <>
      {/* ====================== 1. HERO ====================== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero pointer-events-none" />
        <div className="container-x relative pt-16 lg:pt-24 pb-20 lg:pb-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* LEFT */}
            <motion.div variants={stagger} initial="hidden" animate="show">
              <motion.div variants={fadeUp}>
                <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.16em] uppercase text-blue-400 font-bold px-3 py-1 rounded-full border border-blue-400/20 bg-blue-500/[0.06]">
                  AENTRO Restaurant OS
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white/95 leading-[1.1]"
              >
                外食グループの &quot;次の一手&quot; を、
                <br />
                8 週間で<span className="gradient-text">数字にする。</span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-lg text-white/65 mt-6 max-w-xl leading-relaxed">
                既存システムは置き換えません。POS・勤怠・物流・レビューに overlay する形で、AI が異常を検出 → SV に配布 → 現場で実行 → POS に反映 — このループが 1 ブランド 8 週間で動き、年間 ¥30M〜 の改善を円換算で証明します。
              </motion.p>

              <motion.div variants={fadeUp} className="mt-9 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/how-it-works"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-[14px] font-medium transition-colors"
                >
                  <PlayCircle className="w-4 h-4" />
                  28秒のデモを見る
                </Link>
                <Link
                  href="/poc"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md border border-white/15 hover:border-white/30 hover:bg-white/[0.04] text-white/90 text-[14px] font-medium transition-colors"
                >
                  8週POC 提案書
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>

              <motion.div variants={fadeUp} className="mt-8 flex items-center gap-5 text-[11px] text-white/40">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  既存 POS 非置換
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  顧客環境内で完結
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  全額返金保証付
                </div>
              </motion.div>
            </motion.div>

            {/* RIGHT — product mock */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              className="relative h-[480px] lg:h-[560px]"
            >
              {/* radial backdrop */}
              <div className="absolute -inset-10 bg-[radial-gradient(circle_at_60%_40%,rgba(59,130,246,0.18),transparent_60%)]" />
              <div className="absolute -inset-10 bg-[radial-gradient(circle_at_30%_70%,rgba(16,185,129,0.12),transparent_60%)]" />

              {/* back card — Action Loop (blurred) */}
              <div className="absolute right-2 top-10 w-[78%] rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4 opacity-50 blur-[1.5px] rotate-[1.5deg]">
                <div className="flex items-center gap-2 mb-3">
                  <Repeat className="w-3.5 h-3.5 text-emerald-400" />
                  <div className="text-[10px] tracking-[0.16em] uppercase text-white/55 font-bold">Action Loop</div>
                </div>
                <div className="space-y-2">
                  {["AI 検出", "SV 配布", "店舗実行", "POS 反映"].map((s) => (
                    <div key={s} className="h-7 rounded bg-white/[0.04] flex items-center px-3 text-[11px] text-white/45">
                      {s}
                    </div>
                  ))}
                </div>
              </div>

              {/* front card — Daily Brief */}
              <div className="absolute left-0 bottom-0 w-[88%] rounded-xl border border-white/[0.08] bg-bg-elevated/95 backdrop-blur-sm shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-purple-500/15 flex items-center justify-center">
                      <Brain className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <div>
                      <div className="text-[12px] font-bold text-white/95">Daily Brief</div>
                      <div className="text-[10px] text-white/40 font-mono">2026-05-04</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                    Live
                  </div>
                </div>

                {/* sales row */}
                <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3 mb-3">
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-white/40">本日売上</div>
                      <div className="font-mono text-2xl font-bold text-white/95 mt-0.5">¥3.84B</div>
                    </div>
                    <div className="flex items-center gap-1 text-[12px] text-emerald-400 font-mono">
                      <TrendingUp className="w-3.5 h-3.5" />
                      +2.3%
                    </div>
                  </div>
                  {/* fake bar chart */}
                  <div className="flex items-end gap-1 h-10">
                    {[40, 55, 35, 70, 60, 80, 65, 90, 75, 85, 95, 78].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm bg-gradient-to-t from-blue-500/40 to-blue-400/80"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>

                {/* counts */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <BriefStat label="異常" value="3" tone="amber" />
                  <BriefStat label="意思決定" value="2" tone="blue" />
                  <BriefStat label="AI提案" value="1" tone="emerald" />
                </div>

                {/* alerts */}
                <div className="space-y-1.5">
                  <BriefAlert
                    time="03:14"
                    text="すき家 142店 深夜帯 -8.2%"
                    tone="amber"
                    icon={<TrendingDown className="w-3 h-3" />}
                  />
                  <BriefAlert
                    time="09:30"
                    text="はま寿司 牛バラ欠品リスク"
                    tone="blue"
                    icon={<AlertTriangle className="w-3 h-3" />}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ====================== 2. TRUST STRIP ====================== */}
      <section className="border-y border-white/[0.06] bg-white/[0.015]">
        <div className="container-x py-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/[0.06] rounded-xl overflow-hidden">
            <TrustStat value="¥32.1億" label="累計年間改善" />
            <TrustStat value="9,240" label="店舗合計" />
            <TrustStat value="5社" label="実装完了" />
            <TrustStat value="100%" label="本契約転換率" />
          </div>
          <p className="mt-4 text-center text-[11px] text-white/35">
            上記は匿名化された累計実績。詳細は事例セクションへ
          </p>
        </div>
      </section>

      {/* ====================== 3. WHY (3 cards) ====================== */}
      <Section>
        <SectionHeader eyebrow="WHY AENTRO" title="なぜ既存ツールでは解けないのか" />

        <div className="grid lg:grid-cols-3 gap-5">
          <CompareCard
            kind="bad"
            badge="BI 単機能"
            badgeTone="amber"
            heading="Tableau / Power BI"
            sub="可視化はできても、AI が現場アクションまで運んでくれない"
            points={[
              "統合は別レイヤー、ETL に半年",
              "AI は限定的、tool use なし",
              "業界特化資産 (HACCP / FC) ゼロ",
            ]}
          />
          <CompareCard
            kind="bad"
            badge="汎用 OS"
            badgeTone="amber"
            heading="Palantir Foundry"
            sub="業界特化が浅い、上陸 1 社目に時間がかかる"
            points={[
              "外食 vertical は標準では存在しない",
              "日本市場での実績不足、契約期間 12〜24 ヶ月",
              "初年度 5 億円〜",
            ]}
          />
          <CompareCard
            kind="good"
            badge="外食特化"
            badgeTone="emerald"
            heading="AENTRO"
            sub="外食特化 × AI × 既存非置換 × 8週間 POC"
            points={[
              "HACCP / レシピ BOM / 商圏 Huff など標準搭載",
              "Claude 統合、11 tool で実データ参照",
              "既存 POS / 勤怠の上に overlay、リスクなし",
            ]}
          />
        </div>
      </Section>

      {/* ====================== 4. WHAT IT DOES (2x2) ====================== */}
      <Section>
        <SectionHeader eyebrow="WHAT IT DOES" title="経営判断のループを、AI で完結させる" />

        <div className="grid md:grid-cols-2 gap-5">
          <FeatureCard
            icon={<Brain className="w-5 h-5" />}
            tone="purple"
            title="Daily Executive Brief"
            tagline="朝3分で経営判断"
            body="売上の異常、対応待ち、AI 提案を、社長が出社する前に Slack / メール / iOS に。"
            quote="既に出社する前に判断材料が揃っている。SV を呼ぶ前に状況が見える。"
          />
          <FeatureCard
            icon={<Repeat className="w-5 h-5" />}
            tone="emerald"
            title="Action Loop ライブ"
            tagline="AI 検出 → 現場実行 → POS 反映"
            body="4 ステージのループが 24時間以内に閉じる。承認は経営層が押すだけ。"
            quote="考えるべきことは「Yes か No」だけ。残りは AI が運ぶ。"
          />
          <FeatureCard
            icon={<Zap className="w-5 h-5" />}
            tone="blue"
            title="Workflow Builder"
            tagline="日本語で書けば AI が spec"
            badge="AIP Studio 相当"
            body="「もし廃棄が前週比 +20% なら SV を派遣する」と書けば、Claude が KPI 定義 + ontology を読んで実行可能な workflow に変換。"
          />
          <FeatureCard
            icon={<FlaskConical className="w-5 h-5" />}
            tone="amber"
            title="8週間 POC Wizard"
            tagline="4-step で起動、結果は統計的に証明"
            body="1 ブランド・1 テーマ・対象店舗を選ぶだけ。8 週後に対照群比較で「確実に効いた」を経営報告書に。"
          />
        </div>
      </Section>

      {/* ====================== 5. ACTION LOOP STAGES ====================== */}
      <Section>
        <SectionHeader
          eyebrow="24h LOOP"
          title="異常検出から POS 反映まで、24 時間で 1 ループ。"
          description="経営判断は単発ではない。月単位ではなく、毎日回る。"
        />

        <div className="grid md:grid-cols-4 gap-3 md:gap-0">
          <LoopStage
            order={1}
            time="03:14"
            label="AI 検出"
            icon={<Sparkles className="w-4 h-4" />}
            tone="purple"
            lines={["異常パターン抽出", "影響度スコア算出", "原因仮説の生成"]}
          />
          <LoopStage
            order={2}
            time="07:30"
            label="SV 配布"
            icon={<Smartphone className="w-4 h-4" />}
            tone="blue"
            lines={["担当者にプッシュ", "推奨アクション付", "iOS / Slack"]}
          />
          <LoopStage
            order={3}
            time="終日"
            label="店舗実行"
            icon={<Building2 className="w-4 h-4" />}
            tone="amber"
            lines={["シフト・発注を調整", "現場ログを記録", "進捗を可視化"]}
          />
          <LoopStage
            order={4}
            time="翌03:00"
            label="POS 反映"
            icon={<Database className="w-4 h-4" />}
            tone="emerald"
            lines={["効果を円換算", "対照群と比較", "翌日の Brief に統合"]}
            isLast
          />
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-1.5 text-[13px] text-blue-400 hover:text-blue-300 transition-colors"
          >
            フルアニメーションで見る
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </Section>

      {/* ====================== 6. CASES CAROUSEL ====================== */}
      <Section>
        <SectionHeader eyebrow="PROOF" title="5 社で実証済み、累計 ¥32.1 億の年間改善" />

        <div className="-mx-6 lg:-mx-12 px-6 lg:px-12 overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-min">
            <CaseCard
              code="CASE 001"
              segment="大手牛丼チェーン"
              scale="3,000店規模"
              theme="深夜帯シフト最適化"
              kpis={["人時売上 +12.4%", "深夜離脱率 -38%", "労務適合 100%"]}
              annual="¥18.2億"
              period="2025 Q1 — 8週POC → 本展開"
            />
            <CaseCard
              code="CASE 002"
              segment="回転寿司チェーン"
              scale="500店規模"
              theme="欠品 / 廃棄削減"
              kpis={["廃棄額 -22%", "欠品時間 -41%", "粗利 +1.8pt"]}
              annual="¥4.2億"
              period="2025 Q2 — 全店展開"
            />
            <CaseCard
              code="CASE 003"
              segment="ファミレスチェーン"
              scale="450店規模"
              theme="QSC スコア最適化"
              kpis={["QSC +6.2pt", "再来店率 +4.1%", "クレーム -28%"]}
              annual="¥6.5億"
              period="2025 Q3 — 段階展開"
            />
            <CaseCard
              code="CASE 004"
              segment="ハンバーガーチェーン"
              scale="290店規模"
              theme="PMI 加速"
              kpis={["統合工数 -54%", "システム統廃合 8→3", "意思決定 -45日"]}
              annual="¥3.2億"
              period="2025 Q4 — M&A 後 100日"
            />
            <CaseCard
              code="CASE 005"
              segment="総合外食 HD"
              scale="5,000店規模"
              theme="経営会議資料自動化"
              kpis={["作成工数 -65%", "資料更新 月次→日次", "経営即応性 +3x"]}
              annual="工数 -65%"
              period="2026 Q1 — 全社運用"
            />
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/value#cases"
            className="inline-flex items-center gap-1.5 text-[13px] text-blue-400 hover:text-blue-300 transition-colors"
          >
            全事例を見る
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </Section>

      {/* ====================== 7. POC OFFER ====================== */}
      <Section>
        <SectionHeader
          eyebrow="8-WEEK POC"
          title="8 週間 ¥4,000,000 で、何が戻ってくるか"
          center
        />

        <div className="grid md:grid-cols-2 gap-5 max-w-5xl mx-auto">
          {/* deliverables */}
          <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-7">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-md bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-[13px] uppercase tracking-[0.14em] font-bold text-white/95">成果物</h3>
            </div>
            <ul className="space-y-3">
              {[
                "経営向け1ページサマリ (PDF)",
                "事業部長向け詳細分析 (PPT)",
                "情シス向け技術評価 (Markdown + Architecture)",
                "現場向けアクション一覧 (CSV)",
                "年間 ROI 試算 (Excel)",
                "本展開ロードマップ + スコープ案",
              ].map((d) => (
                <li key={d} className="flex items-start gap-3 text-[14px] text-white/75">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* guarantee */}
          <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-7">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-md bg-emerald-500/15 flex items-center justify-center">
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-[13px] uppercase tracking-[0.14em] font-bold text-white/95">リスク・保証</h3>
            </div>
            <ul className="space-y-3">
              {[
                "全額返金保証: W4時点で「データ取り込み不能」と判明した場合",
                "既存システムへの書き戻しは初期 read-only",
                "過去 5 社で 100% 本契約に転換",
                "効果が出ない場合も、原因仮説と次の打ち手は出る",
              ].map((d) => (
                <li key={d} className="flex items-start gap-3 text-[14px] text-white/75">
                  <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA bar */}
        <div className="mt-10 max-w-5xl mx-auto rounded-xl border border-white/[0.06] bg-gradient-to-r from-emerald-500/[0.06] via-blue-500/[0.05] to-transparent p-5 lg:p-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 text-[13px] text-white/65">
            8 週間 / ¥4,000,000 / 1 ブランド・1 テーマ・対象店舗を選ぶだけ
          </div>
          <Link
            href="/poc"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-[14px] font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            POC 提案書をダウンロード
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md border border-white/15 hover:border-white/30 hover:bg-white/[0.04] text-white/95 text-[14px] font-medium transition-colors"
          >
            デモを依頼
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </Section>

      {/* ====================== 8. ARCHITECTURE ====================== */}
      <Section>
        <SectionHeader
          eyebrow="ARCHITECTURE"
          title="あなたのシステムは、何も変わりません"
          description="既存 POS / 勤怠 / 物流 / 会計の上に AENTRO が overlay。read-only から始められます。"
        />

        <div className="max-w-3xl mx-auto space-y-3">
          <ArchLayer
            icon={<Banknote className="w-4 h-4" />}
            tone="emerald"
            label="Action Layer"
            content="タスク / 会議パック / 改善施策 / 承認 / 書き戻し"
          />
          <ArchLayer
            icon={<Brain className="w-4 h-4" />}
            tone="purple"
            label="Intelligence Layer"
            content="KPI / 異常検知 / 需要予測 / 効果測定 / AI Analyst (Claude)"
          />
          <ArchLayer
            icon={<Database className="w-4 h-4" />}
            tone="blue"
            label="Canonical Layer"
            content="店舗 / 商品 / 人 / 原材料 / シフト / 物流 / KPI の統一モデル"
          />
          <ArchLayer
            icon={<Network className="w-4 h-4" />}
            tone="amber"
            label="Integration Layer"
            content="Connector / CSV / API / SFTP / DWH (read-only)"
          />

          {/* divider */}
          <div className="relative py-6">
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.08]" />
            <div className="relative flex justify-center">
              <span className="px-3 bg-bg-primary text-[10px] tracking-[0.18em] uppercase text-white/35 font-bold">
                既存システム
              </span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {["POS", "勤怠", "物流", "会計", "監査"].map((t) => (
              <span
                key={t}
                className="px-3 py-1.5 rounded-md border border-white/10 bg-white/[0.025] text-[12px] text-white/55 font-mono"
              >
                {t}
              </span>
            ))}
          </div>

          <div className="mt-8 grid sm:grid-cols-2 gap-3 text-[12px] text-white/55">
            <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-4">
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-1.5">接続</div>
              read-only から開始、書き戻しは承認制。
            </div>
            <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-4">
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-1.5">データ移動</div>
              顧客環境内で完結（dedicated VPC オプション）。
            </div>
          </div>
        </div>
      </Section>

      {/* ====================== 9. FINAL CTA ====================== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero pointer-events-none" />
        <div className="container-x relative py-24 lg:py-32 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-white/95 leading-tight">
            次の経営会議までに、AI が動き出します
          </h2>
          <p className="mt-5 text-lg text-white/65 max-w-2xl mx-auto">
            「8週間試してから決められる」のが、AENTRO のオファーです。
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-[14px] font-medium transition-colors"
            >
              デモを依頼
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/security"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-md border border-white/15 hover:border-white/30 hover:bg-white/[0.04] text-white/95 text-[14px] font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Security Pack ダウンロード
            </Link>
            <a
              href="mailto:hello@aentroinc.com"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-3.5 text-[14px] text-white/65 hover:text-white transition-colors"
            >
              お問合せ
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <p className="mt-12 text-[12px] text-white/35">
            リスクなし: POC 期間中いつでも中止可能、データは顧客環境に残る。
          </p>
        </div>
      </section>
    </>
  )
}

/* ====================== sub components ====================== */

function BriefStat({ label, value, tone }: { label: string; value: string; tone: "amber" | "blue" | "emerald" }) {
  const toneCls = {
    amber: "text-amber-400 bg-amber-500/[0.08] border-amber-400/20",
    blue: "text-blue-400 bg-blue-500/[0.08] border-blue-400/20",
    emerald: "text-emerald-400 bg-emerald-500/[0.08] border-emerald-400/20",
  }[tone]
  return (
    <div className={cn("rounded-md border p-2 text-center", toneCls)}>
      <div className="font-mono text-base font-bold leading-none">{value}</div>
      <div className="text-[9px] uppercase tracking-[0.12em] mt-1 opacity-80">{label}</div>
    </div>
  )
}

function BriefAlert({
  time,
  text,
  tone,
  icon,
}: {
  time: string
  text: string
  tone: "amber" | "blue"
  icon: React.ReactNode
}) {
  const toneCls = {
    amber: "text-amber-400",
    blue: "text-blue-400",
  }[tone]
  return (
    <div className="flex items-center gap-2 text-[11px] py-1.5 px-2 rounded bg-white/[0.025] border border-white/[0.04]">
      <span className={cn("flex items-center gap-1 font-mono", toneCls)}>
        {icon}
        {time}
      </span>
      <span className="text-white/75 truncate">{text}</span>
      <ChevronRight className="w-3 h-3 text-white/35 ml-auto shrink-0" />
    </div>
  )
}

function TrustStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-bg-primary px-5 py-7 text-center">
      <div className="font-mono text-3xl sm:text-4xl lg:text-5xl font-bold text-emerald-400 leading-none tracking-tight">
        {value}
      </div>
      <div className="mt-3 text-[11px] uppercase tracking-[0.14em] text-white/45">{label}</div>
    </div>
  )
}

function CompareCard({
  kind,
  badge,
  badgeTone,
  heading,
  sub,
  points,
}: {
  kind: "good" | "bad"
  badge: string
  badgeTone: "amber" | "emerald"
  heading: string
  sub: string
  points: string[]
}) {
  const isGood = kind === "good"
  const badgeCls = {
    amber: "border-amber-400/25 bg-amber-500/[0.08] text-amber-400",
    emerald: "border-emerald-400/25 bg-emerald-500/[0.08] text-emerald-400",
  }[badgeTone]
  return (
    <div
      className={cn(
        "rounded-xl border p-6 lg:p-7 flex flex-col",
        isGood
          ? "border-emerald-400/30 bg-emerald-500/[0.04]"
          : "border-white/[0.06] bg-white/[0.02]"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={cn("flex items-center gap-1.5 text-[12px] font-medium", isGood ? "text-emerald-400" : "text-white/55")}>
          {isGood ? <Check className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {heading}
        </div>
        <span className={cn("text-[10px] tracking-[0.14em] uppercase font-bold border rounded-full px-2 py-0.5", badgeCls)}>
          {badge}
        </span>
      </div>
      <h3 className={cn("text-[17px] font-bold leading-snug mb-5", isGood ? "text-white/95" : "text-white/85")}>
        {sub}
      </h3>
      <ul className="space-y-2.5 mt-auto">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2.5 text-[13px] text-white/65">
            <span
              className={cn(
                "shrink-0 mt-1 w-1 h-1 rounded-full",
                isGood ? "bg-emerald-400" : "bg-white/30"
              )}
            />
            {p}
          </li>
        ))}
      </ul>
    </div>
  )
}

function FeatureCard({
  icon,
  tone,
  title,
  tagline,
  body,
  quote,
  badge,
}: {
  icon: React.ReactNode
  tone: "purple" | "emerald" | "blue" | "amber"
  title: string
  tagline: string
  body: string
  quote?: string
  badge?: string
}) {
  const toneCls = {
    purple: "bg-purple-500/15 text-purple-400 border-purple-400/20",
    emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-400/20",
    blue: "bg-blue-500/15 text-blue-400 border-blue-400/20",
    amber: "bg-amber-500/15 text-amber-400 border-amber-400/20",
  }[tone]
  return (
    <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-7 hover:border-white/[0.12] transition-colors">
      <div className="flex items-start justify-between mb-5">
        <div className={cn("w-10 h-10 rounded-lg border flex items-center justify-center", toneCls)}>
          {icon}
        </div>
        {badge && (
          <span className="text-[10px] tracking-[0.14em] uppercase font-bold border border-white/10 bg-white/[0.04] text-white/55 rounded-full px-2 py-0.5">
            {badge}
          </span>
        )}
      </div>
      <h3 className="text-[18px] font-bold text-white/95 mb-1">{title}</h3>
      <div className="text-[12px] uppercase tracking-[0.12em] text-white/45 mb-3">{tagline}</div>
      <p className="text-[14px] text-white/70 leading-relaxed">{body}</p>
      {quote && (
        <blockquote className="mt-5 pl-3 border-l-2 border-white/15 text-[12px] text-white/50 italic leading-relaxed">
          {quote}
        </blockquote>
      )}
    </div>
  )
}

function LoopStage({
  order,
  time,
  label,
  icon,
  tone,
  lines,
  isLast,
}: {
  order: number
  time: string
  label: string
  icon: React.ReactNode
  tone: "purple" | "blue" | "amber" | "emerald"
  lines: string[]
  isLast?: boolean
}) {
  const toneCls = {
    purple: "bg-purple-500/15 text-purple-400 border-purple-400/25",
    blue: "bg-blue-500/15 text-blue-400 border-blue-400/25",
    amber: "bg-amber-500/15 text-amber-400 border-amber-400/25",
    emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-400/25",
  }[tone]

  return (
    <div className="relative flex md:block">
      <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-5 flex-1 md:m-2">
        <div className="flex items-center justify-between mb-3">
          <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-mono", toneCls)}>
            {icon}
            {time}
          </span>
          <span className="font-mono text-[10px] text-white/30">0{order}</span>
        </div>
        <div className="text-[15px] font-bold text-white/95 mb-3">{label}</div>
        <ul className="space-y-1">
          {lines.map((l) => (
            <li key={l} className="text-[12px] text-white/55 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-white/25" />
              {l}
            </li>
          ))}
        </ul>
      </div>
      {/* arrow connector */}
      {!isLast && (
        <div className="hidden md:flex absolute right-[-10px] top-1/2 -translate-y-1/2 z-10 w-5 h-5 rounded-full bg-bg-primary border border-white/[0.08] items-center justify-center">
          <ChevronRight className="w-3 h-3 text-white/40" />
        </div>
      )}
    </div>
  )
}

function CaseCard({
  code,
  segment,
  scale,
  theme,
  kpis,
  annual,
  period,
}: {
  code: string
  segment: string
  scale: string
  theme: string
  kpis: string[]
  annual: string
  period: string
}) {
  return (
    <div className="min-w-[320px] max-w-[320px] border border-white/[0.06] bg-white/[0.02] rounded-xl p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[10px] tracking-[0.14em] text-white/40">{code}</span>
        <span className="text-[10px] uppercase tracking-[0.14em] text-emerald-400 font-bold">VERIFIED</span>
      </div>

      <h3 className="text-[15px] font-bold text-white/95 leading-snug">{segment}</h3>
      <div className="text-[11px] text-white/45 font-mono mt-1">{scale}</div>

      <div className="mt-4 mb-4 px-3 py-2 rounded-md bg-blue-500/[0.06] border border-blue-400/15 text-[12px] text-blue-300">
        {theme}
      </div>

      <ul className="space-y-1.5 mb-4">
        {kpis.map((k) => (
          <li key={k} className="flex items-center gap-2 text-[12px] text-white/70">
            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
            {k}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-4 border-t border-white/[0.05]">
        <div className="text-[10px] uppercase tracking-[0.14em] text-white/40">年間改善</div>
        <div className="font-mono text-2xl font-bold text-emerald-400 mt-0.5">{annual}</div>
        <div className="text-[10px] text-white/35 mt-1">{period}</div>
      </div>
    </div>
  )
}

function ArchLayer({
  icon,
  tone,
  label,
  content,
}: {
  icon: React.ReactNode
  tone: "emerald" | "purple" | "blue" | "amber"
  label: string
  content: string
}) {
  const toneCls = {
    emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-400/25",
    purple: "bg-purple-500/15 text-purple-400 border-purple-400/25",
    blue: "bg-blue-500/15 text-blue-400 border-blue-400/25",
    amber: "bg-amber-500/15 text-amber-400 border-amber-400/25",
  }[tone]
  return (
    <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-4 flex items-center gap-4">
      <div className={cn("w-10 h-10 rounded-lg border flex items-center justify-center shrink-0", toneCls)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-white/95">{label}</div>
        <div className="text-[12px] text-white/55 mt-0.5 leading-relaxed">→ {content}</div>
      </div>
    </div>
  )
}
