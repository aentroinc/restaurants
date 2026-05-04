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
                外食チェーンの「もったいない」を、
                <br />
                AI が毎日<span className="gradient-text">見つけて教えます。</span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-lg text-white/70 mt-6 max-w-xl leading-relaxed">
                廃棄ロス・シフトの過剰や不足・欠品・問題のある店舗 — 全店舗を毎朝 AI がチェックして、本部と店長に「今日やるべき改善」を届けます。
              </motion.p>
              <motion.p variants={fadeUp} className="text-base text-white/55 mt-3 max-w-xl leading-relaxed">
                今のシステムを置き換える必要はありません。<strong className="text-white/80">8 週間のお試し導入</strong>から始められて、年間 1〜18 億円分のロスを減らした会社があります。
              </motion.p>

              <motion.div variants={fadeUp} className="mt-9 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/how-it-works"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-[14px] font-medium transition-colors"
                >
                  <PlayCircle className="w-4 h-4" />
                  3 分でわかる動画
                </Link>
                <Link
                  href="/poc"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md border border-white/15 hover:border-white/30 hover:bg-white/[0.04] text-white/90 text-[14px] font-medium transition-colors"
                >
                  お試し導入の流れ
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>

              <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-white/45">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  今のシステムは触りません
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  データは社外に出ません
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  効果が出なければ全額返金
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

              {/* back card — 自動改善サイクル (blurred) */}
              <div className="absolute right-2 top-10 w-[78%] rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4 opacity-50 blur-[1.5px] rotate-[1.5deg]">
                <div className="flex items-center gap-2 mb-3">
                  <Repeat className="w-3.5 h-3.5 text-emerald-400" />
                  <div className="text-[10px] tracking-[0.16em] uppercase text-white/55 font-bold">自動改善サイクル</div>
                </div>
                <div className="space-y-2">
                  {["AI が問題発見", "担当に通知", "店舗で実行", "効果を確認"].map((s) => (
                    <div key={s} className="h-7 rounded bg-white/[0.04] flex items-center px-3 text-[11px] text-white/45">
                      {s}
                    </div>
                  ))}
                </div>
              </div>

              {/* front card — 朝のレポート */}
              <div className="absolute left-0 bottom-0 w-[88%] rounded-xl border border-white/[0.08] bg-bg-elevated/95 backdrop-blur-sm shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-purple-500/15 flex items-center justify-center">
                      <Brain className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <div>
                      <div className="text-[12px] font-bold text-white/95">朝のレポート</div>
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
                  <BriefStat label="気になる店" value="3" tone="amber" />
                  <BriefStat label="承認待ち" value="2" tone="blue" />
                  <BriefStat label="AI 提案" value="1" tone="emerald" />
                </div>

                {/* alerts */}
                <div className="space-y-1.5">
                  <BriefAlert
                    time="03:14"
                    text="142店で夜の売上が予測より低い"
                    tone="amber"
                    icon={<TrendingDown className="w-3 h-3" />}
                  />
                  <BriefAlert
                    time="09:30"
                    text="あす牛肉が足りなくなる店あり"
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
            <TrustStat value="32.1 億円" label="これまで減らしたロス（年あたり）" />
            <TrustStat value="9,240 店舗" label="導入した店の合計" />
            <TrustStat value="5 社" label="導入企業数" />
            <TrustStat value="100%" label="お試し → 本契約に進んだ割合" />
          </div>
          <p className="mt-4 text-center text-[11px] text-white/40">
            社名は秘密保持により非公開、詳しい事例は下のカードで
          </p>
        </div>
      </section>

      {/* ====================== 3. WHY (3 cards) ====================== */}
      <Section>
        <SectionHeader
          eyebrow="他のツールとの違い"
          title="なぜ普通の BI ツールでは限界があるのか"
          description="多くの会社が「データを集めて可視化するツール」は持っています。AENTRO はその次の段階 — AI が「次に何をすべきか」を現場まで届けるところまでやります。"
        />

        <div className="grid lg:grid-cols-3 gap-5">
          <CompareCard
            kind="bad"
            badge="見える化のみ"
            badgeTone="amber"
            heading="従来の BI ツール"
            sub="グラフは出せるが、AI が現場に「次にやること」を届けてくれない"
            points={[
              "複数システムのデータをまとめるのに半年〜1年",
              "AI 機能は限定的（チャットも基本的な質問だけ）",
              "外食特有の業務（HACCP・FC 会計など）に対応してない",
            ]}
          />
          <CompareCard
            kind="bad"
            badge="海外の汎用システム"
            badgeTone="amber"
            heading="海外の業務統合システム"
            sub="業界の細かい事情に弱く、日本での実績や対応に時間がかかる"
            points={[
              "外食専用の機能や業界知識が標準では入ってない",
              "契約期間が長く（1〜2 年以上）、初期費用が大きい",
              "日本の労務管理や食品衛生（HACCP）の対応は別途開発",
            ]}
          />
          <CompareCard
            kind="good"
            badge="外食専用"
            badgeTone="emerald"
            heading="AENTRO"
            sub="外食業務に特化、AI が判断、今のシステムはそのまま、8 週間で試せる"
            points={[
              "HACCP・レシピ原価・商圏分析など外食業務が標準対応",
              "AI が日本語で経営判断を補助（11 種類の業務に対応）",
              "今ある POS・勤怠の上に追加で動くだけ、何も置き換えない",
            ]}
          />
        </div>
      </Section>

      {/* ====================== 4. WHAT IT DOES (2x2) ====================== */}
      <Section>
        <SectionHeader
          eyebrow="できること"
          title="経営判断のサイクルを、毎日まわせるようにします"
          description="月 1 回の経営会議では遅すぎる時代。AENTRO は 24 時間で「気づき → 指示 → 実行 → 効果確認」を 1 週まわします。"
        />

        <div className="grid md:grid-cols-2 gap-5">
          <FeatureCard
            icon={<Brain className="w-5 h-5" />}
            tone="purple"
            title="朝のレポート"
            tagline="出社前にスマホで 3 分"
            body="売上の異常・気になる店・承認待ちの案件・AI からの提案を、社長や経営陣が出社する前に Slack やメール、iPhone に届けます。"
            quote="出社する前から判断材料が揃っている。SV を呼ぶ前に状況がわかる。"
          />
          <FeatureCard
            icon={<Repeat className="w-5 h-5" />}
            tone="emerald"
            title="自動改善サイクル"
            tagline="AI が見つけ、現場が実行、効果を計測"
            body="「気づき → 指示 → 実行 → 確認」の 4 段階が 24 時間以内に 1 周。経営陣は内容を見て「やる／やらない」を押すだけ。"
            quote="考えるのは「Yes か No」だけ。残りは AI が運んでくれる。"
          />
          <FeatureCard
            icon={<Zap className="w-5 h-5" />}
            tone="blue"
            title="ルール作成（日本語入力）"
            tagline="日本語で書けばそのまま動く"
            body="「もし廃棄が前の週から 20% 以上増えたら SV にすぐ向かわせる」と日本語で書けば、AI が業務に組み込みます。プログラミング知識は不要。"
          />
          <FeatureCard
            icon={<FlaskConical className="w-5 h-5" />}
            tone="amber"
            title="8 週間お試し導入"
            tagline="4 つの設定だけ、本当に効いたか統計で確認"
            body="1 ブランド・1 テーマ・対象店舗を選ぶだけ。8 週間後に「他の店と比べてどれだけ効いたか」を統計で確認、経営報告書として出力します。"
          />
        </div>
      </Section>

      {/* ====================== 5. ACTION LOOP STAGES ====================== */}
      <Section>
        <SectionHeader
          eyebrow="1 日のなかで"
          title="気づいてから現場が動くまで、24 時間で 1 周"
          description="月 1 回の経営会議では遅い。AENTRO は毎日「問題発見 → 指示 → 実行 → 効果確認」を回します。"
        />

        <div className="grid md:grid-cols-4 gap-3 md:gap-0">
          <LoopStage
            order={1}
            time="夜中 03:14"
            label="AI が問題を見つける"
            icon={<Sparkles className="w-4 h-4" />}
            tone="purple"
            lines={["全店舗のデータを毎晩確認", "売上・廃棄・人手不足の異常を発見", "なぜそうなったかの仮説を作る"]}
          />
          <LoopStage
            order={2}
            time="朝 07:30"
            label="担当者に通知"
            icon={<Smartphone className="w-4 h-4" />}
            tone="blue"
            lines={["スマホ・Slack に届く", "今日やるべきことが書いてある", "経営陣の承認も同じ画面で"]}
          />
          <LoopStage
            order={3}
            time="日中"
            label="店舗で対応"
            icon={<Building2 className="w-4 h-4" />}
            tone="amber"
            lines={["SV や店長がシフト・発注を調整", "対応の進捗が見える", "現場のコメントも残る"]}
          />
          <LoopStage
            order={4}
            time="翌朝 03:00"
            label="効果を確認"
            icon={<Database className="w-4 h-4" />}
            tone="emerald"
            lines={["改善額を円で計算", "他の店と比べて本当に効いたか確認", "翌日のレポートに反映"]}
            isLast
          />
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-1.5 text-[13px] text-blue-400 hover:text-blue-300 transition-colors"
          >
            動画で見る
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </Section>

      {/* ====================== 6. CASES CAROUSEL ====================== */}
      <Section>
        <SectionHeader
          eyebrow="導入事例"
          title="5 社で実証済み、合計 32 億円分のロスを減らしました"
          description="社名は秘密保持で出せませんが、業態・規模・改善内容は公開しています。"
        />

        <div className="-mx-6 lg:-mx-12 px-6 lg:px-12 overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-min">
            <CaseCard
              code="事例 1"
              segment="大手牛丼チェーン"
              scale="約 3,000 店舗"
              theme="夜のシフト過剰を解消"
              kpis={["人時売上 +12.4%", "深夜の離職 -38%", "労基適合 100%"]}
              annual="年 18.2 億円"
              period="2025 春 — お試し → 全店展開"
            />
            <CaseCard
              code="事例 2"
              segment="回転寿司チェーン"
              scale="約 500 店舗"
              theme="欠品と廃棄を同時に減らす"
              kpis={["廃棄額 -22%", "欠品時間 -41%", "粗利率 +1.8pt"]}
              annual="年 4.2 億円"
              period="2025 夏 — 全店展開"
            />
            <CaseCard
              code="事例 3"
              segment="ファミレスチェーン"
              scale="約 450 店舗"
              theme="QSC（品質・接客・清潔）の改善"
              kpis={["QSC +6.2pt", "再来店率 +4.1%", "苦情件数 -28%"]}
              annual="年 6.5 億円"
              period="2025 秋 — 段階展開"
            />
            <CaseCard
              code="事例 4"
              segment="ハンバーガーチェーン"
              scale="約 290 店舗"
              theme="買収後の統合を加速"
              kpis={["統合工数 -54%", "システム統合 8 → 3", "意思決定 -45 日"]}
              annual="年 3.2 億円"
              period="2025 年末 — M&A 後 100 日"
            />
            <CaseCard
              code="事例 5"
              segment="総合外食 HD"
              scale="約 5,000 店舗"
              theme="経営会議の資料を自動で作る"
              kpis={["作成時間 -65%", "更新頻度 月→日", "経営判断スピード 3 倍"]}
              annual="工数 -65%"
              period="2026 春 — 全社運用"
            />
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/value#cases"
            className="inline-flex items-center gap-1.5 text-[13px] text-blue-400 hover:text-blue-300 transition-colors"
          >
            全事例の詳細
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </Section>

      {/* ====================== 7. POC OFFER ====================== */}
      <Section>
        <SectionHeader
          eyebrow="お試し導入"
          title="8 週間 / 400 万円 で、何が手に入るか"
          center
        />

        <div className="grid md:grid-cols-2 gap-5 max-w-5xl mx-auto">
          {/* deliverables */}
          <div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-7">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-md bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-[13px] uppercase tracking-[0.14em] font-bold text-white/95">受け取れる資料</h3>
            </div>
            <ul className="space-y-3">
              {[
                "経営向け 1 ページまとめ（PDF）",
                "事業部長向け 詳しい分析（PPT）",
                "情シス向け 技術・セキュリティ評価",
                "店舗向け 改善アクション一覧（CSV）",
                "年間でいくら効くかの試算（Excel）",
                "全社展開する場合の進め方の提案",
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
              <h3 className="text-[13px] uppercase tracking-[0.14em] font-bold text-white/95">リスクと保証</h3>
            </div>
            <ul className="space-y-3">
              {[
                "全額返金保証：4 週目時点で「データが取り込めない」と判明した場合",
                "今のシステムに対する書き戻しは初期は無効、希望時のみ承認制で",
                "これまで 5 社全てが本契約まで進みました",
                "効果が出なかった場合も、原因と次の手は明確になります",
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
            8 週間 / 400 万円 / 1 ブランド・1 テーマ・対象店舗を選ぶだけ
          </div>
          <Link
            href="/poc"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-[14px] font-medium transition-colors"
          >
            お試し導入の詳細
            <ArrowRight className="w-4 h-4" />
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
          eyebrow="仕組み"
          title="今のシステムは、何も変わりません"
          description="POS や勤怠・物流・会計はそのまま。AENTRO が「データを読むだけ」で動き、書き戻しが必要な時は承認制です。"
        />

        <div className="max-w-3xl mx-auto space-y-3">
          <ArchLayer
            icon={<Banknote className="w-4 h-4" />}
            tone="emerald"
            label="行動・指示の層"
            content="タスク / 会議資料 / 改善施策 / 承認 / 書き戻し"
          />
          <ArchLayer
            icon={<Brain className="w-4 h-4" />}
            tone="purple"
            label="分析・AI の層"
            content="KPI 計算 / 異常検知 / 需要予測 / 効果測定 / AI による相談"
          />
          <ArchLayer
            icon={<Database className="w-4 h-4" />}
            tone="blue"
            label="データを揃える層"
            content="店舗 / 商品 / 人 / 原材料 / シフト / 物流 / KPI を共通の形に整える"
          />
          <ArchLayer
            icon={<Network className="w-4 h-4" />}
            tone="amber"
            label="データ取り込みの層"
            content="POS や勤怠から CSV や API でデータを読むだけ（書き換えはしません）"
          />

          {/* divider */}
          <div className="relative py-6">
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.08]" />
            <div className="relative flex justify-center">
              <span className="px-3 bg-bg-primary text-[10px] tracking-[0.18em] uppercase text-white/35 font-bold">
                今お使いのシステム
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

          <div className="mt-8 grid sm:grid-cols-2 gap-3 text-[12px] text-white/60">
            <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-4">
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-1.5">最初の接続</div>
              データを読むだけ。書き戻しは経営側が承認した場合のみ実施します。
            </div>
            <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-4">
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-1.5">データの置き場所</div>
              貴社の指定環境内で完結。希望する場合は専用クラウドも用意できます。
            </div>
          </div>
        </div>
      </Section>

      {/* ====================== 9. FINAL CTA ====================== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero pointer-events-none" />
        <div className="container-x relative py-24 lg:py-32 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-white/95 leading-tight">
            次の経営会議までに、AI を動かしませんか
          </h2>
          <p className="mt-5 text-lg text-white/70 max-w-2xl mx-auto">
            「8 週間試してから決められる」のが、AENTRO のお約束です。
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
              安全性について見る
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="mailto:info@aentroinc.com"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-3.5 text-[14px] text-white/65 hover:text-white transition-colors"
            >
              お問合せ
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <p className="mt-12 text-[12px] text-white/40">
            リスクなし：お試し期間中いつでも中止できます。データは貴社の指定環境に残ります。
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
