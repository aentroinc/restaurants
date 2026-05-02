"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, X, Link2 } from "lucide-react"
import {
  ontologyAPI,
  type OntoObjectType,
  type OntoObjectInstance,
} from "@/lib/ontology-api"
import type { ObjectBinding } from "@/lib/canvas-spec"

interface Props {
  value?: ObjectBinding
  onChange: (next: ObjectBinding | undefined) => void
  // KPI/Chart/Table 用に property も選択させたいケース
  showPropertyPicker?: boolean
}

export function ObjectPicker({ value, onChange, showPropertyPicker }: Props) {
  const [types, setTypes] = useState<OntoObjectType[]>([])
  const [instances, setInstances] = useState<OntoObjectInstance[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)

  // 1) ObjectType 一覧を取得
  useEffect(() => {
    ontologyAPI.listObjectTypes().then(setTypes).catch(() => setTypes([]))
  }, [])

  // 2) 選択中の type のインスタンス一覧を取得
  useEffect(() => {
    if (!value?.type) { setInstances([]); return }
    setLoading(true)
    ontologyAPI.listInstances(value.type)
      .then(setInstances)
      .catch(() => setInstances([]))
      .finally(() => setLoading(false))
  }, [value?.type])

  const selectedType = useMemo(
    () => types.find((t) => t.api_name === value?.type || t.id === value?.type),
    [types, value?.type],
  )

  const filteredInstances = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return instances
    return instances.filter((i) =>
      i.display_name.toLowerCase().includes(q) ||
      i.id.toLowerCase().includes(q),
    )
  }, [instances, query])

  const labelCls = "text-[10px] uppercase tracking-wider text-white/40 mb-1"
  const inputCls = "w-full text-[12px] px-2 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded text-white/85 focus:outline-none focus:border-white/20"

  return (
    <div className="space-y-3 p-3 rounded-md border border-blue-400/20 bg-blue-500/[0.04]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-blue-300 font-medium">
          <Link2 className="h-3 w-3" /> Object 連携
        </div>
        {value && (
          <button
            onClick={() => onChange(undefined)}
            className="text-white/40 hover:text-red-400 text-[10px] inline-flex items-center gap-1"
          >
            <X className="h-3 w-3" /> 解除
          </button>
        )}
      </div>

      {/* ObjectType セレクト */}
      <div>
        <div className={labelCls}>Object Type</div>
        <select
          value={value?.type ?? ""}
          onChange={(e) => {
            const v = e.target.value
            if (!v) onChange(undefined)
            else onChange({ type: v })
          }}
          className={inputCls}
        >
          <option value="" className="bg-[#0c1017]">— 選択 —</option>
          {types.map((t) => (
            <option key={t.id} value={t.api_name} className="bg-[#0c1017]">
              {t.icon} {t.display_name}
            </option>
          ))}
        </select>
      </div>

      {/* Instance 検索＋選択 */}
      {value?.type && (
        <div>
          <div className={labelCls}>Instance（任意）</div>
          <div className="relative mb-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="検索"
              className={inputCls + " pl-7"}
            />
          </div>
          <div className="max-h-40 overflow-auto rounded border border-white/[0.06]">
            {loading ? (
              <div className="px-2 py-1.5 text-[11px] text-white/40">読込中...</div>
            ) : filteredInstances.length === 0 ? (
              <div className="px-2 py-1.5 text-[11px] text-white/40">該当なし</div>
            ) : (
              filteredInstances.map((inst) => {
                const sel = value.instanceId === inst.id
                return (
                  <button
                    key={inst.id}
                    onClick={() => onChange({ ...value, instanceId: sel ? undefined : inst.id })}
                    className={`block w-full text-left px-2 py-1.5 text-[11px] border-b border-white/[0.04] last:border-0 ${sel ? "bg-blue-500/15 text-blue-200" : "text-white/75 hover:bg-white/[0.04]"}`}
                  >
                    {inst.display_name}
                    <span className="ml-2 text-white/30 text-[10px]">{inst.id}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* property セレクト（KPI/Chart/Table 用） */}
      {showPropertyPicker && selectedType && (
        <div>
          <div className={labelCls}>データソース プロパティ</div>
          <select
            value={value?.property ?? ""}
            onChange={(e) => onChange({ ...(value as ObjectBinding), property: e.target.value || undefined })}
            className={inputCls}
          >
            <option value="" className="bg-[#0c1017]">— デフォルト KPI を使用 —</option>
            {selectedType.properties.map((p) => (
              <option key={p.id} value={p.api_name} className="bg-[#0c1017]">
                {p.display_name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
