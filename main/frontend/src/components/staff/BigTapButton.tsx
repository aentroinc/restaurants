"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type Tone = "primary" | "danger" | "success" | "ghost" | "warn"

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone
  icon?: React.ReactNode
  label: string
  sublabel?: string
  fullHeight?: boolean
}

const toneClass: Record<Tone, string> = {
  primary: "bg-emerald-500 hover:bg-emerald-400 text-white",
  danger: "bg-red-500 hover:bg-red-400 text-white",
  success: "bg-emerald-600 hover:bg-emerald-500 text-white",
  ghost: "bg-white/[0.06] hover:bg-white/[0.10] text-white border border-white/10",
  warn: "bg-amber-500 hover:bg-amber-400 text-black",
}

export function BigTapButton({
  tone = "primary",
  icon,
  label,
  sublabel,
  fullHeight,
  className,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      className={cn(
        "w-full rounded-2xl px-5 py-4 flex items-center gap-3 active:scale-[0.98] transition-all shadow-lg",
        "min-h-[64px] text-base font-semibold",
        fullHeight && "min-h-[120px] text-xl",
        toneClass[tone],
        className,
      )}
    >
      {icon ? <span className="shrink-0 text-2xl">{icon}</span> : null}
      <span className="flex flex-col text-left flex-1">
        <span>{label}</span>
        {sublabel ? <span className="text-xs font-normal opacity-80 mt-0.5">{sublabel}</span> : null}
      </span>
    </button>
  )
}
