"use client"

import Link from "next/link"
import { ContextHeader } from "@/components/context-header"
import { CheckCircle2, XCircle, Hexagon, Building2, Cpu, Database, Zap, Shield, Globe, Users } from "lucide-react"

const competitors = [
  {
    id: "aentro",
    name: "AENTRO Restaurant OS",
    sub: "外食特化 AI 経営レイヤー",
    logo: Hexagon,
    color: "blue",
    features: {
      industry_specific: true,
      pos_multi_connect: true,
      ai_native: true,
      pilot_in_8_weeks: true,
      no_replacement: true,
      jpn_labor_law: true,
      haccp_built_in: true,
      fc_royalty: true,
      huff_model: true,
      writeback_to_pos: true,
      dedicated_vpc: true,
      monthly_value_proof: true,
      learning_curve: "1 day",
      annual_cost: "¥240M",
      time_to_value: "8 weeks",
    },
    why_us: [
      "外食専用に最適化された 100+ KPI / オントロジー",
      "Claude 統合で日本語で経営判断補助",
      "8 週間 POC で年間 ¥30M+ の改善を統計的に証明",
      "既存システムを置換せず、上位レイヤーとして overlay",
    ],
  },
  {
    id: "ntt",
    name: "NTTデータ / 大手 SI",
    sub: "汎用 BI / 受託開発",
    logo: Building2,
    color: "gray",
    features: {
      industry_specific: false,
      pos_multi_connect: "partial",
      ai_native: false,
      pilot_in_8_weeks: false,
      no_replacement: false,
      jpn_labor_law: "manual",
      haccp_built_in: false,
      fc_royalty: false,
      huff_model: false,
      writeback_to_pos: "custom_dev",
      dedicated_vpc: true,
      monthly_value_proof: false,
      learning_curve: "weeks",
      annual_cost: "¥800M〜",
      time_to_value: "12-18ヶ月",
    },
    why_not: [
      "外食ドメイン知識が限定的、ヒアリング工数大",
      "AI は OpenAI 等に外注、データ取扱いが不透明",
      "POC 提案がそもそも難しい（最小スコープでも億超）",
      "受託開発のためベンダーロックイン",
    ],
  },
  {
    id: "sap",
    name: "SAP / Oracle",
    sub: "ERP / 経営基盤",
    logo: Database,
    color: "amber",
    features: {
      industry_specific: false,
      pos_multi_connect: false,
      ai_native: "addon",
      pilot_in_8_weeks: false,
      no_replacement: false,
      jpn_labor_law: "addon",
      haccp_built_in: false,
      fc_royalty: "config",
      huff_model: false,
      writeback_to_pos: false,
      dedicated_vpc: true,
      monthly_value_proof: false,
      learning_curve: "months",
      annual_cost: "¥500M〜",
      time_to_value: "12-24ヶ月",
    },
    why_not: [
      "外食特化機能（HACCP / レシピ BOM 等）が標準では存在せず addon 必要",
      "ERP 思想で「全社移行」前提、置換コストが膨大",
      "AI は SAP Joule など限定的、外食には未対応",
      "経営層が見える効果まで 1-2 年",
    ],
  },
  {
    id: "tableau",
    name: "Tableau / Power BI",
    sub: "BI ダッシュボード",
    logo: Cpu,
    color: "emerald",
    features: {
      industry_specific: false,
      pos_multi_connect: false,
      ai_native: "limited",
      pilot_in_8_weeks: true,
      no_replacement: true,
      jpn_labor_law: false,
      haccp_built_in: false,
      fc_royalty: false,
      huff_model: false,
      writeback_to_pos: false,
      dedicated_vpc: true,
      monthly_value_proof: false,
      learning_curve: "weeks",
      annual_cost: "¥10-50M",
      time_to_value: "3-6ヶ月",
    },
    why_not: [
      "可視化のみ、データ統合 / オントロジーは別途構築必要",
      "AI は Pulse / Copilot 程度、tool use なし",
      "外食特化資産（HACCP / FC / 商圏）ゼロ",
      "「ダッシュボード」止まりで現場アクションに繋がらない",
    ],
  },
  {
    id: "smaregi",
    name: "Air レジ / スマレジ BI",
    sub: "POS 直結 BI",
    logo: Zap,
    color: "rose",
    features: {
      industry_specific: "pos_only",
      pos_multi_connect: false,
      ai_native: false,
      pilot_in_8_weeks: true,
      no_replacement: true,
      jpn_labor_law: false,
      haccp_built_in: false,
      fc_royalty: false,
      huff_model: false,
      writeback_to_pos: true,
      dedicated_vpc: false,
      monthly_value_proof: false,
      learning_curve: "1 day",
      annual_cost: "¥3-10M",
      time_to_value: "1ヶ月",
    },
    why_not: [
      "単一 POS のみ対応、複数 POS 統合不可（ゼンショーは Smaregi 以外も使用）",
      "売上 KPI のみ、勤怠 / 物流 / FC 統合不可",
      "AI なし、経営層向け機能なし",
      "中小チェーン向け、年商1000億超では不適",
    ],
  },
]

const featureLabels: Record<string, { label: string; icon: any }> = {
  industry_specific: { label: "外食特化機能", icon: Building2 },
  pos_multi_connect: { label: "複数 POS 統合", icon: Database },
  ai_native: { label: "AI Native", icon: Cpu },
  pilot_in_8_weeks: { label: "8週POC可能", icon: Zap },
  no_replacement: { label: "既存システム非置換", icon: Shield },
  jpn_labor_law: { label: "日本労働基準法対応", icon: Users },
  haccp_built_in: { label: "HACCP 標準対応", icon: Shield },
  fc_royalty: { label: "FC ロイヤリティ計算", icon: Building2 },
  huff_model: { label: "商圏 Huff モデル", icon: Globe },
  writeback_to_pos: { label: "書き戻し対応", icon: Database },
  dedicated_vpc: { label: "専用 VPC", icon: Shield },
  monthly_value_proof: { label: "月次 ROI 証明", icon: Zap },
}

function renderFeature(v: any) {
  if (v === true) return <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
  if (v === false) return <XCircle className="w-4 h-4 text-white/20 mx-auto" />
  if (typeof v === "string") return <span className="text-[10px] text-amber-400">{v}</span>
  return null
}

export default function AboutPage() {
  return (
    <div className="flex flex-col h-screen">
      <ContextHeader title="AENTRO の位置づけ" description="競合比較 + AENTRO ならではの価値" region="-" />
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Hero positioning */}
        <div className="rounded-xl border border-blue-400/20 bg-gradient-to-br from-blue-500/[0.08] via-blue-500/[0.03] to-transparent p-6">
          <div className="text-[11px] text-blue-400/80 tracking-wider uppercase font-bold mb-2">AENTRO とは何か（一行）</div>
          <h2 className="text-[20px] sm:text-[24px] font-semibold text-white/95 leading-snug">
            既存システムを置き換えず、1 ブランド・1 テーマから 8 週間で <span className="text-emerald-400">収益改善を円換算で証明する</span> 外食特化 AI 経営レイヤー
          </h2>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded bg-white/[0.04] p-3">
              <div className="text-[10px] text-white/40 uppercase">競合との差</div>
              <div className="mt-1 text-[14px] text-blue-400">外食特化 × AI Native</div>
            </div>
            <div className="rounded bg-white/[0.04] p-3">
              <div className="text-[10px] text-white/40 uppercase">価値証明スピード</div>
              <div className="mt-1 text-[14px] text-emerald-400">8 週間</div>
            </div>
            <div className="rounded bg-white/[0.04] p-3">
              <div className="text-[10px] text-white/40 uppercase">既存システム影響</div>
              <div className="mt-1 text-[14px] text-amber-400">非置換 / overlay</div>
            </div>
          </div>
        </div>

        {/* Comparison table */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.06]">
            <span className="text-[12px] font-semibold text-white/60 tracking-wide uppercase">機能比較表</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="border-b border-white/[0.06]">
                <tr>
                  <th className="text-left px-4 py-3 text-white/40 font-medium sticky left-0 bg-[#0a0e14]">機能</th>
                  {competitors.map((c) => {
                    const Logo = c.logo
                    return (
                      <th key={c.id} className={`px-3 py-3 text-center min-w-[140px] ${c.id === "aentro" ? "bg-blue-500/[0.06]" : ""}`}>
                        <div className="flex flex-col items-center gap-1">
                          <Logo className={`w-5 h-5 text-${c.color}-400`} />
                          <span className={`text-[11px] ${c.id === "aentro" ? "text-blue-400 font-semibold" : "text-white/60"}`}>{c.name}</span>
                          <span className="text-[9px] text-white/30">{c.sub}</span>
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {Object.entries(featureLabels).map(([key, { label, icon: FIcon }]) => (
                  <tr key={key} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-white/75 sticky left-0 bg-[#0a0e14]">
                      <div className="flex items-center gap-2">
                        <FIcon className="w-3.5 h-3.5 text-white/40" />
                        {label}
                      </div>
                    </td>
                    {competitors.map((c) => (
                      <td key={c.id} className={`px-3 py-2.5 text-center ${c.id === "aentro" ? "bg-blue-500/[0.04]" : ""}`}>
                        {renderFeature((c.features as any)[key])}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-b border-white/[0.03]">
                  <td className="px-4 py-2.5 text-white/75 sticky left-0 bg-[#0a0e14]">学習コスト</td>
                  {competitors.map((c) => (
                    <td key={c.id} className={`px-3 py-2.5 text-center text-[11px] ${c.id === "aentro" ? "bg-blue-500/[0.04] text-blue-400" : "text-white/55"}`}>
                      {c.features.learning_curve}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-white/[0.03]">
                  <td className="px-4 py-2.5 text-white/75 sticky left-0 bg-[#0a0e14]">価値創出までの期間</td>
                  {competitors.map((c) => (
                    <td key={c.id} className={`px-3 py-2.5 text-center text-[11px] ${c.id === "aentro" ? "bg-blue-500/[0.04] text-emerald-400 font-mono" : "text-white/55"}`}>
                      {c.features.time_to_value}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-white/75 sticky left-0 bg-[#0a0e14]">想定年間コスト</td>
                  {competitors.map((c) => (
                    <td key={c.id} className={`px-3 py-2.5 text-center text-[11px] font-mono ${c.id === "aentro" ? "bg-blue-500/[0.04] text-amber-400" : "text-white/55"}`}>
                      {c.features.annual_cost}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Why AENTRO + Why not others */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/[0.04] p-5">
            <h3 className="text-[12px] font-semibold text-emerald-400 tracking-wide uppercase mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> なぜ AENTRO か
            </h3>
            <ul className="space-y-2 text-[13px] text-white/85 leading-relaxed">
              {competitors[0].why_us!.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-emerald-400 mt-0.5">▸</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
            <h3 className="text-[12px] font-semibold text-white/60 tracking-wide uppercase mb-3 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-white/40" /> 他社では届かない理由
            </h3>
            <div className="space-y-3 text-[12px]">
              {competitors.slice(1).map((c) => (
                <div key={c.id}>
                  <div className="text-[12px] text-white/70 font-medium">{c.name}</div>
                  <ul className="mt-1 space-y-1 text-white/55">
                    {c.why_not!.map((r, i) => (
                      <li key={i} className="flex gap-2 text-[11px]">
                        <span className="text-white/30">·</span><span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Position statement */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-6">
          <h3 className="text-[12px] font-semibold text-white/60 tracking-wide uppercase mb-3">AENTRO のポジション</h3>
          <p className="text-[14px] text-white/85 leading-relaxed">
            AENTRO は <strong>既存システムを置き換えるソリューション</strong>ではありません。
            POS（スマレジ / Air レジ / 自社）、勤怠（KING OF TIME 等）、物流、会計 — これらすべてを <strong>read-only で接続</strong>し、
            <strong>外食業界の経営判断に必要な KPI・効果計測・AI 提案</strong>を上位レイヤーとして提供します。
          </p>
          <p className="mt-3 text-[14px] text-white/85 leading-relaxed">
            既存 IT 部門の役割を奪わず、むしろ <span className="text-blue-400">既存システムから引き出せる経営価値を最大化する加速装置</span>として機能します。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/demo-tour" className="px-4 py-2 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-[13px]">
              28秒のデモを見る →
            </Link>
            <Link href="/zensho-pilot" className="px-4 py-2 rounded bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-[13px]">
              POC を起動する →
            </Link>
            <Link href="/admin/security" className="px-4 py-2 rounded bg-white/[0.04] hover:bg-white/[0.08] text-white/70 text-[13px]">
              Security Review Pack →
            </Link>
          </div>
        </div>

        <footer className="text-center text-[10px] text-white/30 pt-2 pb-6">
          競合情報は公開資料および業界一般の理解に基づく。実際の機能は各社最新版で要確認。
        </footer>
      </div>
    </div>
  )
}
