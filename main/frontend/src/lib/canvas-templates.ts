// 3つのデフォルトテンプレ: 店舗業績ダッシュボード / 労務監視 / 店長日報

import type { CanvasSpec } from "./canvas-spec"

export interface CanvasTemplate {
  key: string
  name: string
  description: string
  spec: CanvasSpec
}

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  {
    key: "store-performance",
    name: "店舗業績ダッシュボード",
    description: "売上・原価・利益のKPIと推移を一覧",
    spec: {
      version: 1,
      filters: { period: { from: "2026-01-01", to: "2026-04-30" } },
      tiles: [
        { id: "tpl1-f", type: "filter", title: "共有フィルタ" },
        { id: "tpl1-k1", type: "kpi", title: "売上高", kpi: "net_sales", comparePrev: true, showSparkline: true, color: "#3b82f6" },
        { id: "tpl1-k2", type: "kpi", title: "営業利益率", kpi: "operating_profit_rate", comparePrev: true, showSparkline: true, color: "#10b981" },
        { id: "tpl1-k3", type: "kpi", title: "FL比率", kpi: "fl_ratio", comparePrev: true, showSparkline: true, color: "#f59e0b" },
        { id: "tpl1-c1", type: "chart", title: "ブランド別売上", chartKind: "bar", kpi: "net_sales", groupBy: "brand", color: "#3b82f6" },
        { id: "tpl1-c2", type: "chart", title: "売上推移", chartKind: "line", kpi: "net_sales", groupBy: "month", color: "#8b5cf6" },
        { id: "tpl1-t1", type: "table", title: "店舗ランキング", kpis: ["net_sales", "operating_profit_rate", "health_score"], groupBy: "store" },
      ],
      layout: [
        { i: "tpl1-f", x: 0, y: 0, w: 12, h: 2 },
        { i: "tpl1-k1", x: 0, y: 2, w: 4, h: 3 },
        { i: "tpl1-k2", x: 4, y: 2, w: 4, h: 3 },
        { i: "tpl1-k3", x: 8, y: 2, w: 4, h: 3 },
        { i: "tpl1-c1", x: 0, y: 5, w: 6, h: 5 },
        { i: "tpl1-c2", x: 6, y: 5, w: 6, h: 5 },
        { i: "tpl1-t1", x: 0, y: 10, w: 12, h: 6 },
      ],
    },
  },
  {
    key: "labor-monitor",
    name: "労務監視",
    description: "人件費率と労働生産性を全社で監視",
    spec: {
      version: 1,
      filters: {},
      tiles: [
        { id: "tpl2-f", type: "filter", title: "共有フィルタ" },
        { id: "tpl2-k1", type: "kpi", title: "人件費率", kpi: "labor_cost_rate", comparePrev: true, showSparkline: true, color: "#ef4444" },
        { id: "tpl2-k2", type: "kpi", title: "人時売上高", kpi: "sales_per_labor_hour", comparePrev: true, showSparkline: true, color: "#06b6d4" },
        { id: "tpl2-c1", type: "chart", title: "エリア別人件費率", chartKind: "bar", kpi: "labor_cost_rate", groupBy: "region", color: "#ef4444" },
        { id: "tpl2-p1", type: "pivot", title: "ブランド×月の人件費率", kpi: "labor_cost_rate", rows: "brand", cols: "month" },
        { id: "tpl2-md", type: "markdown", title: "運用メモ", body: "## 監視ルール\n- 人件費率 30% 超で要確認\n- ピーク時間帯シフトはSV承認必須" },
      ],
      layout: [
        { i: "tpl2-f", x: 0, y: 0, w: 12, h: 2 },
        { i: "tpl2-k1", x: 0, y: 2, w: 6, h: 3 },
        { i: "tpl2-k2", x: 6, y: 2, w: 6, h: 3 },
        { i: "tpl2-c1", x: 0, y: 5, w: 7, h: 5 },
        { i: "tpl2-md", x: 7, y: 5, w: 5, h: 5 },
        { i: "tpl2-p1", x: 0, y: 10, w: 12, h: 6 },
      ],
    },
  },
  {
    key: "store-manager-daily",
    name: "店長日報",
    description: "1店舗の今日の数値を一目で確認",
    spec: {
      version: 1,
      filters: {},
      tiles: [
        { id: "tpl3-md", type: "markdown", title: "本日のハイライト", body: "## 本日のハイライト\n- 客数: 平日平均 +5%\n- 客単価: 横ばい\n- 改善点: ピーク時の人員配置" },
        { id: "tpl3-k1", type: "kpi", title: "本日の売上", kpi: "net_sales", comparePrev: true, showSparkline: true, color: "#3b82f6" },
        { id: "tpl3-k2", type: "kpi", title: "客単価", kpi: "avg_ticket", comparePrev: true, color: "#8b5cf6" },
        { id: "tpl3-k3", type: "kpi", title: "健全度スコア", kpi: "health_score", comparePrev: true, color: "#10b981" },
        { id: "tpl3-c1", type: "chart", title: "曜日別売上構成", chartKind: "pie", kpi: "net_sales", groupBy: "brand", color: "#3b82f6" },
        { id: "tpl3-t1", type: "table", title: "今週のKPI", kpis: ["net_sales", "avg_ticket", "labor_cost_rate"], groupBy: "store" },
      ],
      layout: [
        { i: "tpl3-md", x: 0, y: 0, w: 12, h: 4 },
        { i: "tpl3-k1", x: 0, y: 4, w: 4, h: 3 },
        { i: "tpl3-k2", x: 4, y: 4, w: 4, h: 3 },
        { i: "tpl3-k3", x: 8, y: 4, w: 4, h: 3 },
        { i: "tpl3-c1", x: 0, y: 7, w: 5, h: 5 },
        { i: "tpl3-t1", x: 5, y: 7, w: 7, h: 5 },
      ],
    },
  },
]
