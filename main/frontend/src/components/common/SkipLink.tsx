"use client"

/**
 * WCAG 2.4.1 — Bypass blocks. Renders a hidden-until-focused link that
 * jumps to the page main content. Pair with an element that has id="main".
 */
export function SkipLink({ targetId = "main" }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only fixed top-2 left-2 z-[100]
                 px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white
                 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0e14]"
    >
      メインコンテンツへスキップ
    </a>
  )
}
