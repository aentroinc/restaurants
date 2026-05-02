"use client"

/**
 * 3 アプリ (manager / staff / sv) の layout に挿入する汎用 React Error Boundary。
 *
 * 既存の AppErrorBoundary を内部で使う薄いラッパー。`role` を任意で受け取り、
 * Sentry に tag として送る。
 */
import React from "react"
import { AppErrorBoundary } from "./AppErrorBoundary"

export function ErrorBoundary({
  role,
  children,
}: {
  role?: "staff" | "manager" | "sv"
  children: React.ReactNode
}) {
  return <AppErrorBoundary role={role}>{children}</AppErrorBoundary>
}
