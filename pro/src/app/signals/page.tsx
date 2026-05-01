"use client";

import { useState } from "react";
import { ContextHeader } from "@/components/context-header";
import { signals } from "@/lib/mock-data";
import {
  ChevronDown, ChevronRight, AlertTriangle, AlertOctagon,
  Info, Bell, Zap, MapPin, ArrowRight,
} from "lucide-react";
import Link from "next/link";

const severityConfig: Record<string, { label: string; style: string; icon: typeof Bell }> = {
  critical: { label: "緊急", style: "bg-red-500/15 text-red-400 border-red-500/30", icon: AlertOctagon },
  high: { label: "重要", style: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: AlertTriangle },
  medium: { label: "注意", style: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: Info },
  low: { label: "情報", style: "bg-white/[0.06] text-white/40 border-white/[0.08]", icon: Bell },
};

const typeStyle: Record<string, string> = {
  "異常検知": "text-red-400 bg-red-500/10",
  "需要変動": "text-blue-400 bg-blue-500/10",
  "コスト警告": "text-amber-400 bg-amber-500/10",
  "改善提案": "text-emerald-400 bg-emerald-500/10",
  "キャンペーン": "text-purple-400 bg-purple-500/10",
};

const sorted = [...signals].sort((a, b) => {
  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  return order[a.severity] - order[b.severity];
});

export default function SignalsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-screen">
      <ContextHeader title="AIシグナル" subtitle={`${signals.length}件のシグナル`} />
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Severity summary */}
        <div className="grid grid-cols-4 gap-3 mb-2">
          {(["critical", "high", "medium", "low"] as const).map((sev) => {
            const config = severityConfig[sev];
            const count = signals.filter((s) => s.severity === sev).length;
            return (
              <div
                key={sev}
                className={`rounded-lg border p-4 cursor-pointer hover:opacity-80 transition-opacity ${config.style}`}
              >
                <div className="text-[11px] font-bold tracking-[0.08em] uppercase mb-1 opacity-60">
                  {config.label}
                </div>
                <div className="kpi-value text-[28px]">{count}</div>
              </div>
            );
          })}
        </div>

        {/* Signal Feed */}
        {sorted.map((signal) => {
          const expanded = expandedId === signal.id;
          const sevConfig = severityConfig[signal.severity];
          const SevIcon = sevConfig.icon;

          return (
            <div
              key={signal.id}
              className={`rounded-lg border bg-[#0f1419] overflow-hidden ${
                signal.severity === "critical" ? "border-red-500/20" : "border-white/[0.06]"
              }`}
            >
              <button
                onClick={() => setExpandedId(expanded ? null : signal.id)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  {expanded ? (
                    <ChevronDown className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
                  )}
                  <div>
                    <div className="text-[14px] font-medium text-white/85">{signal.title}</div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[12px] px-2 py-0.5 rounded font-medium flex items-center gap-1 ${sevConfig.style}`}>
                        <SevIcon className="w-3 h-3" />
                        {sevConfig.label}
                      </span>
                      <span className={`text-[12px] px-2 py-0.5 rounded font-medium ${typeStyle[signal.type]}`}>
                        {signal.type}
                      </span>
                      <span className="text-[11px] text-white/25 font-mono">{signal.id}</span>
                    </div>
                  </div>
                </div>
              </button>

              {expanded && (
                <div className="border-t border-white/[0.06] px-6 py-5 space-y-4 animate-slide-down bg-white/[0.01]">
                  {/* Detail */}
                  <div>
                    <div className="text-[12px] font-bold tracking-[0.08em] text-white/25 uppercase mb-2">
                      詳細
                    </div>
                    <p className="text-[13px] text-white/60 leading-relaxed">{signal.detail}</p>
                  </div>

                  {/* Affected */}
                  <div>
                    <div className="text-[12px] font-bold tracking-[0.08em] text-white/25 uppercase mb-2">
                      影響範囲
                    </div>
                    <div className="flex items-center gap-2 text-[13px] text-white/60">
                      <MapPin className="w-3.5 h-3.5 text-white/30" />
                      {signal.affected}
                    </div>
                  </div>

                  {/* Suggested Action */}
                  <div>
                    <div className="text-[12px] font-bold tracking-[0.08em] text-white/25 uppercase mb-2">
                      推奨アクション
                    </div>
                    <p className="text-[13px] text-white/60 leading-relaxed">{signal.action}</p>
                  </div>

                  {/* Impact */}
                  <div>
                    <div className="text-[12px] font-bold tracking-[0.08em] text-white/25 uppercase mb-2">
                      インパクト
                    </div>
                    <p className="text-[13px] text-emerald-400/80 font-medium">{signal.impact}</p>
                  </div>

                  {/* Link to actions */}
                  <Link
                    href="/actions"
                    className="inline-flex items-center gap-2 text-[12px] text-emerald-400 hover:text-emerald-300 transition-colors mt-2"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    アクションを作成・確認する
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
