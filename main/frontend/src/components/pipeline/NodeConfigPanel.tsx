"use client"

import { type PipelineNode, NODE_TYPE_META } from "@/lib/pipeline-api"

interface Props {
  node: PipelineNode
  onChange: (patch: Partial<PipelineNode>) => void
}

export function NodeConfigPanel({ node, onChange }: Props) {
  const meta = NODE_TYPE_META[node.type]
  const updateConfig = (k: string, v: any) => onChange({ config: { ...node.config, [k]: v } })

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/[0.06] shrink-0">
        <div className={`text-[9px] uppercase tracking-wider font-bold ${meta.color}`}>{meta.label}</div>
        <input
          value={node.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="w-full mt-1 bg-transparent text-[14px] text-white/90 font-medium focus:outline-none"
        />
        <div className="text-[10px] text-white/40 mt-1">{meta.description}</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {node.type === "connector_fetch" && (
          <>
            <Field label="コネクタID" value={node.config.connector_id ?? ""} onChange={(v) => updateConfig("connector_id", v)} placeholder="pos_zensho_v2" />
            <Field label="エンドポイント" value={node.config.endpoint ?? ""} onChange={(v) => updateConfig("endpoint", v)} placeholder="/v2/sales/daily" />
            <Field label="認証方式" value={node.config.auth ?? ""} onChange={(v) => updateConfig("auth", v)} placeholder="oauth2 / api_key / none" />
            <Field label="出力 dataset 名" value={node.config.target_dataset ?? ""} onChange={(v) => updateConfig("target_dataset", v)} placeholder="raw_pos_daily" />
          </>
        )}

        {node.type === "transform_sql" && (
          <>
            <Field label="出力 dataset 名" value={node.config.target_dataset ?? ""} onChange={(v) => updateConfig("target_dataset", v)} placeholder="daily_kpi" />
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/45">SQL</label>
              <textarea
                value={node.config.sql ?? ""}
                onChange={(e) => updateConfig("sql", e.target.value)}
                placeholder="SELECT ..."
                className="mt-1 w-full h-48 px-3 py-2 rounded bg-black/40 border border-white/[0.08] text-[12px] text-white/85 font-mono resize-none focus:outline-none focus:border-purple-400/40"
              />
            </div>
          </>
        )}

        {node.type === "validate" && (
          <>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/45">バリデーション ルール (JSON)</label>
              <textarea
                value={JSON.stringify(node.config.rules ?? [], null, 2)}
                onChange={(e) => {
                  try { updateConfig("rules", JSON.parse(e.target.value)) } catch { /* keep typing */ }
                }}
                className="mt-1 w-full h-48 px-3 py-2 rounded bg-black/40 border border-white/[0.08] text-[11px] text-white/85 font-mono resize-none focus:outline-none focus:border-amber-400/40"
              />
            </div>
            <Field label="失敗時の挙動" value={node.config.on_failure ?? ""} onChange={(v) => updateConfig("on_failure", v)} placeholder="quarantine / fail / emit_violation" />
          </>
        )}

        {node.type === "writeback" && (
          <>
            <Field label="出力 dataset 名" value={node.config.target_dataset ?? ""} onChange={(v) => updateConfig("target_dataset", v)} placeholder="daily_store_sales" />
            <Field label="書き込みモード" value={node.config.mode ?? ""} onChange={(v) => updateConfig("mode", v)} placeholder="append / upsert / replace" />
            <Field label="パーティションキー" value={node.config.partition_by ?? ""} onChange={(v) => updateConfig("partition_by", v)} placeholder="business_date" />
            <Field label="通知チャンネル" value={node.config.notify_channel ?? ""} onChange={(v) => updateConfig("notify_channel", v)} placeholder="#labor-alerts" />
          </>
        )}

        {node.type === "python_func" && (
          <>
            <Field label="関数名" value={node.config.func_name ?? ""} onChange={(v) => updateConfig("func_name", v)} placeholder="enrich_with_ml" />
            <Field label="モジュールパス" value={node.config.module ?? ""} onChange={(v) => updateConfig("module", v)} placeholder="aentro.pipelines.ml.enrich" />
            <Field label="出力 dataset 名" value={node.config.target_dataset ?? ""} onChange={(v) => updateConfig("target_dataset", v)} placeholder="enriched_dataset" />
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/45">パラメータ (JSON)</label>
              <textarea
                value={JSON.stringify(node.config.params ?? {}, null, 2)}
                onChange={(e) => {
                  try { updateConfig("params", JSON.parse(e.target.value)) } catch { /* */ }
                }}
                className="mt-1 w-full h-32 px-3 py-2 rounded bg-black/40 border border-white/[0.08] text-[11px] text-white/85 font-mono resize-none focus:outline-none focus:border-pink-400/40"
              />
            </div>
          </>
        )}

        <div className="pt-3 border-t border-white/[0.06]">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">ノードID</div>
          <code className="text-[10px] text-white/55 font-mono">{node.id}</code>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-white/45">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full px-3 py-2 rounded bg-black/40 border border-white/[0.08] text-[12px] text-white/85 focus:outline-none focus:border-blue-400/40"
      />
    </div>
  )
}
