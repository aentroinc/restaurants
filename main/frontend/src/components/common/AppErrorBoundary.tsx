"use client"

import React from "react"

type Props = {
  role?: "staff" | "manager" | "sv"
  children: React.ReactNode
}
type State = { error: Error | null }

/**
 * Lightweight error boundary that also forwards to Sentry if available.
 * Coexists with any other ErrorBoundary in the tree (does not assume singleton).
 */
export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    try {
      // Soft Sentry forward (no hard dependency)
      const w = window as unknown as {
        Sentry?: { captureException: (e: unknown, ctx?: unknown) => void }
      }
      w.Sentry?.captureException(error, { extra: info, tags: { role: this.props.role || "unknown" } })
    } catch {
      // ignore
    }
    if (process.env.NODE_ENV !== "production") {
      console.error("[AppErrorBoundary]", error, info)
    }
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-[60vh] flex items-center justify-center p-6"
        >
          <div className="max-w-md w-full rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center">
            <div className="text-sm font-semibold text-red-300 mb-2">エラーが発生しました</div>
            <div className="text-xs text-white/60 mb-4 font-mono break-words">
              {this.state.error.message || "Unknown error"}
            </div>
            <button
              type="button"
              onClick={this.reset}
              className="px-4 py-2 text-xs font-semibold rounded-md border border-white/20 hover:bg-white/[0.06]
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0e14]"
            >
              再試行
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
