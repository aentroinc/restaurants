"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import type { AIResponse } from "@/lib/types"
import type { AIResponseEnhanced } from "@/lib/types"
import { mockSuggestedQuestions, mockAIResponseEnhanced } from "@/lib/mock-data"
import { Send, Brain, Lightbulb, BarChart3, Target, Link as LinkIcon, Plus, Presentation, Loader2, Calculator, GitBranch, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react"
import Link from "next/link"

const confidenceLabels: Record<string, { label: string; variant: "success" | "warning" | "secondary" }> = {
  high: { label: "高確度", variant: "success" },
  medium: { label: "中確度", variant: "warning" },
  low: { label: "低確度", variant: "secondary" },
}

type CombinedResponse = AIResponse & Partial<AIResponseEnhanced>

export default function AIAnalystPage() {
  const [messages, setMessages] = useState<{ question: string; response: CombinedResponse }[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  // Task dialog
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState("")
  const [taskCreated, setTaskCreated] = useState(false)

  // Meeting dialog
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false)
  const [meetingAdded, setMeetingAdded] = useState(false)
  const [meetingQuestion, setMeetingQuestion] = useState("")

  async function askQuestion(question: string) {
    if (!question.trim()) return
    setLoading(true)
    setInput("")
    try {
      const response = await fetchAPI<AIResponse>("/api/v1/ai/query", {
        method: "POST",
        body: JSON.stringify({ question }),
      })
      // merge enhanced data for demo
      const enhanced: CombinedResponse = {
        ...response,
        ...mockAIResponseEnhanced,
        conclusion: response.conclusion,
        facts: response.facts as any,
        hypotheses: response.hypotheses as any,
        recommendations: response.recommendations as any,
        confidence: response.confidence,
        referenced_entities: response.referenced_entities,
      }
      setMessages((prev) => [...prev, { question, response: enhanced }])
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    askQuestion(input)
  }

  function openTaskFromRecommendation(action: string) {
    setTaskTitle(action)
    setTaskCreated(false)
    setTaskDialogOpen(true)
  }

  function handleCreateTask() {
    setTaskCreated(true)
    setTimeout(() => { setTaskDialogOpen(false); setTaskCreated(false) }, 1500)
  }

  function openMeetingDialog(question: string) {
    setMeetingQuestion(question)
    setMeetingAdded(false)
    setMeetingDialogOpen(true)
  }

  function handleMeetingConfirm() {
    setMeetingAdded(true)
    setTimeout(() => { setMeetingDialogOpen(false); setMeetingAdded(false) }, 1500)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <ContextHeader title="AI アナリスト" description="自然言語で経営データを分析・質問" />

      {/* Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={(open) => { setTaskDialogOpen(open); if (!open) setTaskCreated(false) }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>タスク作成</DialogTitle></DialogHeader>
          {taskCreated ? (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
              <p className="text-lg font-semibold text-gray-900">タスクを作成しました</p>
            </div>
          ) : (
            <>
              <div className="py-4">
                <p className="text-sm text-gray-700 mb-3">AIの推奨アクションからタスクを作成します。</p>
                <div className="rounded border p-3 bg-gray-50 text-sm">
                  <div className="font-medium">{taskTitle}</div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>キャンセル</Button>
                <Button onClick={handleCreateTask}>作成</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Meeting Dialog */}
      <Dialog open={meetingDialogOpen} onOpenChange={(open) => { setMeetingDialogOpen(open); if (!open) setMeetingAdded(false) }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>経営会議に追加</DialogTitle></DialogHeader>
          {meetingAdded ? (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
              <p className="text-lg font-semibold text-gray-900">追加しました</p>
              <p className="text-sm text-gray-500 mt-1">次回の経営会議パックに追加しました</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-700 py-4">このAI分析結果を経営会議パックに追加しますか？</p>
              <div className="rounded border p-3 bg-gray-50 text-sm">
                <div className="font-medium">{meetingQuestion}</div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setMeetingDialogOpen(false)}>キャンセル</Button>
                <Button onClick={handleMeetingConfirm}>追加する</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

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
                      <BarChart3 className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-semibold text-gray-700">根拠データ</span>
                      <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">Fact</Badge>
                    </div>
                    <div className="space-y-2">
                      {msg.response.facts.map((fact, i) => (
                        <div key={i} className="flex items-start gap-2 rounded border border-blue-100 bg-blue-50/30 p-2 text-sm">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                          <div className="flex-1">{fact.statement}</div>
                          <Badge variant="outline" className="shrink-0 text-xs">{fact.source_metric}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Calculations */}
                {msg.response.calculations && msg.response.calculations.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-semibold text-gray-700">計算詳細</span>
                      <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">Calculation</Badge>
                    </div>
                    <div className="space-y-2">
                      {msg.response.calculations.map((calc, i) => (
                        <div key={i} className="flex items-center justify-between rounded border border-purple-100 bg-purple-50/30 p-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-500" />
                            <span className="font-medium">{calc.name}</span>
                            <span className="font-mono text-xs text-gray-500">= {calc.formula}</span>
                          </div>
                          <span className="font-bold text-purple-700">{calc.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hypotheses */}
                {msg.response.hypotheses.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-semibold text-gray-700">推定原因</span>
                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">Hypothesis</Badge>
                    </div>
                    <div className="space-y-2">
                      {msg.response.hypotheses.map((h, i) => (
                        <div key={i} className="flex items-start justify-between rounded border border-amber-100 bg-amber-50/30 p-2 text-sm">
                          <div className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                            <span>{h.statement}</span>
                          </div>
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
                      <Target className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-semibold text-gray-700">推奨アクション</span>
                      <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">Recommendation</Badge>
                    </div>
                    <div className="space-y-2">
                      {msg.response.recommendations.map((r, i) => (
                        <div key={i} className="flex items-start justify-between rounded border border-green-100 bg-green-50/30 p-2 text-sm">
                          <div className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                            <div>
                              <span>{r.action}</span>
                              {"requires_human_approval" in r && (r as any).requires_human_approval && (
                                <Badge variant="warning" className="text-[10px] ml-2">要承認</Badge>
                              )}
                            </div>
                          </div>
                          <span className="shrink-0 text-blue-600 font-medium ml-2">{formatCurrency(r.expected_impact_amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lineage Info */}
                {msg.response.lineage && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <GitBranch className="h-4 w-4 text-indigo-500" />
                      <span className="text-sm font-semibold text-gray-700">系譜情報</span>
                    </div>
                    <div className="rounded border border-indigo-100 bg-indigo-50/30 p-3 space-y-3">
                      {msg.response.lineage.referenced_kpis.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1">参照KPI</div>
                          <div className="flex flex-wrap gap-1">
                            {msg.response.lineage.referenced_kpis.map((kpi, i) => (
                              <Link key={i} href="/admin/kpi-definitions">
                                <Badge variant="outline" className="text-xs cursor-pointer hover:bg-indigo-100">
                                  {kpi.kpi_code} v{kpi.version}
                                </Badge>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                      {msg.response.lineage.referenced_objects.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1">参照オブジェクト</div>
                          <div className="flex flex-wrap gap-1">
                            {msg.response.lineage.referenced_objects.map((obj, i) => (
                              <Link key={i} href={`/stores/${obj.object_id}`}>
                                <Badge variant="outline" className="text-xs cursor-pointer hover:bg-indigo-100">
                                  {obj.display_name}
                                </Badge>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-4 text-xs text-gray-500">
                        {msg.response.lineage.data_period && <span>期間: {msg.response.lineage.data_period}</span>}
                        {msg.response.lineage.data_freshness && <span>鮮度: {new Date(msg.response.lineage.data_freshness).toLocaleString("ja-JP")}</span>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Limitations */}
                {msg.response.limitations && msg.response.limitations.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-semibold text-gray-700">制限事項</span>
                    </div>
                    <div className="rounded border border-orange-100 bg-orange-50/30 p-3 space-y-1">
                      {msg.response.limitations.map((l, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-orange-800">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                          <span>{l}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Referenced Entities */}
                {msg.response.referenced_entities && msg.response.referenced_entities.length > 0 && (
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
                  <Button variant="outline" size="sm" onClick={() => openTaskFromRecommendation(msg.response.recommendations[0]?.action || msg.question)}>
                    <Plus className="h-4 w-4 mr-1" />タスク作成
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openMeetingDialog(msg.question)}>
                    <Presentation className="h-4 w-4 mr-1" />経営会議に追加
                  </Button>
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
