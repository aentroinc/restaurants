"use client"

import type { Tile, ObjectBinding } from "@/lib/canvas-spec"
import { KPI_OPTIONS } from "@/lib/canvas-spec"
import { ObjectPicker } from "./ObjectPicker"

interface Props {
  tile: Tile | null
  onChange: (next: Tile) => void
}

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"]

const labelCls = "text-[10px] uppercase tracking-wider text-white/40 mb-1"
const inputCls =
  "w-full text-[12px] px-2 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded text-white/85 focus:outline-none focus:border-white/20"

export function PropertyPanel({ tile, onChange }: Props) {
  if (!tile) {
    return (
      <div className="p-4 text-[12px] text-white/40">
        タイルを選択するとここで設定できます。
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3 overflow-auto h-full">
      <div className="text-[11px] text-white/40 uppercase tracking-wider">プロパティ</div>

      <div>
        <div className={labelCls}>タイトル</div>
        <input
          value={tile.title}
          onChange={(e) => onChange({ ...tile, title: e.target.value })}
          className={inputCls}
        />
      </div>

      {/* Object binding は object/kpi/chart/table タイプで利用可 */}
      {(tile.type === "object" || tile.type === "kpi" || tile.type === "chart" || tile.type === "table") && (
        <ObjectPicker
          value={tile.objectBinding}
          onChange={(b: ObjectBinding | undefined) => onChange({ ...tile, objectBinding: b } as Tile)}
          showPropertyPicker={tile.type !== "object"}
        />
      )}

      {tile.type === "object" && (
        <div>
          <div className={labelCls}>表示</div>
          <select
            value={tile.view ?? "full"}
            onChange={(e) => onChange({ ...tile, view: e.target.value as "summary" | "full" })}
            className={inputCls}
          >
            <option value="full" className="bg-[#0c1017]">フル（プロパティ＋関連＋アクション）</option>
            <option value="summary" className="bg-[#0c1017]">プロパティのみ</option>
          </select>
        </div>
      )}

      {tile.type === "kpi" && (
        <>
          <div>
            <div className={labelCls}>KPI</div>
            <select value={tile.kpi} onChange={(e) => onChange({ ...tile, kpi: e.target.value })} className={inputCls}>
              {KPI_OPTIONS.map((k) => <option key={k.value} value={k.value} className="bg-[#0c1017]">{k.label}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-[12px] text-white/75">
            <input type="checkbox" checked={!!tile.comparePrev} onChange={(e) => onChange({ ...tile, comparePrev: e.target.checked })} />
            前期比を表示
          </label>
          <label className="flex items-center gap-2 text-[12px] text-white/75">
            <input type="checkbox" checked={!!tile.showSparkline} onChange={(e) => onChange({ ...tile, showSparkline: e.target.checked })} />
            ミニスパークライン
          </label>
          <ColorPicker value={tile.color} onChange={(c) => onChange({ ...tile, color: c })} />
        </>
      )}

      {tile.type === "chart" && (
        <>
          <div>
            <div className={labelCls}>チャート種別</div>
            <select value={tile.chartKind} onChange={(e) => onChange({ ...tile, chartKind: e.target.value as "line" | "bar" | "pie" })} className={inputCls}>
              <option value="bar" className="bg-[#0c1017]">棒グラフ</option>
              <option value="line" className="bg-[#0c1017]">折れ線</option>
              <option value="pie" className="bg-[#0c1017]">円グラフ</option>
            </select>
          </div>
          <div>
            <div className={labelCls}>KPI</div>
            <select value={tile.kpi} onChange={(e) => onChange({ ...tile, kpi: e.target.value })} className={inputCls}>
              {KPI_OPTIONS.map((k) => <option key={k.value} value={k.value} className="bg-[#0c1017]">{k.label}</option>)}
            </select>
          </div>
          <div>
            <div className={labelCls}>グルーピング</div>
            <select value={tile.groupBy ?? "brand"} onChange={(e) => onChange({ ...tile, groupBy: e.target.value as "brand" | "region" | "month" | "store" })} className={inputCls}>
              <option value="brand" className="bg-[#0c1017]">ブランド</option>
              <option value="region" className="bg-[#0c1017]">エリア</option>
              <option value="month" className="bg-[#0c1017]">月次</option>
              <option value="store" className="bg-[#0c1017]">店舗</option>
            </select>
          </div>
          <ColorPicker value={tile.color} onChange={(c) => onChange({ ...tile, color: c })} />
        </>
      )}

      {tile.type === "table" && (
        <>
          <div>
            <div className={labelCls}>表示KPI（複数）</div>
            <div className="space-y-1 max-h-56 overflow-auto pr-1">
              {KPI_OPTIONS.map((k) => {
                const checked = tile.kpis.includes(k.value)
                return (
                  <label key={k.value} className="flex items-center gap-2 text-[12px] text-white/75 hover:bg-white/[0.03] px-1 py-0.5 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = checked ? tile.kpis.filter((x) => x !== k.value) : [...tile.kpis, k.value]
                        onChange({ ...tile, kpis: next.length ? next : [k.value] })
                      }}
                    />
                    {k.label}
                  </label>
                )
              })}
            </div>
          </div>
          <div>
            <div className={labelCls}>グルーピング</div>
            <select value={tile.groupBy ?? "store"} onChange={(e) => onChange({ ...tile, groupBy: e.target.value as "store" | "brand" | "region" })} className={inputCls}>
              <option value="store" className="bg-[#0c1017]">店舗</option>
              <option value="brand" className="bg-[#0c1017]">ブランド</option>
              <option value="region" className="bg-[#0c1017]">エリア</option>
            </select>
          </div>
        </>
      )}

      {tile.type === "markdown" && (
        <div>
          <div className={labelCls}>本文 (Markdown)</div>
          <textarea
            value={tile.body}
            onChange={(e) => onChange({ ...tile, body: e.target.value })}
            rows={12}
            className={inputCls + " font-mono text-[11px] resize-y"}
            placeholder="# 見出し\n- リスト\n**太字**"
          />
        </div>
      )}

      {tile.type === "filter" && (
        <div className="text-[11px] text-white/50">
          タイル本体で期間・ブランド・エリアを設定します。設定値は全タイルに反映されます。
        </div>
      )}

      {tile.type === "pivot" && (
        <>
          <div>
            <div className={labelCls}>KPI</div>
            <select value={tile.kpi} onChange={(e) => onChange({ ...tile, kpi: e.target.value })} className={inputCls}>
              {KPI_OPTIONS.map((k) => <option key={k.value} value={k.value} className="bg-[#0c1017]">{k.label}</option>)}
            </select>
          </div>
          <div>
            <div className={labelCls}>行</div>
            <select value={tile.rows} onChange={(e) => onChange({ ...tile, rows: e.target.value as "brand" | "region" | "store" })} className={inputCls}>
              <option value="brand" className="bg-[#0c1017]">ブランド</option>
              <option value="region" className="bg-[#0c1017]">エリア</option>
              <option value="store" className="bg-[#0c1017]">店舗</option>
            </select>
          </div>
          <div>
            <div className={labelCls}>列</div>
            <select value={tile.cols} onChange={(e) => onChange({ ...tile, cols: e.target.value as "month" | "quarter" })} className={inputCls}>
              <option value="month" className="bg-[#0c1017]">月次</option>
              <option value="quarter" className="bg-[#0c1017]">四半期</option>
            </select>
          </div>
        </>
      )}
    </div>
  )
}

function ColorPicker({ value, onChange }: { value?: string; onChange: (c: string) => void }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">アクセントカラー</div>
      <div className="flex gap-1.5">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            style={{ background: c }}
            className={`h-6 w-6 rounded-md border ${value === c ? "border-white/80 ring-1 ring-white/40" : "border-white/10"}`}
            title={c}
          />
        ))}
      </div>
    </div>
  )
}
