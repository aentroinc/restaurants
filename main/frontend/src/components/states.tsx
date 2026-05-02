"use client"

import { AlertCircle, Loader2 } from "lucide-react"

export function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
    </div>
  );
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="w-8 h-8 text-red-400/60" />
      <p className="text-white/50 text-sm">データ取得に失敗しました</p>
      {message && <p className="text-white/30 text-xs">{message}</p>}
      <button onClick={() => window.location.reload()}
        className="text-xs text-blue-400 hover:text-blue-300 mt-1">再読み込み</button>
    </div>
  );
}

export function EmptyState({ message = "データがありません" }: { message?: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-white/40 text-sm">{message}</p>
    </div>
  );
}
