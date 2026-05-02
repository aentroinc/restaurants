"use client"

import { useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import {
  Bot, ChevronRight, ChevronDown, Shield, Clock, User,
  PanelRightClose, PanelRightOpen, Sparkles,
} from "lucide-react"

export interface AIInsight {
  id: string
  finding: string
  evidence: string[]
  recommended_action: string
  expected_impact: string
  confidence: "High" | "Medium" | "Low"
  requires_approval: boolean
  generated_at: string
}

const confidenceColor: Record<AIInsight["confidence"], string> = {
  High: "text-emerald-400 bg-emerald-400/10",
  Medium: "text-amber-400 bg-amber-400/10",
  Low: "text-red-400 bg-red-400/10",
}

const confidenceLabel: Record<AIInsight["confidence"], string> = {
  High: "高",
  Medium: "中",
  Low: "低",
}

// =====================================================================
// Route-keyed insight library
// =====================================================================
const INSIGHTS: Record<string, AIInsight[]> = {
  "/": [
    {
      id: "cmd-1",
      finding: "首都圏駅前15店舗でランチ帯客数が予測比+18%。牛バラの欠品リスクが明日午後に上昇。",
      evidence: [
        "POS実績：12:00-13:30の客数が予測+18.4%（n=15店舗）",
        "在庫API：牛バラ末端在庫 平均1.2日分（安全閾値1.8日）",
        "気象：明日も晴天28℃、需要継続シナリオが有力",
      ],
      recommended_action: "工場発注を+12%補正、関西DCから首都圏DCへ300kg横持ち。",
      expected_impact: "欠品店舗数 8 → 0、機会損失 ¥2.4M 回避",
      confidence: "High",
      requires_approval: true,
      generated_at: "2026-05-02 09:14",
    },
    {
      id: "cmd-2",
      finding: "関西エリア配送便で平均42分の遅延。神戸DC発7ルートが影響。",
      evidence: [
        "GPS実績：阪神高速で事故、迂回ルート所要+38分",
        "過去3回の同パターンで欠品率+11pp",
      ],
      recommended_action: "代替DC（大阪南）から優先補充を発動、対象12店舗にプッシュ通知。",
      expected_impact: "欠品リスク -65%、店舗SVへの問合せ -40件",
      confidence: "High",
      requires_approval: true,
      generated_at: "2026-05-02 09:02",
    },
    {
      id: "cmd-3",
      finding: "Q1改装した9店舗で客単価リフト+8.4%、ROI想定比+1.7pp。",
      evidence: [
        "改装前後12週比較、客単価+¥42、客数横ばい",
        "改装メニュー比率がディナー帯で+19%",
      ],
      recommended_action: "改装ROIモデルを更新し、Q3候補リストの優先度を再評価。",
      expected_impact: "Q3改装候補上位入替 6件、年換算リフト ¥38M",
      confidence: "Medium",
      requires_approval: false,
      generated_at: "2026-05-02 08:30",
    },
  ],
  "/stores": [
    {
      id: "stores-1",
      finding: "渋谷宮益坂店の健全度スコアが先週から-14pt、要注意ランク入り。",
      evidence: [
        "客数 -7.8% / 客単価 -3.2% / 廃棄率 +2.1pp（同立地比較）",
        "アルバイト充足率 78%（基準90%）",
      ],
      recommended_action: "SVを今週中に派遣、シフト再設計＋廃棄分析を実行。",
      expected_impact: "健全度 +9pt 想定、月次粗利 +¥820K",
      confidence: "High",
      requires_approval: true,
      generated_at: "2026-05-02 08:55",
    },
    {
      id: "stores-2",
      finding: "上位10店舗の共通要因：朝9時の発注締め時間遵守率が95%以上。",
      evidence: [
        "発注締め時間遵守と粗利率の相関 r=0.62",
        "下位店舗群の遵守率は平均71%",
      ],
      recommended_action: "下位30店舗にベストプラクティス研修配信、SOP更新。",
      expected_impact: "下位群の粗利率 +0.8pp、年換算 ¥120M",
      confidence: "Medium",
      requires_approval: false,
      generated_at: "2026-05-02 08:10",
    },
  ],
  "/supply-chain": [
    {
      id: "supply-1",
      finding: "関東第2工場の稼働率94%、ボトルネック化の兆候。",
      evidence: [
        "直近4週で稼働率 +6pp、品質不良率 +0.4pp",
        "GW明けの需要ピークに対しキャパ-8%",
      ],
      recommended_action: "東北第1工場からの応援生産を週末2日分振替。",
      expected_impact: "稼働率 86%へ低減、品質不良 -0.5pp",
      confidence: "High",
      requires_approval: true,
      generated_at: "2026-05-02 09:08",
    },
    {
      id: "supply-2",
      finding: "DC→店舗便で1便あたりの積載率が71%、目標85%に未達。",
      evidence: [
        "ルート最適化未適用便 33ルート",
        "深夜便集約で削減可能距離 1,240km/週",
      ],
      recommended_action: "最適化アルゴリズムを夜間便で先行適用。",
      expected_impact: "輸送コスト -7.2%、年換算 ¥58M",
      confidence: "Medium",
      requires_approval: true,
      generated_at: "2026-05-02 07:45",
    },
  ],
  "/demand": [
    {
      id: "demand-1",
      finding: "牛バラ欠品確率が明日午後 32%、首都圏15店舗で同時発生リスク。",
      evidence: [
        "現在在庫 1.2日 / 安全水準 1.8日",
        "明日の予測需要 +18%、輸入便は明後日朝着",
      ],
      recommended_action: "代替部位（牛モモ）への切替プランを店舗POSへ事前配布。",
      expected_impact: "欠品店舗 8 → 1、機会損失 ¥2.4M 回避",
      confidence: "High",
      requires_approval: true,
      generated_at: "2026-05-02 09:12",
    },
    {
      id: "demand-2",
      finding: "揚げ油廃棄量が前月比+11%。郊外ロードサイド店で顕著。",
      evidence: [
        "対象47店舗で平均寿命 4.2日（基準5.0日）",
        "フライヤー温度ログのばらつき σ=8.4℃",
      ],
      recommended_action: "温度SOP再徹底＋フライヤー予防保全を6月1日までに実施。",
      expected_impact: "廃棄量 -18%、月次コスト -¥1.6M",
      confidence: "Medium",
      requires_approval: false,
      generated_at: "2026-05-02 08:20",
    },
  ],
  "/expansion": [
    {
      id: "exp-1",
      finding: "横浜みなとみらい候補地のスコアが92点、上位3に浮上。",
      evidence: [
        "想定MAU 12.4万、競合密度 0.32（基準0.45以下）",
        "賃料率 8.4%（基準10%以下）",
      ],
      recommended_action: "1次審査通過、現地調査チームを来週派遣。",
      expected_impact: "出店時年商 ¥420M、回収期間 2.8年",
      confidence: "High",
      requires_approval: true,
      generated_at: "2026-05-02 08:48",
    },
    {
      id: "exp-2",
      finding: "Q1改装9店舗の平均ROIが想定+1.7pp、改装パッケージBが最高効率。",
      evidence: [
        "パッケージB（厨房動線改修）の客単価リフト +9.6%",
        "投資額あたりリフト ¥3.4 / ¥1（業界平均¥2.1）",
      ],
      recommended_action: "Q3改装30店舗のうち18店舗をパッケージBへ振替。",
      expected_impact: "年換算リフト +¥48M",
      confidence: "Medium",
      requires_approval: false,
      generated_at: "2026-05-02 07:55",
    },
  ],
  "/campaigns": [
    {
      id: "camp-1",
      finding: "春の創業祭キャンペーン、関西エリアでリフト+22%、首都圏は+9%にとどまる。",
      evidence: [
        "クーポン消化率 関西58% vs 首都圏31%",
        "認知度サーベイ 関西74% vs 首都圏52%",
      ],
      recommended_action: "首都圏向けに第2波プッシュ広告を5/10から投下。",
      expected_impact: "首都圏リフト +6pp、追加売上 ¥18M",
      confidence: "Medium",
      requires_approval: true,
      generated_at: "2026-05-02 08:35",
    },
    {
      id: "camp-2",
      finding: "新メニュー「黒豚生姜焼定食」のクロスセル率が35%、想定の1.7倍。",
      evidence: [
        "サイドオーダー同時購買 35%（ベース20%）",
        "リピート率2回目購買 28%（業界15%）",
      ],
      recommended_action: "夏季グランドメニュー昇格を提案、6月会議で承認。",
      expected_impact: "下半期売上 +¥210M",
      confidence: "High",
      requires_approval: false,
      generated_at: "2026-05-02 08:00",
    },
  ],
  "/incidents": [
    {
      id: "inc-1",
      finding: "未承認アクションが12件、SLA超過2件あり。優先処理推奨。",
      evidence: [
        "P0インシデント：池袋東口店 設備故障 経過4時間",
        "P1インシデント：関西配送遅延 経過2.5時間",
      ],
      recommended_action: "SLA超過2件を緊急エスカレーション、運用部長へ通知。",
      expected_impact: "対応時間 -45%、二次被害回避",
      confidence: "High",
      requires_approval: true,
      generated_at: "2026-05-02 09:20",
    },
    {
      id: "inc-2",
      finding: "過去30日で「設備故障」カテゴリが+38%、特に冷蔵設備に集中。",
      evidence: [
        "件数推移 21→29件、うち冷蔵 14件（48%）",
        "築15年以上店舗で発生率2.4倍",
      ],
      recommended_action: "築15年以上125店舗の冷蔵設備予防保全を前倒し実施。",
      expected_impact: "故障件数 -55%、機会損失回避 ¥18M/年",
      confidence: "Medium",
      requires_approval: true,
      generated_at: "2026-05-02 07:40",
    },
  ],
  "/admin/ontology": [
    {
      id: "ont-1",
      finding: "「牛バラ」エンティティを変更すると、4つのKPI・12のダッシュボード・3つのモデルに影響。",
      evidence: [
        "依存KPI：欠品率 / 廃棄率 / 粗利率 / 在庫日数",
        "依存モデル：需要予測v3.2 / 発注最適化v1.8 / メニュー寄与度v2.0",
      ],
      recommended_action: "スキーマ変更前にステージング環境で影響シミュレーションを実行。",
      expected_impact: "本番障害リスク -90%",
      confidence: "High",
      requires_approval: false,
      generated_at: "2026-05-02 08:25",
    },
    {
      id: "ont-2",
      finding: "「店舗」と「商圏」の関連付けが12店舗で未定義。系譜が切れています。",
      evidence: [
        "対象店舗：札幌、仙台、福岡、那覇 ほか8店舗",
        "出店分析・キャンペーン分析の精度に影響",
      ],
      recommended_action: "GISチームへエスカレーション、5/15までに登録完了。",
      expected_impact: "分析網羅率 88% → 100%",
      confidence: "Medium",
      requires_approval: false,
      generated_at: "2026-05-02 07:30",
    },
  ],
  "/admin/ontology/graph": [
    {
      id: "ont-graph-1",
      finding: "「店舗」と「商圏」の関連付けが12店舗で未定義。グラフが切れています。",
      evidence: [
        "対象店舗：札幌、仙台、福岡、那覇 ほか8店舗",
        "出店分析・キャンペーン分析の精度に影響",
      ],
      recommended_action: "GISチームへエスカレーション、5/15までに登録完了。",
      expected_impact: "分析網羅率 88% → 100%",
      confidence: "Medium",
      requires_approval: false,
      generated_at: "2026-05-02 07:30",
    },
    {
      id: "ont-graph-2",
      finding: "「メニュー」エンティティのハブ集中度が高い。変更影響が広範に及ぶリスク。",
      evidence: [
        "メニュー → KPI: 8本 / モデル: 5本 / ダッシュボード: 14本",
        "1ヶ月で3回スキーマ更新、ダウンストリーム障害2件",
      ],
      recommended_action: "メニュー関連はバージョニング必須、変更レビュー会を週次化。",
      expected_impact: "障害発生率 -70%",
      confidence: "Medium",
      requires_approval: false,
      generated_at: "2026-05-02 06:50",
    },
  ],
  "/tasks": [
    {
      id: "tasks-1",
      finding: "未着手タスクが22件、優先度Highが7件。SVへの再配分を推奨。",
      evidence: [
        "高優先度の平均経過時間 31時間（SLA24h）",
        "担当者上位3名に集中 67%",
      ],
      recommended_action: "ロードバランシングをAIに委任、3名分を5名へ自動再配分。",
      expected_impact: "完了率 +28pp、SLA達成率 76% → 94%",
      confidence: "Medium",
      requires_approval: true,
      generated_at: "2026-05-02 08:40",
    },
  ],
  "/sv-missions": [
    {
      id: "sv-1",
      finding: "今週SVミッションのうち、3件が同一エリアに集中。一括巡回が効率的。",
      evidence: [
        "渋谷・原宿・新宿エリアで合計3件のミッション",
        "個別巡回比でSV移動時間 -42%",
      ],
      recommended_action: "ミッションを1日に統合し、5/8木曜にバッチ実行。",
      expected_impact: "SV稼働 -3.2h、巡回密度 +30%",
      confidence: "High",
      requires_approval: false,
      generated_at: "2026-05-02 07:20",
    },
  ],
  "/meeting-packs": [
    {
      id: "mp-1",
      finding: "5月度経営会議パックは18セクション中、3セクションが未更新（先月時点データ）。",
      evidence: [
        "未更新：海外事業 / 人事 / DX投資ROI",
        "会議は5/9金曜10:00予定",
      ],
      recommended_action: "担当部署へ更新依頼を5/6午前までに送付。",
      expected_impact: "資料完成度 83% → 100%",
      confidence: "High",
      requires_approval: false,
      generated_at: "2026-05-02 08:05",
    },
  ],
  "/data-quality": [
    {
      id: "dq-1",
      finding: "POSデータの欠損率が0.42%、過去30日のベースライン0.18%から悪化。",
      evidence: [
        "欠損集中：5/1 02:00-04:00 / 一部店舗のみ",
        "原因候補：マスタ同期ジョブの失敗、再実行ログ要確認",
      ],
      recommended_action: "ETLチームへエスカレーション、当日夜のジョブ再走で復旧。",
      expected_impact: "下流KPIの精度回復、再計算範囲 1日分",
      confidence: "Medium",
      requires_approval: false,
      generated_at: "2026-05-02 09:00",
    },
  ],
  "/value-realization": [
    {
      id: "vr-1",
      finding: "Q1施策17件のうち、3件が想定効果未達（達成率<50%）。",
      evidence: [
        "未達施策：シフト最適化A / クロスセルB / 廃棄削減C",
        "共通要因：店舗オペレーション浸透の遅れ",
      ],
      recommended_action: "未達3施策に対しSV重点フォローを5/12週から実施。",
      expected_impact: "達成率 47% → 78%、効果額 +¥34M",
      confidence: "Medium",
      requires_approval: true,
      generated_at: "2026-05-02 07:50",
    },
  ],
  "/ai-analyst": [
    {
      id: "aia-1",
      finding: "今週のクエリ上位は「廃棄率の地域差」「改装ROIの店舗特性」。共通テーマ：単位経済性。",
      evidence: [
        "ユニーククエリ 142件、上位2テーマで38%",
        "経営会議でのトピック頻出度と相関",
      ],
      recommended_action: "単位経済性ダッシュボードをワンクリック化し、ホームに昇格。",
      expected_impact: "経営層の到達時間 -65%",
      confidence: "Medium",
      requires_approval: false,
      generated_at: "2026-05-02 08:15",
    },
  ],
}

// Resolve insights for the current route, falling back to dashboard.
function getAIInsightsByRoute(pathname: string): AIInsight[] {
  if (INSIGHTS[pathname]) return INSIGHTS[pathname]
  // Try matching by longest prefix
  const sorted = Object.keys(INSIGHTS).sort((a, b) => b.length - a.length)
  for (const key of sorted) {
    if (key !== "/" && pathname.startsWith(key)) return INSIGHTS[key]
  }
  return INSIGHTS["/"]
}

// =====================================================================
// Component
// =====================================================================
export function AIPanel() {
  const pathname = usePathname() || "/"
  const insights = useMemo(() => getAIInsightsByRoute(pathname), [pathname])

  const [collapsed, setCollapsed] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(insights[0]?.id ?? null)
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set())
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set())

  const handleApprove = (id: string) => {
    setApprovedIds((prev) => new Set(prev).add(id))
  }
  const handleReject = (id: string) => {
    setRejectedIds((prev) => new Set(prev).add(id))
  }

  if (collapsed) {
    return (
      <div
        className="w-3 shrink-0 border-l border-white/[0.06] bg-[#080c12] hover:bg-white/[0.04] cursor-pointer flex items-start justify-center pt-4 transition-colors"
        onClick={() => setCollapsed(false)}
        title="AI パネルを開く"
      >
        <PanelRightOpen className="w-3 h-3 text-blue-400" />
      </div>
    )
  }

  return (
    <aside className="w-80 shrink-0 border-l border-white/[0.06] bg-[#080c12] flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-white/[0.06] shrink-0">
        <Bot className="w-4 h-4 text-blue-400" />
        <span className="text-[11px] font-bold tracking-[0.10em] text-white/70 uppercase">
          AI アシスタント
        </span>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono">
          {insights.length}
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="text-white/30 hover:text-white/70 transition-colors"
          title="折り畳む"
        >
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>

      {/* Insights */}
      <div className="flex-1 overflow-y-auto">
        {insights.map((insight) => {
          const expanded = expandedId === insight.id
          const isApproved = approvedIds.has(insight.id)
          const isRejected = rejectedIds.has(insight.id)
          return (
            <div key={insight.id} className="border-b border-white/[0.04]">
              <button
                onClick={() => setExpandedId(expanded ? null : insight.id)}
                className="w-full flex items-start gap-2.5 px-4 py-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                {expanded ? (
                  <ChevronDown className="w-4 h-4 text-white/30 mt-0.5 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-white/30 mt-0.5 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-white/80 leading-relaxed">{insight.finding}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-medium ${confidenceColor[insight.confidence]}`}
                    >
                      信頼度: {confidenceLabel[insight.confidence]}
                    </span>
                    {insight.requires_approval && !isApproved && !isRejected && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">
                        要承認
                      </span>
                    )}
                    {isApproved && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                        承認済
                      </span>
                    )}
                    {isRejected && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400">
                        却下済
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {expanded && (
                <div className="px-4 pb-4 pl-10 space-y-3 animate-fade-in">
                  <div>
                    <div className="text-[10px] font-bold tracking-[0.10em] text-white/30 uppercase mb-1.5">
                      根拠データ
                    </div>
                    <ul className="space-y-1.5">
                      {insight.evidence.map((e, i) => (
                        <li
                          key={i}
                          className="text-[12px] text-white/50 flex items-start gap-2 leading-relaxed"
                        >
                          <span className="text-blue-400/60 mt-0.5 shrink-0">-</span>
                          {e}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold tracking-[0.10em] text-white/30 uppercase mb-1.5">
                      推奨アクション
                    </div>
                    <p className="text-[12px] text-white/60 leading-relaxed">
                      {insight.recommended_action}
                    </p>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold tracking-[0.10em] text-white/30 uppercase mb-1.5">
                      期待効果
                    </div>
                    <p className="text-[13px] text-emerald-400/80 font-medium">
                      {insight.expected_impact}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-white/30 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {insight.generated_at}
                    </span>
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      {confidenceLabel[insight.confidence]}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {insight.requires_approval ? "人間承認" : "自動"}
                    </span>
                  </div>

                  {insight.requires_approval && !isApproved && !isRejected && (
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleApprove(insight.id)}
                        className="flex-1 text-[12px] font-semibold py-2 rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 active:scale-[0.97] transition-all"
                      >
                        承認する
                      </button>
                      <button
                        onClick={() => handleReject(insight.id)}
                        className="flex-1 text-[12px] font-semibold py-2 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-[0.97] transition-all"
                      >
                        却下する
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2 text-[10px] text-white/30">
          <Sparkles className="w-3 h-3 text-blue-400/60" />
          <span className="tracking-[0.06em]">Generated by AI Analyst v2.4</span>
        </div>
        <div className="mt-1 text-[9px] text-white/20">
          Foundry-style ontology / illustrative only
        </div>
      </div>
    </aside>
  )
}

export { getAIInsightsByRoute }
