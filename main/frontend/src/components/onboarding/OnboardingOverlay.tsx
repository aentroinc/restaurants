"use client"

import { useEffect, useState } from "react"
import { ChevronRight, X, Check } from "lucide-react"
import { useOnboarding, type OnboardingRole } from "@/lib/onboarding"

type Rect = { top: number; left: number; width: number; height: number }

export function OnboardingOverlay({ role }: { role: OnboardingRole }) {
  const { active, stepIndex, steps, currentStep, next, skip, finish } = useOnboarding(role)
  const [rect, setRect] = useState<Rect | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (!active || !currentStep) return
    if (currentStep.target === "*") {
      setRect(null)
      setMissing(false)
      return
    }
    function locate() {
      const el = document.querySelector(currentStep.target) as HTMLElement | null
      if (!el) {
        setRect(null)
        setMissing(true)
        return
      }
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
      setMissing(false)
      el.scrollIntoView({ behavior: "smooth", block: "center" })
    }
    locate()
    const t = window.setInterval(locate, 800)
    window.addEventListener("resize", locate)
    window.addEventListener("scroll", locate, true)
    return () => {
      window.clearInterval(t)
      window.removeEventListener("resize", locate)
      window.removeEventListener("scroll", locate, true)
    }
  }, [active, stepIndex, currentStep])

  if (!active || !currentStep) return null

  const isLast = stepIndex >= steps.length - 1
  const tooltip = computeTooltipPosition(rect, currentStep.placement)

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none" aria-live="polite">
      {/* dimmed backdrop with spotlight cutout via box-shadow trick */}
      {rect && !missing ? (
        <div
          className="absolute pointer-events-auto"
          style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            borderRadius: 12,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.72)",
            border: "2px solid rgba(16,185,129,0.85)",
            transition: "all 0.25s ease",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/72 pointer-events-auto" />
      )}

      {/* tooltip card */}
      <div
        className="absolute pointer-events-auto bg-[#0f1620] border border-emerald-500/40 rounded-xl shadow-2xl p-4 w-[300px] max-w-[90vw] text-white"
        style={{ top: tooltip.top, left: tooltip.left }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="text-[11px] font-mono text-emerald-400 uppercase tracking-wide">
            {stepIndex + 1} / {steps.length}
          </div>
          <button
            onClick={skip}
            className="text-white/40 hover:text-white/80 -mr-1 -mt-1 p-1"
            aria-label="チュートリアルを終了"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="text-[15px] font-semibold mb-1.5">{currentStep.title}</div>
        <div className="text-[13px] text-white/70 leading-relaxed mb-4">{currentStep.body}</div>
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={skip}
            className="text-[12px] text-white/50 hover:text-white/80 px-2 py-1.5"
          >
            スキップ
          </button>
          <div className="flex items-center gap-1.5">
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full ${
                    i === stepIndex ? "bg-emerald-400" : "bg-white/20"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={isLast ? finish : next}
              className="ml-2 inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-[12px] px-3 py-1.5 rounded-md"
            >
              {isLast ? (
                <>
                  終了 <Check className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  次へ <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function computeTooltipPosition(
  rect: Rect | null,
  placement?: "top" | "bottom" | "left" | "right" | "center",
): { top: number; left: number } {
  const w = typeof window !== "undefined" ? window.innerWidth : 1024
  const h = typeof window !== "undefined" ? window.innerHeight : 768
  const tipW = 300
  const tipH = 180
  const gap = 16

  if (!rect) {
    // center on viewport
    return { top: Math.max(20, h / 2 - tipH / 2), left: Math.max(20, w / 2 - tipW / 2) }
  }

  const place = placement || "bottom"
  let top = rect.top + rect.height + gap
  let left = rect.left + rect.width / 2 - tipW / 2

  if (place === "top") top = rect.top - tipH - gap
  if (place === "left") {
    top = rect.top + rect.height / 2 - tipH / 2
    left = rect.left - tipW - gap
  }
  if (place === "right") {
    top = rect.top + rect.height / 2 - tipH / 2
    left = rect.left + rect.width + gap
  }
  if (place === "center") {
    top = h / 2 - tipH / 2
    left = w / 2 - tipW / 2
  }

  // Clamp to viewport
  top = Math.max(12, Math.min(top, h - tipH - 12))
  left = Math.max(12, Math.min(left, w - tipW - 12))
  return { top, left }
}
