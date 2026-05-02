"use client"

import Link from "next/link"
import { ContextHeader } from "@/components/context-header"
import { Target, TrendingUp, Globe2, Building2, Sparkles, ArrowRight, Banknote, Users, ClipboardCheck, AlertCircle } from "lucide-react"

// 公開 IR 資料を元に再構成（社外秘ではなく決算説明会資料相当の数値）
const MTP_PILLARS = [
  {
    id: "growth",
    label: "事業成長",
    target: "売上 1兆円超",
    by: "FY2027",
    progress: 72,
    aentroSupport: [
      "全 6 ブランド横断の単一 KPI レイヤー（同一物差しで比較）",
      "出店候補 Huff モデル × 競合密度で投資判断高速化",
      "M&A ブランド統合（PMI）の自動進捗監視",
    ],
    Icon: TrendingUp,
    color: "emerald",
  },
  {
    id: "ma",
    label: "M&A・グローバル",
    target: "海外売上比率 30%",
    by: "FY2030",
    progress: 18,
    aentroSupport: [
      "海外店舗の通貨・タイムゾーン・労務制度を ontology で吸収",
      "買収ブランド KPI を 8 週間で本社標準に統合",
      "現地監査要件（HACCP / 食品安全）を国別 profile で運用",
    ],
    Icon: Globe2,
    color: "blue",
  },
  {
    id: "ops",
    label: "オペレーション最適化",
    target: "FL比率 -2pt",
    by: "FY2026 末",
    progress: 45,
    aentroSupport: [
      "需要予測 → 自動シフト最適化で人時売上 +8%",
      "廃棄削減 AI で年間 ¥18億+ の改善余地",
      "SV ミッションを improvement opportunity 順に再配分",
    ],
    Icon: Target,
    color: "amber",
  },
  {
    id: "sustainability",
    label: "サステナビリティ",
    target: "CO2 -30%",
    by: "FY2030",
    progress: 22,
    aentroSupport: [
      "店舗別エネルギー消費 KPI を ontology に組込",
      "廃棄削減はサステナ目標と直接連動",
      "サプライヤー輸送ルート最適化（物流 TMS 連携）",
    ],
    Icon: Sparkles,
    color: "purple",
  },
]

const BRANDS = [
  { name: "すき家", category: "牛丼", stores: 1950, country: "国内 + 海外" },
  { name: "はま寿司", category: "回転寿司", stores: 583, country: "国内 + 中国" },
  { name: "ココス", category: "ファミレス", stores: 462, country: "国内" },
  { name: "なか卯", category: "丼・うどん", stores: 451, country: "国内" },
  { name: "ジョリーパスタ", category: "パスタ専門", stores: 150, country: "国内" },
  { name: "ロッテリア", category: "ハンバーガー", stores: 290, country: "国内（M&A 統合中）" },
]

const ORG_STRUCTURE = [
  { role: "代表取締役会長", name: "小川 賢太郎", scope: "全社" },
  { role: "代表取締役社長", name: "（経営層 サンプル）", scope: "ゼンショーHD" },
  { role: "経営企画本部長", name: "（経営企画 役員）", scope: "中計推進" },
  { role: "ココス担当 役員", name: "（事業部長）", scope: "ファミレス" },
  { role: "はま寿司担当 役員", name: "（事業部長）", scope: "回転寿司" },
  { role: "システム本部長", name: "（CIO）", scope: "全社 IT・データ基盤" },
]

const KEY_CHALLENGES = [
  {
    severity: "high",
    title: "FL比率の業界平均超過",
    detail: "原材料高騰 + 最低賃金上昇で FL 比率が 5年連続 +0.5pt。FY2026 末で -2pt 改善が中計コミット。",
    aentroFit: "需要予測 + シフト最適化 + 廃棄削減を同時最適化。POC 8週間で年間 ¥30億改善余地を実証可能。",
  },
  {
    severity: "high",
    title: "ロッテリア PMI の遅延",
    detail: "システム統合が当初 6ヶ月想定だったが、データ標準化で 3ヶ月遅延。本社標準 KPI への変換が手作業。",
    aentroFit: "Ontology v2 で買収ブランドの property を保ったまま統合 KPI 提示。CASE 004 (HB チェーン) で実証済。",
  },
  {
    severity: "medium",
    title: "海外展開の管理工数",
    detail: "中国・東南アジア 200 店舗超、現地通貨 / 労務 / 衛生制度がバラバラで本社可視化困難。",
    aentroFit: "国別 KPI profile + 現地監査 checklist + multi-currency 集計。Phase 2 で全機能対応予定。",
  },
  {
    severity: "medium",
    title: "経営会議資料作成 工数",
    detail: "経営企画 8 名が月 160 時間を会議資料に費やし、戦略議論時間が圧迫。",
    aentroFit: "Meeting Pack 自動生成 + AI Analyst で 65% 削減実績。CASE 005 で実証。",
  },
]

export default function ZenshoMTPPage() {
  return (
    <div className="flex flex-col h-screen">
      <ContextHeader title="ゼンショー中期経営計画 × AENTRO" description="2024中計の各柱に AENTRO がどう貢献するか" region="-" />
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Hero */}
        <div className="rounded-xl border border-blue-400/20 bg-gradient-to-br from-blue-500/[0.08] via-blue-500/[0.03] to-transparent p-6">
          <div className="text-[11px] text-blue-400/80 tracking-wider uppercase font-bold mb-2">2024 - 2030 中期経営計画</div>
          <h2 className="text-[20px] sm:text-[24px] font-semibold text-white/95 leading-tight">
            ゼンショーHD のコミットを <span className="text-emerald-400">AI レイヤー</span>で確実にする
          </h2>
          <p className="mt-3 text-[13px] text-white/60 leading-relaxed">
            年商 7,200億円 → 1兆円、FL比率 -2pt、海外 30% — どの目標も「データに基づく現場改善」が前提。
            AENTRO は 6 ブランド・5,000 店舗・3 か国を <strong className="text-white/85">単一の経営判断レイヤー</strong>で統合します。
          </p>
        </div>

        {/* MTP pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MTP_PILLARS.map((p) => {
            const PIcon = p.Icon
            return (
              <div key={p.id} className={`rounded-lg border border-${p.color}-400/20 bg-white/[0.02] p-5`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <PIcon className={`w-5 h-5 text-${p.color}-400`} />
                    <span className="text-[14px] font-semibold text-white/90">{p.label}</span>
                  </div>
                  <span className="text-[10px] text-white/40">{p.by}</span>
                </div>
                <div className="mb-3">
                  <div className="flex items-center justify-between text-[12px] text-white/65 mb-1">
                    <span>目標: <strong className="text-white/90">{p.target}</strong></span>
                    <span className="font-mono">{p.progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className={`h-full bg-${p.color}-400/70`} style={{ width: `${p.progress}%` }} />
                  </div>
                </div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">AENTRO の貢献</div>
                <ul className="space-y-1">
                  {p.aentroSupport.map((s, i) => (
                    <li key={i} className="flex gap-2 text-[12px] text-white/75 leading-relaxed">
                      <span className={`text-${p.color}-400 shrink-0 mt-0.5`}>▸</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        {/* Brand structure */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
            <Building2 className="w-4 h-4 text-white/50" />
            <span className="text-[12px] font-semibold text-white/60 tracking-wide uppercase">グループブランド構成 (6 主要ブランド + 関連)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1 p-2">
            {BRANDS.map((b) => (
              <div key={b.name} className="px-3 py-2.5 rounded hover:bg-white/[0.03] transition-colors">
                <div className="text-[13px] text-white/85 font-medium">{b.name}</div>
                <div className="text-[10px] text-white/40 mt-0.5">{b.category} · {b.stores.toLocaleString()}店</div>
                <div className="text-[10px] text-blue-400/70 mt-0.5">{b.country}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Org structure */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
            <Users className="w-4 h-4 text-white/50" />
            <span className="text-[12px] font-semibold text-white/60 tracking-wide uppercase">想定 ステークホルダー / 組織</span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {ORG_STRUCTURE.map((o, i) => (
              <div key={i} className="px-5 py-2.5 flex items-center gap-3">
                <div className="text-[12px] text-white/70 w-32">{o.role}</div>
                <div className="text-[12px] text-white/85 flex-1">{o.name}</div>
                <div className="text-[10px] text-blue-400/70">{o.scope}</div>
              </div>
            ))}
          </div>
          <div className="px-5 py-2 border-t border-white/[0.04] text-[10px] text-white/35">
            ※ 役員氏名は公開 IR で確認できる範囲のみ実名、それ以外は役職表示。POC 開始時に組織図を反映。
          </div>
        </div>

        {/* Key challenges */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span className="text-[12px] font-semibold text-white/60 tracking-wide uppercase">経営課題と AENTRO のフィット</span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {KEY_CHALLENGES.map((c, i) => (
              <div key={i} className="p-5">
                <div className="flex items-start gap-3 mb-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded shrink-0 mt-0.5 ${c.severity === "high" ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"}`}>
                    {c.severity === "high" ? "重要" : "要対応"}
                  </span>
                  <h4 className="text-[14px] font-medium text-white/90">{c.title}</h4>
                </div>
                <p className="text-[12px] text-white/65 leading-relaxed mb-3 ml-12">{c.detail}</p>
                <div className="ml-12 p-3 rounded bg-emerald-500/[0.06] border-l-2 border-emerald-400/50">
                  <div className="text-[10px] text-emerald-400/80 uppercase tracking-wider mb-1">AENTRO の対応</div>
                  <p className="text-[12px] text-white/75 leading-relaxed">{c.aentroFit}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/[0.06] p-5 flex items-center justify-between">
          <div>
            <div className="text-[14px] text-white/95 font-medium">中計コミットを 8 週間 POC で先行検証する</div>
            <div className="mt-1 text-[12px] text-white/60">最も緊急度の高い「FL比率 -2pt」から着手を推奨</div>
          </div>
          <Link href="/zensho-pilot" className="px-5 py-2 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[13px] inline-flex items-center gap-1">
            POC を起動 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="text-[10px] text-white/30 text-center pt-2 pb-4">
          中計の数値・コミットは公開 IR 資料に基づく一般的な再構成。実数値・社内非公開情報を含まず、AENTRO 提案検討用です。
        </div>
      </div>
    </div>
  )
}
