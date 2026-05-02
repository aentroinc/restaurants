"use client"

import * as React from "react"
import { Loader2, ScanFace, Check, X } from "lucide-react"
import { faceRecognition } from "@/lib/face-recognition"

type Status = "init" | "loading-models" | "starting-camera" | "scanning" | "captured" | "error"

interface Props {
  /** 検出成功で1度だけ呼ばれる */
  onEmbedding: (embedding: number[]) => void
  /** 自動キャプチャ（true: 検出したら自動 / false: ボタン押下） */
  autoCapture?: boolean
  /** enrollment 用の平均 embedding モード（true で 5枚平均） */
  averageMode?: boolean
  className?: string
}

export function FaceCapture({ onEmbedding, autoCapture = true, averageMode = false, className }: Props) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const firedRef = React.useRef(false)
  const [status, setStatus] = React.useState<Status>("init")
  const [errorMsg, setErrorMsg] = React.useState<string>("")

  React.useEffect(() => {
    let cancelled = false
    async function boot() {
      try {
        setStatus("loading-models")
        await faceRecognition.loadModels("/models")
        if (cancelled) return
        setStatus("starting-camera")
        if (!videoRef.current) return
        streamRef.current = await faceRecognition.startCamera(videoRef.current)
        if (cancelled) return
        setStatus("scanning")
        runLoop()
      } catch (e: any) {
        setErrorMsg(e?.message || "init failed")
        setStatus("error")
      }
    }
    async function runLoop() {
      while (!cancelled && !firedRef.current && videoRef.current) {
        try {
          const emb = averageMode
            ? await faceRecognition.captureAverageEmbedding(videoRef.current, 5, 300)
            : await faceRecognition.getEmbedding(videoRef.current)
          if (emb && !cancelled) {
            firedRef.current = true
            setStatus("captured")
            onEmbedding(emb)
            return
          }
        } catch {
          // ignore single-frame failures
        }
        await new Promise((r) => setTimeout(r, 250))
        if (!autoCapture) break
      }
    }
    boot()
    return () => {
      cancelled = true
      faceRecognition.stopCamera(streamRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={"relative w-full aspect-[3/4] bg-black rounded-2xl overflow-hidden " + (className ?? "")}>
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="w-full h-full object-cover"
      />
      {/* Guide frame */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] aspect-square rounded-full border-2 border-white/40" />
      </div>
      {/* Status overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
        <div className="flex items-center gap-2 text-sm">
          {status === "loading-models" && <><Loader2 className="h-4 w-4 animate-spin" />モデル読み込み中…</>}
          {status === "starting-camera" && <><Loader2 className="h-4 w-4 animate-spin" />カメラ起動中…</>}
          {status === "scanning" && <><ScanFace className="h-4 w-4 text-emerald-400 animate-pulse" />顔をフレーム内に</>}
          {status === "captured" && <><Check className="h-4 w-4 text-emerald-400" />検出完了</>}
          {status === "error" && <><X className="h-4 w-4 text-red-400" />{errorMsg || "失敗"}</>}
        </div>
      </div>
    </div>
  )
}
