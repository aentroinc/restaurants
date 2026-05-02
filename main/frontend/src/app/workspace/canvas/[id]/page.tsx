"use client"

import { useEffect, useState } from "react"
import { CanvasEditor } from "../CanvasEditor"
import { type CanvasAnalysis, loadAnalysis } from "@/lib/canvas-api"

export default function CanvasByIdPage({ params }: { params: { id: string } }) {
  const [analysis, setAnalysis] = useState<CanvasAnalysis | null | undefined>(undefined)

  useEffect(() => {
    loadAnalysis(params.id).then(setAnalysis).catch(() => setAnalysis(null))
  }, [params.id])

  if (analysis === undefined) {
    return (
      <div className="min-h-full bg-[#0a0e14] text-white/40 flex items-center justify-center text-[13px]">
        読み込み中...
      </div>
    )
  }

  return (
    <CanvasEditor
      key={params.id}
      initialAnalysisId={params.id}
      initialAnalysis={analysis}
    />
  )
}
