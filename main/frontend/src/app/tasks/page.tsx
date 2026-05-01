"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { ContextHeader } from "@/components/context-header"
import { fetchAPI } from "@/lib/api"
import { formatCurrency, formatDateShort } from "@/lib/utils"
import { mockStores } from "@/lib/mock-data"
import type { Task } from "@/lib/types"
import { Plus, ArrowRight, CheckCircle2 } from "lucide-react"

const columns = ["下書き", "未着手", "進行中", "完了"]
const columnColors: Record<string, string> = {
  "下書き": "border-t-gray-400",
  "未着手": "border-t-amber-400",
  "進行中": "border-t-blue-400",
  "完了": "border-t-emerald-400",
}

const priorityVariant: Record<string, "destructive" | "warning" | "secondary"> = {
  "高": "destructive",
  "中": "warning",
  "低": "secondary",
}

const issueTypes = ["人件費超過", "原価超過", "売上減少", "レビュー低下", "値引き過多"]

interface NewTaskForm {
  title: string
  store_id: string
  description: string
  issue_type: string
  priority: string
  assignee: string
  due_date: string
  expected_impact_amount: string
}

const emptyForm: NewTaskForm = {
  title: "",
  store_id: "",
  description: "",
  issue_type: "",
  priority: "",
  assignee: "",
  due_date: "",
  expected_impact_amount: "",
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [issueFilter, setIssueFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<NewTaskForm>(emptyForm)
  const [created, setCreated] = useState(false)

  useEffect(() => {
    fetchAPI<Task[]>("/api/v1/tasks").then(setTasks)
  }, [])

  function moveTask(taskId: string, newStatus: string) {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t))
  }

  function handleCreate() {
    const store = mockStores.find((s) => s.id === form.store_id)
    const newTask: Task = {
      id: `task-new-${Date.now()}`,
      store_id: form.store_id,
      store_name: store?.name || "",
      title: form.title,
      description: form.description,
      status: "未着手",
      priority: form.priority || "中",
      issue_type: form.issue_type || "人件費超過",
      assignee: form.assignee || "未割当",
      due_date: form.due_date || "2026-05-15",
      expected_impact_amount: Number(form.expected_impact_amount) || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setTasks((prev) => [newTask, ...prev])
    setCreated(true)
    setTimeout(() => {
      setCreated(false)
      setDialogOpen(false)
      setForm(emptyForm)
    }, 1500)
  }

  const filtered = tasks.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false
    if (issueFilter !== "all" && t.issue_type !== issueFilter) return false
    return true
  })

  const nextStatus: Record<string, string> = {
    "下書き": "未着手",
    "未着手": "進行中",
    "進行中": "完了",
  }

  return (
    <div>
      <ContextHeader
        title="タスク管理"
        description="改善アクションの進捗をカンバンで管理"
        actions={
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setForm(emptyForm); setCreated(false); } }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />タスク作成</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>新規タスク作成</DialogTitle>
              </DialogHeader>
              {created ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
                  <p className="text-lg font-semibold text-gray-900">タスクを作成しました</p>
                  <p className="text-sm text-gray-500 mt-1">{form.title}</p>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 py-4">
                    <div>
                      <label className="text-sm font-medium">タイトル</label>
                      <Input placeholder="タスクのタイトル" className="mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">店舗</label>
                      <Select value={form.store_id} onValueChange={(v) => setForm({ ...form, store_id: v })}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="店舗を選択" /></SelectTrigger>
                        <SelectContent>
                          {mockStores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">詳細</label>
                      <Textarea placeholder="タスクの詳細を記載" className="mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">課題種別</label>
                        <Select value={form.issue_type} onValueChange={(v) => setForm({ ...form, issue_type: v })}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="種別" /></SelectTrigger>
                          <SelectContent>
                            {issueTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">優先度</label>
                        <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="優先度" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="高">高</SelectItem>
                            <SelectItem value="中">中</SelectItem>
                            <SelectItem value="低">低</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">担当者</label>
                        <Input placeholder="担当者名" className="mt-1" value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-sm font-medium">期限</label>
                        <Input type="date" className="mt-1" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">期待改善額</label>
                      <Input type="number" placeholder="0" className="mt-1" value={form.expected_impact_amount} onChange={(e) => setForm({ ...form, expected_impact_amount: e.target.value })} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
                    <Button onClick={handleCreate} disabled={!form.title || !form.store_id}>作成</Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        }
      />

      {/* Filters */}
      <div className="mb-6 flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="ステータス" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全ステータス</SelectItem>
            {columns.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={issueFilter} onValueChange={setIssueFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="課題種別" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全種別</SelectItem>
            {issueTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {columns.map((col) => {
          const colTasks = filtered.filter((t) => t.status === col)
          return (
            <div key={col}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">{col}</h3>
                <Badge variant="secondary" className="text-xs">{colTasks.length}</Badge>
              </div>
              <div className="space-y-3">
                {colTasks.map((task) => (
                  <Card key={task.id} className={`border-t-4 ${columnColors[col]}`}>
                    <CardContent className="p-3">
                      <div className="text-sm font-medium">{task.title}</div>
                      <div className="mt-1 text-xs text-gray-500">{task.store_name}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        <Badge variant={priorityVariant[task.priority] || "secondary"} className="text-xs">{task.priority}</Badge>
                        <Badge variant="outline" className="text-xs">{task.issue_type}</Badge>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                        <span>{task.assignee}</span>
                        <span>{formatDateShort(task.due_date)}</span>
                      </div>
                      {task.expected_impact_amount > 0 && (
                        <div className="mt-1 text-xs text-blue-600">期待効果: {formatCurrency(task.expected_impact_amount)}</div>
                      )}
                      {nextStatus[col] && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 w-full text-xs"
                          onClick={() => moveTask(task.id, nextStatus[col])}
                        >
                          {nextStatus[col]}へ移動 <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {colTasks.length === 0 && (
                  <div className="rounded-lg border-2 border-dashed p-8 text-center text-sm text-gray-400">
                    タスクなし
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
