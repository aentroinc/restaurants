"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import { streamChat, type ChatEvent } from "@/lib/ai-stream"
import type { AIResponse } from "@/lib/types"
import { mockSuggestedQuestions, mockAIResponseEnhanced } from "@/lib/mock-data"
import { Send, Brain, Plus, Presentation, Loader2, CheckCircle2, Wrench } from "lucide-react"

interface ToolUseBlock {
  kind: "tool_use"
  name: string
  input: any
}

interface ToolResultBlock {
  kind: "tool_result"
  name: string
  output: any
}

interface TextBlock {
  kind: "text"
  content: string
}

type MessageBlock = TextBlock | ToolUseBlock | ToolResultBlock

interface ChatMessage {
  role: "user" | "assistant"
  blocks: MessageBlock[]
}

export default function AIAnalystPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Task dialog
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState("")
  const [taskCreated, setTaskCreated] = useState(false)

  // Meeting dialog
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false)
  const [meetingAdded, setMeetingAdded] = useState(false)
  const [meetingQuestion, setMeetingQuestion] = useState("")

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || ""

  async function askQuestion(question: string) {
    if (!question.trim() || loading) return
    setLoading(true)
    setInput("")

    const userMsg: ChatMessage = { role: "user", blocks: [{ kind: "text", content: question }] }
    setMessages((prev) => [...prev, userMsg])

    // Try SSE streaming first
    const assistantMsg: ChatMessage = { role: "assistant", blocks: [] }
    let streamWorked = false

    try {
      if (apiUrl) {
        const blocks: MessageBlock[] = []
        for await (const event of streamChat(question, sessionId, apiUrl)) {
          streamWorked = true
          if (event.type === "text" && event.content) {
            const lastBlock = blocks[blocks.length - 1]
            if (lastBlock?.kind === "text") {
              lastBlock.content += event.content
            } else {
              blocks.push({ kind: "text", content: event.content })
            }
          } else if (event.type === "tool_use") {
            blocks.push({ kind: "tool_use", name: event.name!, input: event.input })
          } else if (event.type === "tool_result") {
            blocks.push({ kind: "tool_result", name: event.name!, output: event.output })
          } else if (event.type === "done") {
            if (event.session_id) setSessionId(event.session_id)
          } else if (event.type === "error") {
            streamWorked = false
            break
          }
          setMessages((prev) => {
            const copy = [...prev]
            const last = copy[copy.length - 1]
            if (last?.role === "assistant") {
              copy[copy.length - 1] = { role: "assistant", blocks: [...blocks] }
            } else {
              copy.push({ role: "assistant", blocks: [...blocks] })
            }
            return copy
          })
        }
        if (streamWorked && blocks.length > 0) {
          setLoading(false)
          return
        }
      }
    } catch {
      // fall through to rule-based fallback
    }

    // Fallback: rule-based /ai/query
    try {
      const response = await fetchAPI<AIResponse>("/api/v1/ai/query", {
        method: "POST",
        body: JSON.stringify({ question }),
      })
      const parts: string[] = []
      parts.push(`**結論:** ${response.conclusion}\n`)
      if (response.facts?.length) {
        parts.push("\n**根拠データ:**")
        response.facts.forEach((f: any) => parts.push(`- ${typeof f === "string" ? f : f.statement}`))
      }
      if (response.hypotheses?.length) {
        parts.push("\n**推定原因:**")
        response.hypotheses.forEach((h: any) => parts.push(`- ${typeof h === "string" ? h : h.statement}`))
      }
      if (response.recommendations?.length) {
        parts.push("\n**推奨アクション:**")
        response.recommendations.forEach((r: any) => parts.push(`- ${typeof r === "string" ? r : r.action}`))
      }
      setMessages((prev) => {
        const copy = [...prev]
        const last = copy[copy.length - 1]
        if (last?.role === "assistant") {
          copy[copy.length - 1] = { role: "assistant", blocks: [{ kind: "text", content: parts.join("\n") }] }
        } else {
          copy.push({ role: "assistant", blocks: [{ kind: "text", content: parts.join("\n") }] })
        }
        return copy
      })
    } catch {
      setMessages((prev) => {
        const copy = [...prev]
        copy.push({ role: "assistant", blocks: [{ kind: "text", content: "分析中にエラーが発生しました。もう一度お試しください。" }] })
        return copy
      })
    }
    setLoading(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    askQuestion(input)
  }

  function openTaskDialog(text: string) {
    setTaskTitle(text)
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

  function getLastUserQuestion(): string {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        const tb = messages[i].blocks.find((b) => b.kind === "text") as TextBlock | undefined
        if (tb) return tb.content
      }
    }
    return ""
  }

  function renderMarkdownLike(text: string) {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("**") && line.includes(":**")) {
        const match = line.match(/^\*\*(.+?):\*\*\s*(.*)$/)
        if (match) return <p key={i} className="mb-1"><span className="font-semibold text-white/90">{match[1]}:</span> {match[2]}</p>
      }
      if (line.startsWith("- ")) return <p key={i} className="mb-0.5 pl-3 text-white/60">• {line.slice(2)}</p>
      if (line.trim() === "") return <div key={i} className="h-2" />
      return <p key={i} className="mb-1 text-white/70">{line}</p>
    })
  }

  function summarizeToolOutput(output: any): string {
    if (!output) return "（結果なし）"
    if (typeof output === "string") return output.slice(0, 200)
    if (Array.isArray(output)) return `${output.length}件のデータを取得`
    if (typeof output === "object") {
      const keys = Object.keys(output)
      return keys.slice(0, 4).map((k) => `${k}: ${JSON.stringify(output[k]).slice(0, 40)}`).join(", ")
    }
    return String(output).slice(0, 200)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-[#0a0e14] text-white/80">
      <ContextHeader title="AI アナリスト" description="自然言語で経営データを分析・質問" />

      {/* Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={(open) => { setTaskDialogOpen(open); if (!open) setTaskCreated(false) }}>
        <DialogContent className="bg-[#0c1017] border-white/[0.1] text-white/80">
          <DialogHeader><DialogTitle className="text-white/90">タスク作成</DialogTitle></DialogHeader>
          {taskCreated ? (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
              <p className="text-lg font-semibold text-white/90">タスクを作成しました</p>
            </div>
          ) : (
            <>
              <div className="py-4">
                <p className="text-sm text-white/60 mb-3">AIの推奨アクションからタスクを作成します。</p>
                <div className="rounded border border-white/[0.08] p-3 bg-white/[0.02] text-sm text-white/70">
                  <div className="font-medium">{taskTitle}</div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTaskDialogOpen(false)} className="border-white/[0.1] text-white/60 hover:bg-white/[0.04]">キャンセル</Button>
                <Button onClick={handleCreateTask} className="bg-blue-500 hover:bg-blue-600 text-white">作成</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Meeting Dialog */}
      <Dialog open={meetingDialogOpen} onOpenChange={(open) => { setMeetingDialogOpen(open); if (!open) setMeetingAdded(false) }}>
        <DialogContent className="bg-[#0c1017] border-white/[0.1] text-white/80">
          <DialogHeader><DialogTitle className="text-white/90">経営会議に追加</DialogTitle></DialogHeader>
          {meetingAdded ? (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
              <p className="text-lg font-semibold text-white/90">追加しました</p>
              <p className="text-sm text-white/50 mt-1">次回の経営会議パックに追加しました</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-white/60 py-4">このAI分析結果を経営会議パックに追加しますか？</p>
              <div className="rounded border border-white/[0.08] p-3 bg-white/[0.02] text-sm text-white/70">
                <div className="font-medium">{meetingQuestion}</div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setMeetingDialogOpen(false)} className="border-white/[0.1] text-white/60 hover:bg-white/[0.04]">キャンセル</Button>
                <Button onClick={handleMeetingConfirm} className="bg-blue-500 hover:bg-blue-600 text-white">追加する</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 px-5 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 mb-4">
              <Brain className="h-8 w-8 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-white/90 mb-2">経営データについて質問してください</h2>
            <p className="text-sm text-white/50 mb-6">AIが売上・コスト・人材など経営データを分析して回答します</p>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 max-w-3xl">
              {mockSuggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => askQuestion(q)}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 text-left text-sm text-white/60 hover:bg-white/[0.06] hover:border-white/[0.15] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "user" ? (
              <div className="rounded-lg bg-blue-600/80 px-4 py-2.5 text-white max-w-lg text-[13px]">
                {(msg.blocks[0] as TextBlock).content}
              </div>
            ) : (
              <div className="max-w-3xl w-full space-y-3">
                {msg.blocks.map((block, bi) => {
                  if (block.kind === "text") {
                    return (
                      <div key={bi} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] leading-relaxed">
                        {renderMarkdownLike(block.content)}
                      </div>
                    )
                  }
                  if (block.kind === "tool_use") {
                    return (
                      <div key={bi} className="rounded-lg border border-cyan-400/20 bg-cyan-400/[0.04] px-4 py-2.5 text-[12px]">
                        <div className="flex items-center gap-2 text-cyan-400/80">
                          <Wrench className="w-3.5 h-3.5" />
                          <span className="font-mono font-medium">{block.name}</span>
                        </div>
                        <div className="mt-1 text-white/40 font-mono text-[11px] truncate">
                          {JSON.stringify(block.input).slice(0, 120)}
                        </div>
                      </div>
                    )
                  }
                  if (block.kind === "tool_result") {
                    return (
                      <div key={bi} className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.04] px-4 py-2.5 text-[12px]">
                        <div className="flex items-center gap-2 text-emerald-400/80">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="font-mono font-medium">{block.name}</span>
                          <span className="text-white/40 ml-1">結果</span>
                        </div>
                        <div className="mt-1 text-white/50 text-[11px]">
                          {summarizeToolOutput(block.output)}
                        </div>
                      </div>
                    )
                  }
                  return null
                })}

                {/* Action buttons after last assistant message */}
                {idx === messages.length - 1 && !loading && (
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={() => openTaskDialog(getLastUserQuestion())} className="border-white/[0.08] text-white/50 hover:bg-white/[0.04] text-[11px] h-7">
                      <Plus className="h-3.5 w-3.5 mr-1" />タスク作成
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openMeetingDialog(getLastUserQuestion())} className="border-white/[0.08] text-white/50 hover:bg-white/[0.04] text-[11px] h-7">
                      <Presentation className="h-3.5 w-3.5 mr-1" />経営会議に追加
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-white/40">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">分析中...</span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-white/[0.06] bg-[#0a0e14] px-5 pt-4 pb-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder="質問を入力してください（例: 先月利益が悪化した店舗は？）"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 bg-white/[0.04] border-white/[0.08] text-white/80 placeholder:text-white/30"
          />
          <Button type="submit" disabled={loading || !input.trim()} className="bg-blue-500 hover:bg-blue-600 text-white">
            <Send className="h-4 w-4" />
          </Button>
        </form>
        {messages.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {mockSuggestedQuestions.filter((q) => !messages.some((m) => m.role === "user" && m.blocks.some((b) => b.kind === "text" && (b as TextBlock).content === q))).slice(0, 3).map((q) => (
              <button
                key={q}
                onClick={() => askQuestion(q)}
                className="rounded-full border border-white/[0.08] px-3 py-1 text-xs text-white/40 hover:bg-white/[0.04] transition-colors"
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
