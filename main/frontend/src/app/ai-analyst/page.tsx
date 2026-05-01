"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import type { AIResponse } from "@/lib/types"
import { mockSuggestedQuestions } from "@/lib/mock-data"
import { Send, Brain, Lightbulb, BarChart3, Target, Link as LinkIcon, Plus, Presentation, Loader2 } from "lucide-react"
import Link from "next/link"

const confidenceLabels: Record<string, { label: string; variant: "success" | "warning" | "secondary" }> = {
  high: { label: "高確度", variant: "success" },
  medium: { label: "中確度", variant: "warning" },
  low: { label: "低確度", variant: "secondary" },
}

export default function AIAnalystPage() {
  const [messages, setMessages] = useState<{ question: string; response: AIResponse }[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  async function askQuestion(question: string) {
    if (!question.trim()) return
    setLoading(true)
    setInput("")
    try {
      const response = await fetchAPI<AIResponse>("/api/v1/ai/query", {
        method: "POST",
        body: JSON.stringify({ question }),
      })
      setMessages((prev) => [...prev, { question, response }])
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    askQuestion(input)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <ContextHeader title="AI アナリスト" description="自然言語で経営データを分析・質問" />

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 mb-4">
              <Brain className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">経営データについて質問してください</h2>
            <p className="text-sm text-gray-500 mb-6">AIが売上・コスト・人材など経営データを分析して回答します</p>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 max-w-3xl">
              {mockSuggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => askQuestion(q)}
                  className="rounded-lg border bg-white p-3 text-left text-sm text-gray-700 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className="space-y-4">
            {/* Question */}
            <div className="flex justify-end">
              <div className="rounded-lg bg-blue-600 px-4 py-2 text-white max-w-lg">
                {msg.question}
              </div>
            </div>

            {/* Response */}
            <Card>
              <CardContent className="p-6 space-y-5">
                {/* Conclusion */}
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-900">結論</span>
                    <Badge variant={confidenceLabels[msg.response.confidence]?.variant || "secondary"} className="text-xs ml-auto">
                      {confidenceLabels[msg.response.confidence]?.label || msg.response.confidence}
                    </Badge>
                  </div>
                  <p className="text-sm text-blue-800 leading-relaxed">{msg.response.conclusion}</p>
                </div>

                {/* Facts */}
                {msg.response.facts.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-semibold text-gray-700">根拠データ</span>
                    </div>
                    <div className="space-y-2">
                      {msg.response.facts.map((fact, i) => (
                        <div key={i} className="flex items-start gap-2 rounded border p-2 text-sm">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                          <div className="flex-1">{fact.statement}</div>
                          <Badge variant="outline" className="shrink-0 text-xs">{fact.source_metric}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hypotheses */}
                {msg.response.hypotheses.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-semibold text-gray-700">推定原因</span>
                    </div>
                    <div className="space-y-2">
                      {msg.response.hypotheses.map((h, i) => (
                        <div key={i} className="flex items-start justify-between rounded border p-2 text-sm">
                          <span>{h.statement}</span>
                          <Badge variant={confidenceLabels[h.confidence]?.variant || "secondary"} className="shrink-0 text-xs ml-2">
                            {confidenceLabels[h.confidence]?.label || h.confidence}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {msg.response.recommendations.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-semibold text-gray-700">推奨アクション</span>
                    </div>
                    <div className="space-y-2">
                      {msg.response.recommendations.map((r, i) => (
                        <div key={i} className="flex items-start justify-between rounded border p-2 text-sm">
                          <span>{r.action}</span>
                          <span className="shrink-0 text-blue-600 font-medium ml-2">{formatCurrency(r.expected_impact_amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Referenced Entities */}
                {msg.response.referenced_entities.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <LinkIcon className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-semibold text-gray-700">関連店舗</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {msg.response.referenced_entities.map((e, i) => (
                        <Link key={i} href={`/stores/${e.id}`}>
                          <Badge variant="outline" className="cursor-pointer hover:bg-blue-50">
                            {e.name}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" />タスク作成</Button>
                  <Button variant="outline" size="sm"><Presentation className="h-4 w-4 mr-1" />経営会議に追加</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">分析中...</span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t bg-white pt-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder="質問を入力してください（例: 先月利益が悪化した店舗は？）"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
        {messages.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {mockSuggestedQuestions.filter((q) => !messages.some((m) => m.question === q)).slice(0, 3).map((q) => (
              <button
                key={q}
                onClick={() => askQuestion(q)}
                className="rounded-full border px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
