"use client";

import { useState } from "react";
import { ContextHeader } from "@/components/context-header";
import { alerts, chain } from "@/lib/mock-data";
import { useToast } from "@/components/toast";
import {
  ChevronRight, ChevronDown, AlertTriangle, CheckCircle,
  Lightbulb, TrendingUp, Shield,
} from "lucide-react";

const severityStyle = {
  high: { dot: "bg-red-500", badge: "bg-red-500/10 text-red-400", label: "重大" },
  medium: { dot: "bg-amber-500", badge: "bg-amber-500/10 text-amber-400", label: "注意" },
  low: { dot: "bg-blue-400", badge: "bg-blue-400/10 text-blue-400", label: "情報" },
};

const typeIcon = {
  "売上": TrendingUp,
  "原価": AlertTriangle,
  "人員": AlertTriangle,
  "廃棄": AlertTriangle,
  "在庫": AlertTriangle,
};

export default function AlertsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(alerts[0]?.id ?? null);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const { show } = useToast();

  const handleResolve = (id: string) => {
    setResolvedIds(prev => new Set(prev).add(id));
    show("アラートを対応済みにしました", "success");
  };

  const activeAlerts = alerts.filter(a => !resolvedIds.has(a.id));
  const resolvedAlerts = alerts.filter(a => resolvedIds.has(a.id));

  return (
    <div className="flex flex-col h-screen">
      <ContextHeader title="AIアラート" subtitle="AI異常検知・改善提案" storeCount={chain.store_count} />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-xl border border-white/[0.06] bg-[#0f1419] p-5">
            <div className="text-[11px] font-bold tracking-[0.1em] text-white/40 uppercase">全アラート Total</div>
            <div className="kpi-value text-[28px] text-white/90 mt-2">{alerts.length}<span className="text-[15px] text-white/40 ml-1">件</span></div>
          </div>
          <div className="rounded-xl border border-red-500/15 bg-[#0f1419] p-5">
            <div className="text-[11px] font-bold tracking-[0.1em] text-red-400/60 uppercase">重大 High</div>
            <div className="kpi-value text-[28px] text-red-400 mt-2">{alerts.filter(a => a.severity === "high").length}<span className="text-[15px] text-white/40 ml-1">件</span></div>
          </div>
          <div className="rounded-xl border border-amber-500/15 bg-[#0f1419] p-5">
            <div className="text-[11px] font-bold tracking-[0.1em] text-amber-400/60 uppercase">注意 Medium</div>
            <div className="kpi-value text-[28px] text-amber-400 mt-2">{alerts.filter(a => a.severity === "medium").length}<span className="text-[15px] text-white/40 ml-1">件</span></div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-[#0f1419] p-5">
            <div className="text-[11px] font-bold tracking-[0.1em] text-white/40 uppercase">対応済 Resolved</div>
            <div className="kpi-value text-[28px] text-emerald-400 mt-2">{resolvedIds.size}<span className="text-[15px] text-white/40 ml-1">件</span></div>
          </div>
        </div>

        {/* Active alerts */}
        <div>
          <div className="section-title mb-3">未対応アラート ACTIVE ALERTS</div>
          <div className="space-y-3">
            {activeAlerts.map(alert => {
              const expanded = expandedId === alert.id;
              const sev = severityStyle[alert.severity];
              const Icon = typeIcon[alert.type] || AlertTriangle;

              return (
                <div
                  key={alert.id}
                  className={`rounded-xl border transition-all ${
                    expanded ? "border-orange-400/20 bg-[#0f1419]" : "border-white/[0.06] bg-[#0f1419] hover:border-white/[0.12]"
                  }`}
                >
                  {/* Header row */}
                  <div
                    onClick={() => setExpandedId(expanded ? null : alert.id)}
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer tap-scale"
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${sev.dot}`} />
                    <Icon className="w-4 h-4 text-white/30 shrink-0" />
                    <span className="text-[11px] text-white/40 w-20 shrink-0">{alert.store_name}</span>
                    <span className={`text-[12px] px-2.5 py-0.5 rounded shrink-0 ${sev.badge}`}>{sev.label}</span>
                    <span className={`text-[12px] px-2 py-0.5 rounded bg-white/[0.06] text-white/40 shrink-0`}>{alert.type}</span>
                    <span className="text-[14px] font-bold text-white/80 flex-1">{alert.title}</span>
                    {expanded ? (
                      <ChevronDown className="w-4 h-4 text-orange-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                    )}
                  </div>

                  {/* Expanded detail */}
                  {expanded && (
                    <div className="px-5 pb-5 space-y-4 animate-slide-down">
                      <div className="ml-[4.5rem] space-y-4">
                        {/* Detail */}
                        <div>
                          <div className="text-[12px] font-bold tracking-[0.1em] text-white/30 uppercase mb-2">詳細 Detail</div>
                          <p className="text-[13px] text-white/60 leading-relaxed">{alert.detail}</p>
                        </div>

                        {/* Suggested action */}
                        <div className="rounded-lg border border-orange-400/15 bg-orange-400/[0.04] p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="w-4 h-4 text-orange-400" />
                            <span className="text-[12px] font-bold tracking-[0.1em] text-orange-400/70 uppercase">AI推奨アクション</span>
                          </div>
                          <p className="text-[13px] text-white/70 leading-relaxed">{alert.suggested_action}</p>
                        </div>

                        {/* Impact */}
                        <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.04] p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                            <span className="text-[12px] font-bold tracking-[0.1em] text-emerald-400/70 uppercase">期待効果</span>
                          </div>
                          <p className="text-[14px] font-bold text-emerald-400/80">{alert.impact}</p>
                        </div>

                        {/* Confidence & Action buttons */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-2 text-[11px] text-white/30">
                            <Shield className="w-3.5 h-3.5" />
                            AI信頼度: {alert.severity === "low" ? "中" : "高"}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleResolve(alert.id); }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-400/10 text-orange-400 text-[13px] font-bold hover:bg-orange-400/20 tap-scale transition-all"
                          >
                            <CheckCircle className="w-4 h-4" />
                            対応済みにする
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {activeAlerts.length === 0 && (
              <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-8 text-center">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                <div className="text-[15px] font-bold text-emerald-400">すべてのアラートに対応済みです</div>
                <div className="text-[12px] text-white/40 mt-1">All alerts have been resolved</div>
              </div>
            )}
          </div>
        </div>

        {/* Resolved alerts */}
        {resolvedAlerts.length > 0 && (
          <div>
            <div className="section-title mb-3">対応済み RESOLVED</div>
            <div className="space-y-2">
              {resolvedAlerts.map(alert => (
                <div key={alert.id} className="flex items-center gap-4 px-5 py-3 rounded-xl border border-white/[0.04] bg-white/[0.01] opacity-50">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-[11px] text-white/30 w-20 shrink-0">{alert.store_name}</span>
                  <span className="text-[13px] text-white/40 line-through flex-1">{alert.title}</span>
                  <span className="text-[12px] text-emerald-400/50">対応済</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
