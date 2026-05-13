"use client"

import type { ConfidenceLevel, SimulationInputs } from "@/src/types"

type Props = {
  inputs: SimulationInputs
  onChange: (next: Partial<SimulationInputs>) => void
}

const CONF_OPTIONS: { value: ConfidenceLevel; label: string; coef: string }[] = [
  { value: "conservative", label: "保守的", coef: "0.75" },
  { value: "standard", label: "標準", coef: "1.00" },
  { value: "aggressive", label: "強気", coef: "1.20" },
]

export function CompanyInputPanel({ inputs, onChange }: Props) {
  const margin =
    inputs.annualSalesOku > 0
      ? ((inputs.operatingProfitOku / inputs.annualSalesOku) * 100).toFixed(2)
      : "—"

  return (
    <div className="space-y-6">
      <Field label="会社名">
        <input
          type="text"
          className="input"
          value={inputs.companyName}
          onChange={(e) => onChange({ companyName: e.target.value })}
          placeholder="◯◯フードサービス株式会社"
        />
      </Field>

      <div className="grid grid-cols-2 gap-x-5 gap-y-5">
        <Field label="年間売上" unit="億円">
          <input
            type="number"
            className="input num text-right"
            value={inputs.annualSalesOku}
            min={0}
            step={0.01}
            onChange={(e) => onChange({ annualSalesOku: Number(e.target.value) })}
          />
        </Field>
        <Field label="営業利益" unit="億円">
          <input
            type="number"
            className="input num text-right"
            value={inputs.operatingProfitOku}
            step={0.01}
            onChange={(e) => onChange({ operatingProfitOku: Number(e.target.value) })}
          />
        </Field>
        <Field label="店舗数" unit="店舗">
          <input
            type="number"
            className="input num text-right"
            value={inputs.storeCount}
            min={1}
            step={1}
            onChange={(e) => onChange({ storeCount: Number(e.target.value) })}
          />
        </Field>
        <Field label="営業利益率" unit="%">
          <div className="input num text-right text-ink-500 cursor-not-allowed">{margin}</div>
        </Field>
      </div>

      <div className="space-y-5 pt-4 border-t border-ink-200">
        <Slider
          label="展開率"
          value={inputs.rolloutRate}
          onChange={(v) => onChange({ rolloutRate: v })}
          min={5}
          max={100}
          step={5}
        />
        <Slider
          label="AI活用定着率"
          value={inputs.adoptionRate}
          onChange={(v) => onChange({ adoptionRate: v })}
          min={30}
          max={100}
          step={5}
        />

        <div>
          <div className="label-eyebrow mb-2">信頼度</div>
          <div className="grid grid-cols-3 border border-ink-200">
            {CONF_OPTIONS.map((o, idx) => {
              const on = inputs.confidenceLevel === o.value
              return (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => onChange({ confidenceLevel: o.value })}
                  className={`relative py-2.5 text-center transition ${
                    on
                      ? "bg-navy-950 text-white"
                      : "bg-white text-ink-700 hover:bg-ink-50"
                  } ${idx > 0 ? "border-l border-ink-200" : ""}`}
                >
                  <div className="text-xs font-semibold">{o.label}</div>
                  <div className={`text-[10px] num mt-0.5 ${on ? "text-ink-300" : "text-ink-500"}`}>
                    ×{o.coef}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <details className="border-t border-ink-200 pt-4 group">
        <summary className="cursor-pointer text-[11px] uppercase tracking-[0.18em] text-ink-700 font-semibold list-none flex items-center justify-between">
          <span>会計ビュー（資産計上・償却）</span>
          <span className="text-ink-400 group-open:rotate-180 transition text-[10px]">▾</span>
        </summary>
        <div className="mt-4 space-y-4">
          <Slider
            label="Capex比率"
            value={inputs.capexRatio}
            onChange={(v) => onChange({ capexRatio: v })}
            min={0}
            max={100}
            step={5}
          />
          <Field label="償却年数" unit="年">
            <input
              type="number"
              className="input num text-right"
              min={3}
              max={7}
              value={inputs.amortizationYears}
              onChange={(e) => onChange({ amortizationYears: Number(e.target.value) })}
            />
          </Field>
          <label className="flex items-center gap-2 text-xs text-ink-700 cursor-pointer">
            <input
              type="checkbox"
              checked={inputs.includeAccountingView}
              onChange={(e) => onChange({ includeAccountingView: e.target.checked })}
              className="accent-navy-950"
            />
            会計上のPLビューを表示
          </label>
        </div>
      </details>
    </div>
  )
}

function Field({
  label,
  unit,
  children,
}: {
  label: string
  unit?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1">
        <span className="label-eyebrow">{label}</span>
        {unit && <span className="text-[10px] text-ink-400 font-mono">{unit}</span>}
      </div>
      {children}
    </label>
  )
}

function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
}) {
  const pct = Math.round(value * 100)
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="label-eyebrow">{label}</span>
        <span className="num text-sm text-navy-950 font-semibold">{pct}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={pct}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="w-full accent-navy-950"
      />
    </div>
  )
}
