"use client"

import { useEffect, useState } from "react"
import { Loader2, Link2, Zap, AlertTriangle } from "lucide-react"
import {
  ontologyAPI,
  type OntoObjectInstance,
  type OntoObjectType,
  type OntoAction,
} from "@/lib/ontology-api"
import type { ObjectTile as ObjectTileSpec } from "@/lib/canvas-spec"

export function ObjectTile({ tile }: { tile: ObjectTileSpec }) {
  const [instance, setInstance] = useState<OntoObjectInstance | null>(null)
  const [objectType, setObjectType] = useState<OntoObjectType | null>(null)
  const [actions, setActions] = useState<OntoAction[]>([])
  const [loading, setLoading] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const view = tile.view ?? "full"
  const binding = tile.objectBinding

  useEffect(() => {
    if (!binding?.instanceId) { setInstance(null); return }
    setLoading(true)
    ontologyAPI.getInstance(binding.instanceId)
      .then(async (inst) => {
        setInstance(inst)
        // Object Type 解決（api_name 指定 or instance 由来の id）
        const typeKey = binding.type || inst.object_type_id
        try {
          const types = await ontologyAPI.listObjectTypes()
          const ot = types.find((t) => t.api_name === typeKey || t.id === typeKey || t.id === inst.object_type_id) ?? null
          setObjectType(ot)
          if (ot) {
            const acts = await ontologyAPI.listActions(ot.id)
            setActions(acts)
          }
        } catch {
          /* noop */
        }
      })
      .catch(() => setInstance(null))
      .finally(() => setLoading(false))
  }, [binding?.instanceId, binding?.type])

  if (!binding?.type) {
    return (
      <div className="h-full w-full flex items-center justify-center text-[11px] text-white/40 px-3 text-center">
        プロパティパネルから Object Type を選択してください
      </div>
    )
  }

  if (!binding.instanceId) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-[11px] text-white/40 px-3 text-center gap-1">
        <AlertTriangle className="h-4 w-4 text-amber-400/70" />
        <div>Instance が未指定です</div>
        <div className="text-[10px] text-white/30">プロパティパネルから検索 → 選択</div>
      </div>
    )
  }

  if (loading || !instance) {
    return (
      <div className="h-full w-full flex items-center justify-center text-[11px] text-white/40">
        <Loader2 className="h-4 w-4 animate-spin mr-1" /> 読込中
      </div>
    )
  }

  const handleAction = async (a: OntoAction) => {
    setBusyAction(a.id)
    setActionMsg(null)
    try {
      // 簡易: 実 API は不在のため擬似遅延 → 成功メッセージ
      await new Promise((r) => setTimeout(r, 400))
      setActionMsg(`${a.display_name} を${a.requires_approval ? "承認待ちに送信" : "実行"}しました`)
    } catch {
      setActionMsg(`${a.display_name} に失敗しました`)
    } finally {
      setBusyAction(null)
      setTimeout(() => setActionMsg(null), 2500)
    }
  }

  return (
    <div className="h-full w-full flex flex-col p-3 overflow-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[16px]">{objectType?.icon ?? "📦"}</span>
          <div className="min-w-0">
            <div className="text-[10px] text-white/40 truncate">{objectType?.display_name ?? binding.type}</div>
            <div className="text-[13px] text-white/90 truncate font-medium">{instance.display_name}</div>
          </div>
        </div>
        <span className="text-[9px] text-white/30 tabular-nums shrink-0">{instance.id}</span>
      </div>

      {/* プロパティ */}
      <div className="mb-3">
        <div className="text-[9px] uppercase tracking-wider text-white/35 mb-1">プロパティ</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {Object.entries(instance.properties).map(([k, v]) => (
            <div key={k} className="text-[10px] flex items-baseline justify-between gap-2 border-b border-white/[0.04] py-0.5">
              <span className="text-white/45 truncate">{prettyPropLabel(k, objectType)}</span>
              <span className="text-white/85 tabular-nums truncate text-right">{fmt(v)}</span>
            </div>
          ))}
        </div>
      </div>

      {view === "full" && instance.links && instance.links.length > 0 && (
        <div className="mb-3">
          <div className="text-[9px] uppercase tracking-wider text-white/35 mb-1 flex items-center gap-1">
            <Link2 className="h-2.5 w-2.5" /> 関連オブジェクト
          </div>
          <div className="space-y-1">
            {instance.links.map((lk, i) => (
              <div key={i} className="px-2 py-1 rounded bg-white/[0.03] border border-white/[0.04] text-[10px] flex items-center justify-between">
                <span className="text-white/40">{lk.link_api_name}</span>
                <span className="text-white/85 truncate">{lk.to_display_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "full" && actions.length > 0 && (
        <div>
          <div className="text-[9px] uppercase tracking-wider text-white/35 mb-1 flex items-center gap-1">
            <Zap className="h-2.5 w-2.5" /> アクション
          </div>
          <div className="flex flex-wrap gap-1">
            {actions.map((a) => (
              <button
                key={a.id}
                disabled={busyAction === a.id}
                onClick={() => handleAction(a)}
                className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                  a.requires_approval
                    ? "border-amber-400/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                    : "border-blue-400/40 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20"
                } disabled:opacity-50`}
              >
                {busyAction === a.id ? "..." : a.display_name}
                {a.requires_approval && <span className="ml-1 text-[8px] opacity-70">(承認)</span>}
              </button>
            ))}
          </div>
          {actionMsg && <div className="mt-1 text-[10px] text-emerald-300">{actionMsg}</div>}
        </div>
      )}
    </div>
  )
}

function prettyPropLabel(api: string, ot: OntoObjectType | null): string {
  const p = ot?.properties.find((x) => x.api_name === api)
  return p?.display_name ?? api
}

function fmt(v: unknown): string {
  if (v == null) return "—"
  if (typeof v === "number") return v.toLocaleString()
  if (typeof v === "boolean") return v ? "はい" : "いいえ"
  return String(v)
}
