"use client"

import { useRef, useState } from "react"
import { Camera, X } from "lucide-react"

interface PhotoCaptureProps {
  onChange: (blob: Blob | null) => void
  label?: string
}

export function PhotoCapture({ onChange, label = "写真を撮影" }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    onChange(file)
  }

  function clear() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    onChange(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
      {previewUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="撮影画像" className="w-full max-h-64 object-cover" />
          <button
            type="button"
            onClick={clear}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center"
            aria-label="写真を削除"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-lg border-2 border-dashed border-white/15 hover:border-white/30 text-white/70 active:scale-[0.99] transition"
        >
          <Camera className="w-5 h-5" />
          <span className="text-sm font-medium">{label}</span>
        </button>
      )}
    </div>
  )
}
