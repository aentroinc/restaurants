"use client"

import { SYSTEMS } from "@/src/data/courses"

type Props = {
  selectedSystemIds: string[]
  onToggle: (id: string) => void
  onSetAll: (ids: string[]) => void
}

export function SystemsChecklist({ selectedSystemIds, onToggle, onSetAll }: Props) {
  const allIds = SYSTEMS.map((s) => s.id)
  const isAllOn = selectedSystemIds.length === allIds.length
  const isAllOff = selectedSystemIds.length === 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-ink-600 leading-relaxed max-w-[14rem]">
          取得できるデータにチェックを入れてください。データ充足度が効果係数に反映されます。
        </p>
        <div className="text-right">
          <div className="num text-base font-semibold text-navy-950">
            {selectedSystemIds.length}<span className="text-ink-400 text-xs font-normal">/{allIds.length}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-px bg-ink-200 border border-ink-200 text-[11px]">
        <button
          type="button"
          onClick={() => onSetAll(allIds)}
          disabled={isAllOn}
          className="flex-1 px-2 py-1.5 bg-white text-ink-700 hover:bg-ink-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          全選択
        </button>
        <button
          type="button"
          onClick={() => onSetAll([])}
          disabled={isAllOff}
          className="flex-1 px-2 py-1.5 bg-white text-ink-700 hover:bg-ink-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          全解除
        </button>
      </div>

      <ul className="divide-y divide-ink-200 border-t border-b border-ink-200">
        {SYSTEMS.map((s) => {
          const on = selectedSystemIds.includes(s.id)
          return (
            <li key={s.id}>
              <label className="flex gap-3 cursor-pointer py-2.5 group">
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    className="accent-navy-950"
                    checked={on}
                    onChange={() => onToggle(s.id)}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[10px] text-accent-600">{s.id}</span>
                    <span
                      className={`text-xs font-semibold ${
                        on ? "text-navy-950" : "text-ink-700"
                      } group-hover:text-navy-950`}
                    >
                      {s.name}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-ink-500 leading-snug mt-0.5">{s.description}</p>
                </div>
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
