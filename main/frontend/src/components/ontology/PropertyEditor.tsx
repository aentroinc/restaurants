"use client"

import { Trash2 } from "lucide-react"
import type { OntoProperty, DataType, PIILevel } from "@/lib/ontology-api"

const dataTypes: DataType[] = ["string", "int", "float", "bool", "datetime", "json"]
const piiLevels: PIILevel[] = ["none", "low", "medium", "high"]

interface PropertyEditorProps {
  property: OntoProperty
  onChange: (next: OntoProperty) => void
  onDelete: () => void
}

const piiColor: Record<PIILevel, string> = {
  none: "text-white/40",
  low: "text-emerald-400",
  medium: "text-amber-400",
  high: "text-red-400",
}

export default function PropertyEditor({ property, onChange, onDelete }: PropertyEditorProps) {
  const set = <K extends keyof OntoProperty>(key: K, value: OntoProperty[K]) =>
    onChange({ ...property, [key]: value })

  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.02]">
      <td className="px-3 py-2">
        <input
          value={property.api_name}
          onChange={(e) => set("api_name", e.target.value)}
          className="bg-transparent text-[12px] font-mono text-white/70 border-none outline-none w-full focus:text-white/90"
          placeholder="field_name"
        />
      </td>
      <td className="px-3 py-2">
        <input
          value={property.display_name}
          onChange={(e) => set("display_name", e.target.value)}
          className="bg-transparent text-[12px] text-white/70 border-none outline-none w-full focus:text-white/90"
          placeholder="表示名"
        />
      </td>
      <td className="px-3 py-2">
        <select
          value={property.data_type}
          onChange={(e) => set("data_type", e.target.value as DataType)}
          className="text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-white/70"
        >
          {dataTypes.map((dt) => <option key={dt} value={dt}>{dt}</option>)}
        </select>
      </td>
      <td className="px-3 py-2 text-center">
        <input
          type="checkbox"
          checked={property.required}
          onChange={(e) => set("required", e.target.checked)}
          className="accent-blue-500"
        />
      </td>
      <td className="px-3 py-2">
        <select
          value={property.pii_level}
          onChange={(e) => set("pii_level", e.target.value as PIILevel)}
          className={`text-[12px] bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 ${piiColor[property.pii_level]}`}
        >
          {piiLevels.map((l) => <option key={l} value={l} className="text-white/80">{l}</option>)}
        </select>
      </td>
      <td className="px-3 py-2">
        <input
          value={(property.enum_values || []).join(",")}
          onChange={(e) => set("enum_values", e.target.value ? e.target.value.split(",").map((s) => s.trim()) : undefined)}
          className="bg-transparent text-[11px] font-mono text-white/60 border-none outline-none w-full focus:text-white/90"
          placeholder="a,b,c"
        />
      </td>
      <td className="px-3 py-2">
        <input
          value={property.validation || ""}
          onChange={(e) => set("validation", e.target.value || undefined)}
          className="bg-transparent text-[11px] font-mono text-white/60 border-none outline-none w-full focus:text-white/90"
          placeholder="^[a-z]+$"
        />
      </td>
      <td className="px-2 py-2">
        <button onClick={onDelete} className="text-white/20 hover:text-red-400 transition-colors p-1">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  )
}
