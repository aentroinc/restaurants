"use client"

import { useMemo, useState } from "react"
import { ContextHeader } from "@/components/context-header"
import { ScenarioComparison } from "@/components/scenario-comparison"
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
  Shield,
  Activity,
  TrendingUp,
  Store as StoreIcon,
  Truck,
  Package,
  Factory,
  ChevronRight,
  FileText,
} from "lucide-react"

// ---- deterministic RNG ----
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}
const rng = seededRandom(42)
const rand = (min: number, max: number) => Math.round((rng() * (max - min) + min) * 100) / 100

// ---- types ----
type Severity = "critical" | "high" | "medium" | "low"
type IncidentStatus = "active" | "mitigating" | "resolved"
type ActionStatus = "pending" | "approved" | "rejected" | "in-progress" | "completed"
type Confidence = "High" | "Medium" | "Low"

interface AuditEntry {
  ts: string
  actor: string
  action: string
}

interface RecAction {
  action_id: string
  title: string
  owner_role: string
  due_date: string
  status: ActionStatus
  expected_impact: string
  confidence: Confidence
  requires_approval: boolean
  audit_log: AuditEntry[]
}

interface Scenario {
  id: string
  name: string
  description: string
  pros: string[]
  cons: string[]
  expected_impact: { metric: string; value: string | number; unit?: string }[]
  confidence: Confidence
  risk: "Low" | "Medium" | "High"
  recommended?: boolean
}

interface Incident {
  incident_id: string
  type: string
  title: string
  summary: string
  severity: Severity
  status: IncidentStatus
  detected_at: string
  impacted_stores: number
  impacted_skus: number
  impacted_routes: number
  impacted_factories: number
  scenarios: Scenario[]
  actions: RecAction[]
}

// ---- mock incidents ----
const incidents: Incident[] = [
  {
    incident_id: "INC-001",
    type: "stockout-risk",
    title: "牛バラSKU 翌日15時に23店舗で欠品予測",
    summary:
      "SKU-001(牛バラ)が需要急増と定期発注ギャップにより、明日15:00時点で23店舗にて在庫切れ予測。首都圏駅前の影響大。",
    severity: "critical",
    status: "active",
    detected_at: "2026-05-01T09:45",
    impacted_stores: 23,
    impacted_skus: 3,
    impacted_routes: 4,
    impacted_factories: 2,
    scenarios: [
      {
        id: "S1",
        name: "案A: 朝便で前倒し補充",
        description: "既存ルートに増便を組み込み、明日04:00までに対象店舗へ補充",
        pros: ["既存ルートを使うため運用コストが低い", "明日早朝までに到着可能"],
        cons: ["午後発注に乗らないSKUが残る", "DC側ピッキング負荷+18%"],
        expected_impact: [
          { metric: "欠品店舗", value: "23→4", unit: "店" },
          { metric: "機会損失回避", value: "3.2", unit: "M¥" },
        ],
        confidence: "High",
        risk: "Low",
        recommended: true,
      },
      {
        id: "S2",
        name: "案B: 券売機推奨を代替メニューへ切替",
        description: "都心15店舗の券売機表示順を即時変更し、別SKUへ需要を誘導",
        pros: ["即時実施可能", "原価変動なし"],
        cons: ["客単価 -¥18 (推定)", "クレームリスク中"],
        expected_impact: [
          { metric: "欠品店舗", value: "23→11", unit: "店" },
          { metric: "売上影響", value: -1.8, unit: "%" },
        ],
        confidence: "Medium",
        risk: "Medium",
      },
      {
        id: "S3",
        name: "案C: 嵐山工場で追加生産ライン稼働",
        description: "嵐山工場で深夜時間帯に追加ラインを稼働させて増産",
        pros: ["完全に欠品回避", "他SKUも増産可能"],
        cons: ["残業コスト +¥850K", "人員手配が深夜まで必要"],
        expected_impact: [
          { metric: "欠品店舗", value: "23→0", unit: "店" },
          { metric: "原価率", value: "+0.4", unit: "pt" },
        ],
        confidence: "High",
        risk: "Medium",
      },
    ],
    actions: [
      {
        action_id: "ACT-001",
        title: "朝便で牛バラ+12ケースを対象23店舗へ前倒し補充",
        owner_role: "物流担当 / 佐藤",
        due_date: "2026-05-02T04:00",
        status: "pending",
        expected_impact: "欠品23店舗 → 4店舗",
        confidence: "High",
        requires_approval: true,
        audit_log: [{ ts: "2026-05-01T10:00", actor: "AI Engine", action: "対応案を生成" }],
      },
      {
        action_id: "ACT-002",
        title: "都心15店舗の券売機推奨表示を牛めし→カルビ焼肉に変更",
        owner_role: "商品部 / 田中",
        due_date: "2026-05-01T16:00",
        status: "pending",
        expected_impact: "欠品23店舗 → 11店舗",
        confidence: "Medium",
        requires_approval: true,
        audit_log: [{ ts: "2026-05-01T10:00", actor: "AI Engine", action: "対応案を生成" }],
      },
      {
        action_id: "ACT-003",
        title: "嵐山工場で牛バラ追加生産ライン稼働",
        owner_role: "工場長 / 鈴木",
        due_date: "2026-05-01T22:00",
        status: "pending",
        expected_impact: "欠品23店舗 → 0店舗",
        confidence: "High",
        requires_approval: true,
        audit_log: [{ ts: "2026-05-01T10:00", actor: "AI Engine", action: "対応案を生成" }],
      },
    ],
  },
  {
    incident_id: "INC-002",
    type: "demand-surge",
    title: "首都圏駅前ランチ需要 予測比+18%",
    summary:
      "新宿・渋谷・池袋エリアの駅前店舗で 11:30-13:30 客数が予測比 +18%。近隣オフィス復帰率上昇が主因と推定。",
    severity: "high",
    status: "mitigating",
    detected_at: "2026-05-01T10:15",
    impacted_stores: 15,
    impacted_skus: 3,
    impacted_routes: 3,
    impacted_factories: 0,
    scenarios: [
      {
        id: "S1",
        name: "案A: 緊急出荷で食材追加",
        description: "川島DCから緊急便を出して当日ランチ前に納品",
        pros: ["欠品リスク回避", "売上機会を取り切れる"],
        cons: ["緊急便コスト +¥420K"],
        expected_impact: [
          { metric: "ランチ売上", value: "+1.8", unit: "M¥" },
          { metric: "提供時間", value: "+0.4", unit: "分" },
        ],
        confidence: "High",
        risk: "Low",
        recommended: true,
      },
      {
        id: "S2",
        name: "案B: 受注制限で品質維持",
        description: "ピーク時のオーダー数を意図的に絞って提供品質を保つ",
        pros: ["オペレーション安定"],
        cons: ["売上機会損失", "顧客満足度低下"],
        expected_impact: [
          { metric: "売上影響", value: "-0.6", unit: "M¥" },
          { metric: "提供時間", value: "-0.2", unit: "分" },
        ],
        confidence: "Medium",
        risk: "High",
      },
      {
        id: "S3",
        name: "案C: 近隣店舗からヘルプ要員",
        description: "余裕のある近隣店舗から要員を移動して回転率改善",
        pros: ["コスト最小", "迅速対応"],
        cons: ["ヘルプ元店舗の負荷"],
        expected_impact: [
          { metric: "提供時間", value: "-1.2", unit: "分" },
          { metric: "売上獲得", value: "+1.2", unit: "M¥" },
        ],
        confidence: "High",
        risk: "Low",
      },
    ],
    actions: [
      {
        action_id: "ACT-006",
        title: "新宿南口・渋谷3店舗のランチ帯追加食材を川島DCから緊急出荷",
        owner_role: "SCM / 伊藤",
        due_date: "2026-05-01T11:00",
        status: "in-progress",
        expected_impact: "ランチ帯欠品回避",
        confidence: "High",
        requires_approval: true,
        audit_log: [
          { ts: "2026-05-01T10:20", actor: "AI Engine", action: "対応案を生成" },
          { ts: "2026-05-01T10:28", actor: "伊藤(SCM)", action: "承認" },
          { ts: "2026-05-01T10:30", actor: "System", action: "出荷指示を発行" },
        ],
      },
    ],
  },
  {
    incident_id: "INC-003",
    type: "weather-delay",
    title: "関西配送遅延リスク (強雨予報)",
    summary:
      "本日午後から関西地方で強雨予報。六甲センターからの午後便に30-90分の遅延リスク。",
    severity: "medium",
    status: "active",
    detected_at: "2026-05-01T08:30",
    impacted_stores: 8,
    impacted_skus: 0,
    impacted_routes: 3,
    impacted_factories: 1,
    scenarios: [
      {
        id: "S1",
        name: "案A: 午前便を増便",
        description: "午後便分のSKUを午前のうちに前倒しで配送",
        pros: ["遅延前に納品完了", "確実性が高い"],
        cons: ["車両手配コスト +¥180K"],
        expected_impact: [{ metric: "遅延", value: "90→15", unit: "分" }],
        confidence: "High",
        risk: "Low",
        recommended: true,
      },
      {
        id: "S2",
        name: "案B: 別DCルートに切替",
        description: "六甲DCから大阪DC経由のルートに振替",
        pros: ["コスト追加なし"],
        cons: ["大阪DC積載率 92%超で空きが少ない"],
        expected_impact: [{ metric: "遅延", value: "90→30", unit: "分" }],
        confidence: "Medium",
        risk: "Medium",
      },
      {
        id: "S3",
        name: "案C: そのまま様子見",
        description: "現行スケジュールのまま実行",
        pros: ["対応コストゼロ"],
        cons: ["夕方欠品リスク"],
        expected_impact: [{ metric: "遅延", value: "60-90", unit: "分" }],
        confidence: "Low",
        risk: "High",
      },
    ],
    actions: [
      {
        action_id: "ACT-005",
        title: "関西午後便を六甲→大阪DCルートに切替",
        owner_role: "物流担当 / 高橋",
        due_date: "2026-05-01T13:00",
        status: "approved",
        expected_impact: "遅延90分 → 15分",
        confidence: "Medium",
        requires_approval: true,
        audit_log: [
          { ts: "2026-05-01T08:35", actor: "AI Engine", action: "対応案を生成" },
          { ts: "2026-05-01T09:10", actor: "高橋(物流)", action: "承認" },
        ],
      },
    ],
  },
  {
    incident_id: "INC-004",
    type: "staffing-gap",
    title: "夕方ピーク帯人員不足 12店舗",
    summary:
      "18:00-21:00 の必要人員に対して 12 店舗で充足率 80% 未満。提供時間が平均 +2.3 分延長。",
    severity: "high",
    status: "active",
    detected_at: "2026-05-01T16:30",
    impacted_stores: 12,
    impacted_skus: 0,
    impacted_routes: 0,
    impacted_factories: 0,
    scenarios: [
      {
        id: "S1",
        name: "案A: 近隣店舗ヘルプ要員 3名",
        description: "近隣店舗からピーク帯のみ3名移動",
        pros: ["コスト最小", "本日中対応可"],
        cons: ["ヘルプ元店舗の充足率は0.92→0.85へ"],
        expected_impact: [
          { metric: "充足率", value: "80→95", unit: "%" },
          { metric: "提供時間", value: "-1.8", unit: "分" },
        ],
        confidence: "High",
        risk: "Low",
        recommended: true,
      },
      {
        id: "S2",
        name: "案B: スポット人材派遣",
        description: "派遣会社経由でスポット要員を補充",
        pros: ["元店舗影響なし"],
        cons: ["人件費 +¥240K", "スキル不足リスク"],
        expected_impact: [{ metric: "充足率", value: "80→92", unit: "%" }],
        confidence: "Medium",
        risk: "Medium",
      },
      {
        id: "S3",
        name: "案C: 簡易メニューに絞る",
        description: "ピーク帯はSKUを絞って既存人員でオペ簡素化",
        pros: ["既存人員で運用可"],
        cons: ["客単価 -¥120 (推定)"],
        expected_impact: [
          { metric: "客単価", value: "-3.5", unit: "%" },
          { metric: "提供時間", value: "-1.0", unit: "分" },
        ],
        confidence: "Medium",
        risk: "Medium",
      },
    ],
    actions: [
      {
        action_id: "ACT-004",
        title: "18:00-21:00帯に近隣店舗からヘルプ要員を3名配置",
        owner_role: "エリアマネージャー / 山田",
        due_date: "2026-05-01T17:30",
        status: "approved",
        expected_impact: "充足率80% → 95%、提供時間-1.8分",
        confidence: "High",
        requires_approval: false,
        audit_log: [
          { ts: "2026-05-01T16:35", actor: "AI Engine", action: "対応案を生成" },
          { ts: "2026-05-01T16:42", actor: "山田(AM)", action: "承認" },
        ],
      },
    ],
  },
  {
    incident_id: "INC-005",
    type: "event-surge",
    title: "渋谷エリア音楽イベントで客数+35%",
    summary:
      "渋谷エリアで大型音楽イベント開催中。対象3店舗で 14:00-19:00 の客数が通常比 +35%。",
    severity: "medium",
    status: "mitigating",
    detected_at: "2026-05-01T13:00",
    impacted_stores: 3,
    impacted_skus: 3,
    impacted_routes: 1,
    impacted_factories: 0,
    scenarios: [
      {
        id: "S1",
        name: "案A: スポット人員2名追加",
        description: "イベント時間帯にスポット2名を即時配置",
        pros: ["即対応", "顧客体験維持"],
        cons: ["人件費 +¥80K"],
        expected_impact: [{ metric: "提供時間", value: "+2.3→+0.5", unit: "分" }],
        confidence: "High",
        risk: "Low",
        recommended: true,
      },
      {
        id: "S2",
        name: "案B: テイクアウト推奨",
        description: "店内オペを軽くするため販促はテイクアウトに集中",
        pros: ["回転率向上"],
        cons: ["店内売上低下"],
        expected_impact: [
          { metric: "回転率", value: "+18", unit: "%" },
          { metric: "客単価", value: "-40", unit: "¥" },
        ],
        confidence: "Medium",
        risk: "Medium",
      },
      {
        id: "S3",
        name: "案C: 営業時間延長",
        description: "イベント終了後の駆け込み需要に合わせて延長",
        pros: ["売上機会拡大"],
        cons: ["人件費増、クルー疲弊"],
        expected_impact: [{ metric: "売上獲得", value: "+0.42", unit: "M¥" }],
        confidence: "Medium",
        risk: "Medium",
      },
    ],
    actions: [
      {
        action_id: "ACT-007",
        title: "渋谷3店舗のディナー帯にスポット人員2名追加",
        owner_role: "店舗運営部 / 小林",
        due_date: "2026-05-01T16:00",
        status: "pending",
        expected_impact: "提供時間+2.3分 → +0.5分",
        confidence: "Medium",
        requires_approval: true,
        audit_log: [{ ts: "2026-05-01T13:05", actor: "AI Engine", action: "対応案を生成" }],
      },
    ],
  },
  {
    incident_id: "INC-006",
    type: "menu-performance",
    title: "牛めしバーガー 駅前夜帯で構成比2.1%",
    summary:
      "新メニュー牛めしバーガーは RS 昼で +12% だが、駅前店舗の夜帯では構成比 2.1% と低迷。",
    severity: "low",
    status: "active",
    detected_at: "2026-05-01T07:00",
    impacted_stores: 20,
    impacted_skus: 0,
    impacted_routes: 0,
    impacted_factories: 0,
    scenarios: [
      {
        id: "S1",
        name: "案A: 夜帯セットPOPを駅前に追加",
        description: "駅前店舗のディナー帯にセット訴求POPを設置",
        pros: ["低コスト", "即実施可"],
        cons: ["効果限定的"],
        expected_impact: [{ metric: "夜帯構成比", value: "2.1→5.0", unit: "%" }],
        confidence: "Low",
        risk: "Low",
      },
      {
        id: "S2",
        name: "案B: 夜帯限定割引 ¥80OFF",
        description: "ディナー帯のみ限定割引で販促",
        pros: ["客数増加期待"],
        cons: ["粗利低下"],
        expected_impact: [
          { metric: "夜帯構成比", value: "2.1→7.0", unit: "%" },
          { metric: "粗利", value: "-2.1", unit: "pt" },
        ],
        confidence: "Medium",
        risk: "Medium",
        recommended: true,
      },
      {
        id: "S3",
        name: "案C: 駅前夜帯から販売停止",
        description: "駅前ディナー帯はメニューから外して在庫圧縮",
        pros: ["粗利改善"],
        cons: ["新メニュー認知低下"],
        expected_impact: [{ metric: "オペ簡素化", value: "yes" }],
        confidence: "Medium",
        risk: "Low",
      },
    ],
    actions: [
      {
        action_id: "ACT-008",
        title: "駅前店舗の夜帯に牛めしバーガーのセット訴求POP追加",
        owner_role: "商品部 / 渡辺",
        due_date: "2026-05-02T10:00",
        status: "pending",
        expected_impact: "夜帯構成比 2.1% → 5%",
        confidence: "Low",
        requires_approval: false,
        audit_log: [{ ts: "2026-05-01T07:10", actor: "AI Engine", action: "対応案を生成" }],
      },
    ],
  },
  {
    incident_id: "INC-007",
    type: "expansion-constraint",
    title: "出店候補C-014 物流制約",
    summary:
      "候補地C-014は想定売上が高いが、最寄DCからの配送距離が42km。既存ルート追加で積載率98%に到達する。",
    severity: "medium",
    status: "active",
    detected_at: "2026-04-29T10:00",
    impacted_stores: 0,
    impacted_skus: 0,
    impacted_routes: 1,
    impacted_factories: 0,
    scenarios: [
      {
        id: "S1",
        name: "案A: 新規ルート開設",
        description: "新規R-41ルートを開設して候補地を取り込む",
        pros: ["他候補も追加可", "拡張性"],
        cons: ["車両/ドライバー追加コスト ¥6.4M/年"],
        expected_impact: [{ metric: "積載率", value: "98→75", unit: "%" }],
        confidence: "High",
        risk: "Low",
        recommended: true,
      },
      {
        id: "S2",
        name: "案B: 別DCに帰属変更",
        description: "より遠いDCに振替えて既存ルートに乗せる",
        pros: ["コスト最小"],
        cons: ["距離55kmに増加"],
        expected_impact: [
          { metric: "積載率", value: 88, unit: "%" },
          { metric: "配送時間", value: "+20", unit: "分" },
        ],
        confidence: "Medium",
        risk: "Medium",
      },
      {
        id: "S3",
        name: "案C: 出店見送り",
        description: "C-014は見送り、別候補で再評価",
        pros: ["リスク回避"],
        cons: ["売上機会損失 ¥250M/年"],
        expected_impact: [{ metric: "再評価", value: "代替候補" }],
        confidence: "High",
        risk: "High",
      },
    ],
    actions: [
      {
        action_id: "ACT-009",
        title: "新ルートR-41を試験運用",
        owner_role: "物流戦略部 / 中村",
        due_date: "2026-05-15T00:00",
        status: "pending",
        expected_impact: "C-014 出店可能性確保",
        confidence: "High",
        requires_approval: true,
        audit_log: [{ ts: "2026-04-29T10:05", actor: "AI Engine", action: "対応案を生成" }],
      },
    ],
  },
  {
    incident_id: "INC-008",
    type: "renovation-lift",
    title: "改装済店舗 客単価 +7.4%",
    summary:
      "過去30日で改装完了した12店舗の平均客単価が +7.4%。セルフレジとレイアウト変更が寄与。",
    severity: "low",
    status: "resolved",
    detected_at: "2026-04-30T18:00",
    impacted_stores: 5,
    impacted_skus: 0,
    impacted_routes: 0,
    impacted_factories: 0,
    scenarios: [
      {
        id: "S1",
        name: "案A: 横展開を加速",
        description: "改装パッケージを20店舗に追加適用",
        pros: ["全社利益率改善"],
        cons: ["CAPEX増"],
        expected_impact: [{ metric: "全社客単価", value: "+18", unit: "¥" }],
        confidence: "High",
        risk: "Low",
        recommended: true,
      },
      {
        id: "S2",
        name: "案B: 部分的な仕様の標準化",
        description: "セルフレジのみなど一部だけ展開",
        pros: ["コスト効率"],
        cons: ["効果が薄まる"],
        expected_impact: [{ metric: "客単価", value: "+10", unit: "¥" }],
        confidence: "Medium",
        risk: "Low",
      },
      {
        id: "S3",
        name: "案C: 現状維持",
        description: "次年度予算策定後まで判断保留",
        pros: ["追加投資不要"],
        cons: ["機会損失"],
        expected_impact: [{ metric: "変化", value: "なし" }],
        confidence: "High",
        risk: "Medium",
      },
    ],
    actions: [
      {
        action_id: "ACT-010",
        title: "次年度CAPEX計画に20店舗追加",
        owner_role: "経営企画 / 加藤",
        due_date: "2026-06-30T00:00",
        status: "completed",
        expected_impact: "全社客単価+¥18",
        confidence: "High",
        requires_approval: true,
        audit_log: [
          { ts: "2026-04-30T18:05", actor: "AI Engine", action: "対応案を生成" },
          { ts: "2026-04-30T19:30", actor: "加藤(経営企画)", action: "承認" },
          { ts: "2026-05-01T09:00", actor: "System", action: "計画書発行完了" },
        ],
      },
    ],
  },
  {
    incident_id: "INC-009",
    type: "factory-load",
    title: "嵐山工場 稼働率92%",
    summary:
      "嵐山工場の稼働率が3日連続で90%超。設備故障時のバックアップが川島工場のみで脆弱。",
    severity: "medium",
    status: "active",
    detected_at: "2026-05-01T05:00",
    impacted_stores: 0,
    impacted_skus: 8,
    impacted_routes: 0,
    impacted_factories: 1,
    scenarios: [
      {
        id: "S1",
        name: "案A: 川島工場にシフト",
        description: "嵐山が手薄なSKUを川島工場で代替生産",
        pros: ["即時対応可"],
        cons: ["川島の余力も減少"],
        expected_impact: [{ metric: "嵐山稼働率", value: "92→78", unit: "%" }],
        confidence: "Medium",
        risk: "Medium",
        recommended: true,
      },
      {
        id: "S2",
        name: "案B: 第3工場の前倒し稼働",
        description: "計画中の第3工場を予定より早く稼働開始",
        pros: ["長期解決"],
        cons: ["立上げ3ヶ月、コスト ¥80M"],
        expected_impact: [{ metric: "全体余力", value: "+25", unit: "%" }],
        confidence: "High",
        risk: "Low",
      },
      {
        id: "S3",
        name: "案C: 外部委託で平準化",
        description: "ピーク時のSKUを外部委託で平準化",
        pros: ["コスト柔軟"],
        cons: ["品質リスク"],
        expected_impact: [{ metric: "稼働率", value: "92→82", unit: "%" }],
        confidence: "Low",
        risk: "High",
      },
    ],
    actions: [
      {
        action_id: "ACT-011",
        title: "川島工場へSKU2品の生産シフト",
        owner_role: "生産管理 / 木村",
        due_date: "2026-05-03T00:00",
        status: "pending",
        expected_impact: "嵐山稼働率 92% → 78%",
        confidence: "Medium",
        requires_approval: true,
        audit_log: [{ ts: "2026-05-01T05:10", actor: "AI Engine", action: "対応案を生成" }],
      },
    ],
  },
  {
    incident_id: "INC-010",
    type: "data-quality",
    title: "POSデータ欠損 4店舗",
    summary:
      "5/1 朝の同期で渋谷・新宿2店舗・池袋のPOSデータが欠損。需要予測の精度が一時的に低下。",
    severity: "low",
    status: "mitigating",
    detected_at: "2026-05-01T06:30",
    impacted_stores: 4,
    impacted_skus: 0,
    impacted_routes: 0,
    impacted_factories: 0,
    scenarios: [
      {
        id: "S1",
        name: "案A: 直近7日で平均補完",
        description: "欠損行を直近7日の平均値で埋めるシンプル補完",
        pros: ["即実施"],
        cons: ["イベント日があれば歪む"],
        expected_impact: [{ metric: "予測誤差", value: "8→4", unit: "%" }],
        confidence: "Medium",
        risk: "Low",
      },
      {
        id: "S2",
        name: "案B: 同立地店舗からの参照",
        description: "同じ立地タイプの近隣店舗パターンを学習補完",
        pros: ["より精度が高い"],
        cons: ["処理に2時間"],
        expected_impact: [{ metric: "予測誤差", value: "8→2", unit: "%" }],
        confidence: "High",
        risk: "Low",
        recommended: true,
      },
      {
        id: "S3",
        name: "案C: 当日は手動運用",
        description: "店長判断で当日のみ手動オペレーション",
        pros: ["シンプル"],
        cons: ["店長負荷"],
        expected_impact: [{ metric: "予測精度", value: "ゼロ" }],
        confidence: "Low",
        risk: "Medium",
      },
    ],
    actions: [
      {
        action_id: "ACT-012",
        title: "欠損データを同立地参照で補完",
        owner_role: "DataOps / 木下",
        due_date: "2026-05-01T12:00",
        status: "in-progress",
        expected_impact: "予測誤差 8% → 2%",
        confidence: "High",
        requires_approval: false,
        audit_log: [
          { ts: "2026-05-01T06:35", actor: "AI Engine", action: "対応案を生成" },
          { ts: "2026-05-01T06:50", actor: "木下(DataOps)", action: "実行開始" },
        ],
      },
    ],
  },
]

// ---- helpers ----
const sevConfig: Record<Severity, { color: string; label: string }> = {
  critical: { color: "text-red-400 bg-red-400/10 border-red-400/30", label: "CRITICAL" },
  high: { color: "text-amber-400 bg-amber-400/10 border-amber-400/30", label: "HIGH" },
  medium: { color: "text-blue-400 bg-blue-400/10 border-blue-400/30", label: "MEDIUM" },
  low: { color: "text-white/40 bg-white/[0.04] border-white/[0.08]", label: "LOW" },
}

const statusConfig: Record<ActionStatus, { color: string; label: string; Icon: typeof Clock }> = {
  pending: { color: "text-amber-400 bg-amber-400/10", label: "承認待ち", Icon: Clock },
  approved: { color: "text-blue-400 bg-blue-400/10", label: "承認済", Icon: CheckCircle2 },
  "in-progress": { color: "text-cyan-400 bg-cyan-400/10", label: "実行中", Icon: Zap },
  completed: { color: "text-emerald-400 bg-emerald-400/10", label: "完了", Icon: CheckCircle2 },
  rejected: { color: "text-red-400 bg-red-400/10", label: "却下", Icon: XCircle },
}

const incStatusConfig: Record<IncidentStatus, { color: string; label: string }> = {
  active: { color: "text-red-400 bg-red-400/10", label: "Active" },
  mitigating: { color: "text-amber-400 bg-amber-400/10", label: "Mitigating" },
  resolved: { color: "text-emerald-400 bg-emerald-400/10", label: "Resolved" },
}

export default function IncidentsPage() {
  const [actionsState, setActionsState] = useState<Record<string, RecAction>>(() => {
    const map: Record<string, RecAction> = {}
    incidents.forEach((inc) => inc.actions.forEach((a) => (map[a.action_id] = a)))
    return map
  })
  const [selectedIncidentId, setSelectedIncidentId] = useState(incidents[0].incident_id)
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    kind: "success" | "warning"
    text: string
  } | null>(null)

  const selectedIncident = incidents.find((i) => i.incident_id === selectedIncidentId)!
  const incidentActions = selectedIncident.actions.map((a) => actionsState[a.action_id])

  const counts = useMemo(() => {
    const all = Object.values(actionsState)
    return {
      pending: all.filter((a) => a.status === "pending").length,
      approved: all.filter((a) => a.status === "approved").length,
      "in-progress": all.filter((a) => a.status === "in-progress").length,
      completed: all.filter((a) => a.status === "completed").length,
      rejected: all.filter((a) => a.status === "rejected").length,
    }
  }, [actionsState])

  const handleDecide = (actionId: string, decision: "approved" | "rejected") => {
    setActionsState((prev) => ({
      ...prev,
      [actionId]: {
        ...prev[actionId],
        status: decision,
        audit_log: [
          ...prev[actionId].audit_log,
          {
            ts: "2026-05-01T15:46",
            actor: "経営企画部",
            action: decision === "approved" ? "承認" : "却下",
          },
        ],
      },
    }))
    setFeedback({
      kind: decision === "approved" ? "success" : "warning",
      text: `${decision === "approved" ? "承認" : "却下"}しました: ${actionsState[actionId].title.slice(0, 36)}…`,
    })
    setTimeout(() => setFeedback(null), 3500)
  }

  const [selectedScenarioByIncident, setSelectedScenarioByIncident] = useState<
    Record<string, string>
  >({})

  const scenariosForCompare = selectedIncident.scenarios.map((s) => ({
    id: s.id,
    label: s.name,
    description: s.description,
    pros: s.pros,
    cons: s.cons,
    expected_impact: s.expected_impact,
    confidence: s.confidence,
    risk: s.risk,
    recommended: s.recommended,
  }))

  const selectedScenarioId =
    selectedScenarioByIncident[selectedIncidentId] ??
    selectedIncident.scenarios.find((s) => s.recommended)?.id ??
    selectedIncident.scenarios[0]?.id

  return (
    <div className="min-h-full -m-6 bg-[#0a0e14] p-6 text-white/80">
      <div className="mb-5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <ContextHeader
          title="インシデント & 対応キュー"
          description="重大シグナルから推奨アクションまで一元管理"
        />
      </div>

      {/* Status counters */}
      <div className="mb-4 grid grid-cols-5 gap-3">
        <CounterCard label="承認待ち" value={counts.pending} color="text-amber-400" Icon={Clock} />
        <CounterCard label="承認済" value={counts.approved} color="text-blue-400" Icon={CheckCircle2} />
        <CounterCard label="実行中" value={counts["in-progress"]} color="text-cyan-400" Icon={Zap} />
        <CounterCard label="完了" value={counts.completed} color="text-emerald-400" Icon={CheckCircle2} />
        <CounterCard label="却下" value={counts.rejected} color="text-red-400" Icon={XCircle} />
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Incident list */}
        <div className="col-span-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
            <span className="text-[10px] uppercase tracking-wider text-white/40">
              Incidents
            </span>
            <span className="text-[10px] text-white/30">{incidents.length}件</span>
          </div>
          <div className="divide-y divide-white/[0.04] max-h-[calc(100vh-280px)] overflow-y-auto">
            {incidents.map((inc) => {
              const sev = sevConfig[inc.severity]
              const st = incStatusConfig[inc.status]
              const isActive = inc.incident_id === selectedIncidentId
              return (
                <button
                  key={inc.incident_id}
                  onClick={() => {
                    setSelectedIncidentId(inc.incident_id)
                    setSelectedActionId(null)
                  }}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    isActive ? "bg-blue-500/[0.08]" : "hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${sev.color}`}>
                      {sev.label}
                    </span>
                    <span className="text-[10px] text-white/30">{inc.incident_id}</span>
                    <span className={`ml-auto rounded px-1.5 py-0.5 text-[9px] ${st.color}`}>
                      {st.label}
                    </span>
                  </div>
                  <div className="mt-1.5 text-[12px] font-medium text-white/80">{inc.title}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-white/40">
                    {inc.impacted_stores > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <StoreIcon className="h-3 w-3" />
                        {inc.impacted_stores}
                      </span>
                    )}
                    {inc.impacted_skus > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {inc.impacted_skus}
                      </span>
                    )}
                    {inc.impacted_routes > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        {inc.impacted_routes}
                      </span>
                    )}
                    {inc.impacted_factories > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Factory className="h-3 w-3" />
                        {inc.impacted_factories}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Detail */}
        <div className="col-span-8 space-y-4">
          {/* Overview */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <div className="border-b border-white/[0.06] px-4 py-2 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[10px] uppercase tracking-wider text-white/40">
                Incident Overview
              </span>
              <span className="ml-auto text-[10px] text-white/30 font-mono tabular-nums">
                detected {selectedIncident.detected_at}
              </span>
            </div>
            <div className="p-4">
              <div className="flex items-start gap-3">
                <span
                  className={`rounded border px-2 py-0.5 text-[9px] font-bold ${
                    sevConfig[selectedIncident.severity].color
                  }`}
                >
                  {sevConfig[selectedIncident.severity].label}
                </span>
                <div className="flex-1">
                  <div className="text-[14px] font-semibold text-white/90">
                    {selectedIncident.title}
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-white/55">
                    {selectedIncident.summary}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-3 text-center">
                <ImpactStat
                  Icon={StoreIcon}
                  value={selectedIncident.impacted_stores}
                  label="Stores"
                />
                <ImpactStat
                  Icon={Package}
                  value={selectedIncident.impacted_skus}
                  label="SKUs"
                />
                <ImpactStat
                  Icon={Truck}
                  value={selectedIncident.impacted_routes}
                  label="Routes"
                />
                <ImpactStat
                  Icon={Factory}
                  value={selectedIncident.impacted_factories}
                  label="Factories"
                />
              </div>
            </div>
          </div>

          {/* Scenario comparison */}
          <ScenarioComparison
            title="シナリオ比較"
            scenarios={scenariosForCompare}
            selectedId={selectedScenarioId}
            onSelect={(id) =>
              setSelectedScenarioByIncident((prev) => ({ ...prev, [selectedIncidentId]: id }))
            }
          />

          {/* Recommended actions */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2">
              <Activity className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-[10px] uppercase tracking-wider text-white/40">
                Recommended Actions
              </span>
              <span className="ml-auto text-[10px] text-white/30">
                {incidentActions.length}件
              </span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {incidentActions.map((a) => {
                const cfg = statusConfig[a.status]
                const StatusIcon = cfg.Icon
                const isOpen = selectedActionId === a.action_id
                return (
                  <div key={a.action_id}>
                    <button
                      onClick={() => setSelectedActionId(isOpen ? null : a.action_id)}
                      className="w-full px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <ChevronRight
                          className={`h-3.5 w-3.5 text-white/30 transition-transform ${isOpen ? "rotate-90" : ""}`}
                        />
                        <StatusIcon className={`h-4 w-4 shrink-0 ${cfg.color.split(" ")[0]}`} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] text-white/80">{a.title}</div>
                          <div className="mt-0.5 flex items-center gap-3 text-[10px] text-white/35">
                            <span>{a.action_id}</span>
                            <span>{a.owner_role}</span>
                            <span className="font-mono tabular-nums">{a.due_date}</span>
                          </div>
                        </div>
                        <span className={`shrink-0 rounded px-2 py-0.5 text-[9px] font-medium ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] ${
                            a.confidence === "High"
                              ? "text-emerald-400 bg-emerald-400/10"
                              : a.confidence === "Medium"
                                ? "text-amber-400 bg-amber-400/10"
                                : "text-red-400 bg-red-400/10"
                          }`}
                        >
                          {a.confidence}
                        </span>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="space-y-4 border-t border-white/[0.04] bg-black/20 px-4 py-4 pl-12">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Expected Impact</Label>
                            <p className="mt-1 text-[12px] text-emerald-400/85">{a.expected_impact}</p>
                          </div>
                          <div>
                            <Label icon={<Shield className="h-3 w-3" />}>Confidence</Label>
                            <p
                              className={`mt-1 text-[12px] ${
                                a.confidence === "High"
                                  ? "text-emerald-400"
                                  : a.confidence === "Medium"
                                    ? "text-amber-400"
                                    : "text-red-400"
                              }`}
                            >
                              {a.confidence}
                            </p>
                          </div>
                        </div>

                        {/* Audit log */}
                        <div>
                          <Label icon={<FileText className="h-3 w-3" />}>Audit Log</Label>
                          <div className="mt-2 overflow-hidden rounded border border-white/[0.06]">
                            <table className="w-full text-[11px]">
                              <thead className="bg-white/[0.02]">
                                <tr className="text-white/30">
                                  <th className="px-3 py-1.5 text-left font-medium">Timestamp</th>
                                  <th className="px-3 py-1.5 text-left font-medium">Actor</th>
                                  <th className="px-3 py-1.5 text-left font-medium">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {a.audit_log.map((l, i) => (
                                  <tr key={i} className="border-t border-white/[0.04]">
                                    <td className="px-3 py-1.5 font-mono tabular-nums text-white/40">
                                      {l.ts}
                                    </td>
                                    <td className="px-3 py-1.5 text-white/70">{l.actor}</td>
                                    <td className="px-3 py-1.5 text-white/55">{l.action}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {a.status === "pending" && (
                          <div className="flex items-center gap-3 border-t border-white/[0.06] pt-3">
                            <button
                              onClick={() => handleDecide(a.action_id, "approved")}
                              className="inline-flex items-center gap-2 rounded-md bg-emerald-500/20 px-5 py-2 text-[12px] font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/30"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              承認する
                            </button>
                            <button
                              onClick={() => handleDecide(a.action_id, "rejected")}
                              className="inline-flex items-center gap-2 rounded-md bg-red-500/15 px-5 py-2 text-[12px] font-semibold text-red-400 transition-colors hover:bg-red-500/25"
                            >
                              <XCircle className="h-4 w-4" />
                              却下する
                            </button>
                            <span className="ml-auto text-[10px] text-white/30">
                              要承認: {a.requires_approval ? "あり" : "なし"}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Inline feedback */}
      {feedback && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm">
          <div
            className={`flex items-start gap-2 rounded-md border px-4 py-3 shadow-lg backdrop-blur ${
              feedback.kind === "success"
                ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-300"
                : "border-amber-400/30 bg-amber-400/15 text-amber-300"
            }`}
          >
            {feedback.kind === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span className="text-[12px]">{feedback.text}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- subcomponents ----
function CounterCard({
  label,
  value,
  color,
  Icon,
}: {
  label: string
  value: number
  color: string
  Icon: typeof Clock
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="mb-1 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-[10px] uppercase tracking-wider text-white/40">{label}</span>
      </div>
      <div className={`font-mono tabular-nums text-2xl ${color}`}>{value}</div>
    </div>
  )
}

function ImpactStat({
  Icon,
  value,
  label,
}: {
  Icon: typeof StoreIcon
  value: number
  label: string
}) {
  return (
    <div className="rounded-md border border-white/[0.06] bg-white/[0.02] py-2">
      <Icon className="mx-auto h-4 w-4 text-white/40" />
      <div className="mt-1 font-mono tabular-nums text-sm text-white/80">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-white/30">{label}</div>
    </div>
  )
}

function Label({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em] text-white/30">
      {icon}
      {children}
    </div>
  )
}
