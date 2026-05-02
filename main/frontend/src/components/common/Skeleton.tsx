"use client"

/**
 * Tailwind animate-pulse skeleton。
 * 幅 / 高さ / 行数 のみ受け取るシンプルな表示用コンポーネント。
 */
import React from "react"

export function Skeleton({
  className = "",
  height = 16,
  width,
  rounded = "rounded",
}: {
  className?: string
  height?: number | string
  width?: number | string
  rounded?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={`bg-white/[0.06] animate-pulse ${rounded} ${className}`}
      style={{
        height: typeof height === "number" ? `${height}px` : height,
        width: typeof width === "number" ? `${width}px` : width,
      }}
    />
  )
}

export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={12} width={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3 ${className}`}
    >
      <Skeleton height={16} width="40%" />
      <Skeleton height={28} width="70%" />
      <SkeletonText lines={2} />
    </div>
  )
}

export function SkeletonGrid({
  count = 4,
  className = "",
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={`grid gap-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
