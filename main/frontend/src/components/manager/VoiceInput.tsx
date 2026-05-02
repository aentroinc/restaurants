"use client"

import { useEffect, useRef, useState } from "react"
import { Mic, MicOff } from "lucide-react"

interface VoiceInputProps {
  onResult: (text: string) => void
  lang?: string
  className?: string
}

// minimal type for webkitSpeechRecognition
/* eslint-disable @typescript-eslint/no-explicit-any */
interface SRResultEvent {
  resultIndex: number
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>
}

export function VoiceInput({ onResult, lang = "ja-JP", className }: VoiceInputProps) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const recRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SR) setSupported(true)
  }, [])

  function start() {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.lang = lang
    rec.interimResults = true
    rec.continuous = true
    let finalText = ""
    rec.onresult = (e: SRResultEvent) => {
      let interim = ""
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else interim += r[0].transcript
      }
      onResult((finalText + interim).trim())
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    rec.start()
    recRef.current = rec
    setListening(true)
  }

  function stop() {
    recRef.current?.stop?.()
    setListening(false)
  }

  if (!supported) return null

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
        listening
          ? "border-red-500/60 bg-red-500/15 text-red-300"
          : "border-white/15 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]"
      } ${className || ""}`}
      aria-pressed={listening}
    >
      {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      <span>{listening ? "録音中…タップで停止" : "音声入力"}</span>
    </button>
  )
}
