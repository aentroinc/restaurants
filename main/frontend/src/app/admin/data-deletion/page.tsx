"use client"

import { useEffect, useState } from "react"
import { ShieldAlert, Check, X, RefreshCw, Clock, ChevronDown, ChevronUp } from "lucide-react"
import {
  type DeletionRequest,
  listDeletionRequests,
  processDeletionRequest,
  rejectDeletionRequest,
} from "@/lib/consent"

const STATUS_TONE: Record<DeletionRequest["status"], string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  processing: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  done: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  rejected: "bg-white/5 text-white/50 border-white/15",
}

const STATUS_LABEL: Record<DeletionRequest["status"], string> = {
  pending: "承認待ち",
  processing: "処理中",
  done: "完了",
  rejected: "却下",
}

const SCOPE_LABEL: Record<DeletionRequest["scope"], string> = {
  all: "すべて",
  face: "顔データのみ",
  personal: "個人情報のみ",
  training: "面談・学習のみ",
}

export default function AdminDataDeletionPage() {
  const [reqs, setReqs] = useState<DeletionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    setReqs(await listDeletionRequests())
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  async function approve(id: string) {
    if (!confirm("このリクエストを承認し、データを削除しますか？\nこの操作は取り消せません。")) return
    setBusyId(id)
    try {
      await processDeletionRequest(id)
      await refresh()
    } finally {
      setBusyId(null)
    }
  }

  async function reject(id: string) {
    if (!confirm("このリクエストを却下しますか？")) return
    setBusyId(id)
    try {
      await rejectDeletionRequest(id)
      await refresh()
    } finally {
      setBusyId(null)
    }
  }

  const pending = reqs.filter((r) => r.status === "pending")
  const processed = reqs.filter((r) => r.status !== "pending")

  return (
    <div className="min-h-screen bg-[#0a0e14] text-white p-6 max-w-5xl mx-auto">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="h-6 w-6 text-red-400" />
            <h1 className="text-2xl font-bold">データ削除リクエスト</h1>
          </div>
          <p className="text-sm text-white/60">
            個人情報保護法（2022改正）第30条「保有個人データの利用停止・消去等」対応窓口。承認後、顔認証データは即時削除、打刻記録は法定保管期間（3年）経過分のみ削除されます。
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1 px-3 h-10 rounded-lg border border-white/15 text-sm text-white/80 hover:bg-white/5"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          更新
        </button>
      </header>

      {/* 承認待ち */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-amber-300 mb-3 flex items-center gap-1">
          <Clock className="h-4 w-4" />
          承認待ち ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-white/50">
            承認待ちのリクエストはありません
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map((r) => (
              <RequestCard
                key={r.id}
                req={r}
                isOpen={openId === r.id}
                onToggle={() => setOpenId(openId === r.id ? null : r.id)}
                onApprove={() => approve(r.id)}
                onReject={() => reject(r.id)}
                busy={busyId === r.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* 処理済み */}
      <section>
        <h2 className="text-sm font-semibold text-white/60 mb-3">処理済み ({processed.length})</h2>
        {processed.length === 0 ? (
          <div className="text-sm text-white/40">処理履歴はまだありません</div>
        ) : (
          <div className="space-y-2">
            {processed.map((r) => (
              <RequestCard
                key={r.id}
                req={r}
                isOpen={openId === r.id}
                onToggle={() => setOpenId(openId === r.id ? null : r.id)}
                readOnly
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function RequestCard({
  req, isOpen, onToggle, onApprove, onReject, busy, readOnly,
}: {
  req: DeletionRequest
  isOpen: boolean
  onToggle: () => void
  onApprove?: () => void
  onReject?: () => void
  busy?: boolean
  readOnly?: boolean
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.03]"
      >
        <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono border ${STATUS_TONE[req.status]}`}>
          {STATUS_LABEL[req.status]}
        </span>
        <span className="text-[13px] text-white/80 flex-1 text-left">
          ユーザID <span className="font-mono text-white">{req.user_id.slice(0, 8)}…</span>
          <span className="mx-2 text-white/30">|</span>
          範囲: <span className="text-white">{SCOPE_LABEL[req.scope]}</span>
        </span>
        <span className="text-[11px] text-white/45 font-mono tabular-nums">
          {new Date(req.requested_at).toLocaleString("ja-JP")}
        </span>
        {isOpen ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
      </button>

      {isOpen && (
        <div className="px-4 py-3 border-t border-white/10 bg-black/20 text-[12px] space-y-2">
          <KV k="リクエストID" v={req.id} />
          <KV k="ユーザID" v={req.user_id} />
          <KV k="申請者" v={req.requested_by} />
          <KV k="申請日時" v={new Date(req.requested_at).toLocaleString("ja-JP")} />
          {req.processed_at && <KV k="処理日時" v={new Date(req.processed_at).toLocaleString("ja-JP")} />}
          {req.note && <KV k="備考" v={req.note} />}
          {req.deletion_log && (
            <div>
              <div className="text-white/50 mb-1">削除ログ</div>
              <pre className="font-mono text-[11px] bg-black/30 rounded p-2 overflow-x-auto text-emerald-200">
                {JSON.stringify(req.deletion_log, null, 2)}
              </pre>
            </div>
          )}

          {!readOnly && (
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onReject}
                disabled={busy}
                className="px-3 h-9 rounded-md border border-white/15 text-white/70 hover:bg-white/5 text-[12px] flex items-center gap-1 disabled:opacity-50"
              >
                <X className="h-3 w-3" />
                却下
              </button>
              <button
                type="button"
                onClick={onApprove}
                disabled={busy}
                className="px-3 h-9 rounded-md bg-red-500 hover:bg-red-400 text-white text-[12px] font-bold flex items-center gap-1 disabled:bg-white/10"
              >
                <Check className="h-3 w-3" />
                承認 → 削除実行
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <div className="text-white/50 w-24 shrink-0">{k}</div>
      <div className="font-mono text-white/85 break-all">{v}</div>
    </div>
  )
}
