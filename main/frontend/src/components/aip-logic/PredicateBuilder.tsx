"use client"

import { useState } from "react"
import { KPI_OPTIONS, type PredicateNode } from "@/lib/aip-logic-api"
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react"

const CMP_OPS = ["<", "<=", "==", "!=", ">=", ">"] as const
const BOOL_OPS = ["and", "or", "not"] as const

type Props = {
  value: PredicateNode
  onChange: (next: PredicateNode) => void
}

function emptyCmp(): PredicateNode {
  return { op: "<", left: { kpi: "net_sales" }, right: { const: 0 } }
}

function isBool(op: string | undefined) {
  return op === "and" || op === "or" || op === "not"
}

function isCmp(op: string | undefined) {
  return op ? (CMP_OPS as readonly string[]).includes(op) : false
}

function NodeEditor({ node, onChange, onRemove, depth = 0 }: {
  node: PredicateNode
  onChange: (n: PredicateNode) => void
  onRemove?: () => void
  depth?: number
}) {
  const [collapsed, setCollapsed] = useState(false)
  const op = node.op || "<"

  if (isBool(op)) {
    const isNot = op === "not"
    return (
      <div
        className="rounded border border-white/10 bg-white/[0.02] p-2"
        style={{ marginLeft: depth ? 8 : 0 }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="text-white/50 hover:text-white"
          >
            {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <select
            value={op}
            onChange={(e) => {
              const newOp = e.target.value
              if (isCmp(newOp)) {
                onChange({ ...emptyCmp(), op: newOp })
              } else if (newOp === "not") {
                onChange({ op: "not", child: emptyCmp() })
              } else {
                onChange({ op: newOp, children: node.children ?? [emptyCmp()] })
              }
            }}
            className="bg-[#0e1320] border border-white/15 text-white text-[12px] rounded px-2 py-1"
          >
            {[...BOOL_OPS, ...CMP_OPS].map((o) => (
              <option key={o} value={o}>{o.toUpperCase()}</option>
            ))}
          </select>
          {!isNot && (
            <button
              type="button"
              onClick={() => onChange({ ...node, children: [...(node.children ?? []), emptyCmp()] })}
              className="text-[11px] text-blue-300 hover:text-blue-200 inline-flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> 条件追加
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="ml-auto text-white/40 hover:text-red-400"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
        {!collapsed && (
          <div className="mt-2 space-y-2 pl-4 border-l border-white/10">
            {isNot ? (
              <NodeEditor
                node={node.child ?? emptyCmp()}
                onChange={(c) => onChange({ op: "not", child: c })}
                depth={depth + 1}
              />
            ) : (
              (node.children ?? []).map((c, i) => (
                <NodeEditor
                  key={i}
                  node={c}
                  onChange={(nc) => {
                    const next = [...(node.children ?? [])]
                    next[i] = nc
                    onChange({ ...node, children: next })
                  }}
                  onRemove={() => {
                    const next = [...(node.children ?? [])]
                    next.splice(i, 1)
                    onChange({ ...node, children: next })
                  }}
                  depth={depth + 1}
                />
              ))
            )}
          </div>
        )}
      </div>
    )
  }

  // comparison
  const leftKpi = (node.left && (node.left.kpi as string)) || "net_sales"
  const rightConst = (node.right && (node.right.const as number)) ?? 0
  return (
    <div
      className="flex items-center gap-2 rounded border border-white/10 bg-white/[0.02] p-2"
      style={{ marginLeft: depth ? 8 : 0 }}
    >
      <select
        value={leftKpi}
        onChange={(e) => onChange({ ...node, left: { kpi: e.target.value } })}
        className="bg-[#0e1320] border border-white/15 text-white text-[12px] rounded px-2 py-1"
      >
        {KPI_OPTIONS.map((k) => (
          <option key={k.value} value={k.value}>{k.label}</option>
        ))}
      </select>
      <select
        value={op}
        onChange={(e) => onChange({ ...node, op: e.target.value })}
        className="bg-[#0e1320] border border-white/15 text-white text-[12px] rounded px-2 py-1"
      >
        {[...CMP_OPS, ...BOOL_OPS].map((o) => (
          <option key={o} value={o}>{o.toUpperCase()}</option>
        ))}
      </select>
      <input
        type="number"
        value={rightConst}
        onChange={(e) => onChange({ ...node, right: { const: parseFloat(e.target.value) } })}
        className="bg-[#0e1320] border border-white/15 text-white text-[12px] rounded px-2 py-1 w-28"
      />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto text-white/40 hover:text-red-400"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

export default function PredicateBuilder({ value, onChange }: Props) {
  const node = value && Object.keys(value).length ? (value as PredicateNode) : emptyCmp()
  return (
    <div className="space-y-2">
      <div className="text-[11px] text-white/50">
        条件式 (AST) — KPI/演算子/閾値を組み合わせて、複数の AND/OR が作れます。
      </div>
      <NodeEditor node={node} onChange={onChange} />
      <div className="flex gap-2">
        <button
          type="button"
          className="text-[11px] text-blue-300 hover:text-blue-200 inline-flex items-center gap-1"
          onClick={() => onChange({ op: "and", children: [node, emptyCmp()] })}
        >
          <Plus className="w-3 h-3" /> AND グループに包む
        </button>
        <button
          type="button"
          className="text-[11px] text-blue-300 hover:text-blue-200 inline-flex items-center gap-1"
          onClick={() => onChange({ op: "or", children: [node, emptyCmp()] })}
        >
          <Plus className="w-3 h-3" /> OR グループに包む
        </button>
      </div>
    </div>
  )
}
