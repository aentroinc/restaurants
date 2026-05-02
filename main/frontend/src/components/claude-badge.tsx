"use client"

import { useEffect, useState } from "react"
import { Brain, Zap, AlertCircle } from "lucide-react"
import { fetchAPI } from "@/lib/api"

interface AIStatus {
  claude_available: boolean
  status: string
  tool_count: number
  fallback_mode: boolean
  message: string
}

export function ClaudeBadge() {
  const [status, setStatus] = useState<AIStatus | null>(null)

  useEffect(() => {
    fetchAPI<AIStatus>("/api/v1/ai/status").then(setStatus).catch(() => {})
  }, [])

  if (!status) return null

  if (status.claude_available) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/15 border border-purple-400/30 text-purple-300 text-[10px]">
        <Brain className="w-3 h-3" />
        <span className="font-medium">Claude 接続済</span>
        <span className="text-purple-300/60">({status.tool_count} tool)</span>
      </div>
    )
  }
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-400/30 text-amber-400 text-[10px]" title={status.message}>
      <AlertCircle className="w-3 h-3" />
      <span className="font-medium">Rule-based fallback</span>
    </div>
  )
}
