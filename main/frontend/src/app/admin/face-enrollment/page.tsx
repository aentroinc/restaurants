"use client"

import { useState } from "react"
import { ScanFace, UserPlus, Check, AlertCircle, Loader2 } from "lucide-react"
import { FaceCapture } from "@/components/auth/FaceCapture"
import { faceAuthApi } from "@/lib/staff-api"

export default function FaceEnrollmentPage() {
  const [employeeId, setEmployeeId] = useState("")
  const [employeeName, setEmployeeName] = useState("")
  const [phase, setPhase] = useState<"form" | "capture" | "uploading" | "ok" | "error">("form")
  const [errorMsg, setErrorMsg] = useState("")
  const [confidence, setConfidence] = useState(0)

  function start() {
    if (!employeeId) {
      setErrorMsg("従業員IDを入力してください")
      return
    }
    setErrorMsg("")
    setPhase("capture")
  }

  async function handleEmbedding(embedding: number[]) {
    setPhase("uploading")
    try {
      const res = await faceAuthApi.enroll(employeeId, embedding)
      // Self-verify (sanity check)
      const v = await faceAuthApi.verify(embedding, "11111111-1111-1111-1111-111111111111")
      setConfidence(v.confidence)
      if (res.template_id) setPhase("ok")
      else setPhase("error")
    } catch (e: any) {
      setErrorMsg(e?.message || "登録失敗")
      setPhase("error")
    }
  }

  function reset() {
    setPhase("form")
    setEmployeeId("")
    setEmployeeName("")
    setConfidence(0)
    setErrorMsg("")
  }

  return (
    <div className="px-6 py-8 max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <UserPlus className="h-8 w-8 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold">顔認証 登録</h1>
          <p className="text-sm text-white/50 mt-1">スタッフ1名につき5枚の平均で登録します</p>
        </div>
      </div>

      {phase === "form" && (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div>
            <label className="text-xs text-white/60">従業員ID (UUID)</label>
            <input
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              className="w-full mt-1 bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-white/60">氏名（参考）</label>
            <input
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              placeholder="山田 太郎"
              className="w-full mt-1 bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm"
            />
          </div>
          {errorMsg && (
            <div className="text-sm text-red-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {errorMsg}
            </div>
          )}
          <button
            onClick={start}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold flex items-center justify-center gap-2"
          >
            <ScanFace className="h-5 w-5" />
            撮影を開始
          </button>
        </div>
      )}

      {phase === "capture" && (
        <div className="space-y-3">
          <div className="text-sm text-white/70 text-center">
            5枚分の顔データを取得します。フレームに収まったまま2-3秒静止してください。
          </div>
          <FaceCapture onEmbedding={handleEmbedding} averageMode autoCapture />
        </div>
      )}

      {phase === "uploading" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <Loader2 className="h-12 w-12 text-emerald-400 animate-spin mx-auto" />
          <div className="text-sm text-white/70 mt-3">サーバーに登録中…</div>
        </div>
      )}

      {phase === "ok" && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-3">
          <Check className="h-16 w-16 text-emerald-400 mx-auto" />
          <div className="text-2xl font-bold text-emerald-300">登録完了</div>
          {employeeName && <div className="text-sm text-emerald-200/80">{employeeName}</div>}
          <div className="text-xs text-emerald-200/60">セルフ照合 confidence: {(confidence * 100).toFixed(1)}%</div>
          <button onClick={reset} className="mt-3 px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 text-sm">
            次のスタッフを登録
          </button>
        </div>
      )}

      {phase === "error" && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center space-y-3">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
          <div className="text-lg font-bold text-red-300">登録に失敗しました</div>
          <div className="text-sm text-red-200/80">{errorMsg}</div>
          <button onClick={reset} className="mt-3 px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 text-sm">
            やり直す
          </button>
        </div>
      )}
    </div>
  )
}
