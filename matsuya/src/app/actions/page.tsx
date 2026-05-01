"use client";

import { useState } from "react";
import { ContextHeader } from "@/components/context-header";
import { AIPanel, type AIInsight } from "@/components/ai-panel";
import { actions as initialActions, incidents, type Action } from "@/lib/mock-data";
import { useToast } from "@/components/toast";
import {
  CheckCircle, XCircle, Clock, ChevronDown, ChevronRight,
  User, Shield, AlertTriangle, FileText, Zap, Filter,
} from "lucide-react";

const aqInsights: AIInsight[] = [
  {
    id: "aq-1",
    finding: "未承認アクションが4件。うち2件は期限まで2時間以内。優先対応を推奨。",
    evidence: [
      "ACT-001 (牛バラ補充): 期限 05/02 04:00 — 承認後、配送手配に3時間必要",
      "ACT-007 (渋谷人員追加): 期限 05/01 16:00 — 残り1.5時間",
      "過去30日の承認遅延: 平均2.1時間 (目標1時間以内)",
    ],
    recommended_action: "ACT-007を最優先で承認。ACT-001は本日中の承認で朝便に間に合う。",
    expected_impact: "期限超過0件を維持。対応効果の最大化。",
    confidence: "High",
    requires_approval: false,
    generated_at: "15:40",
  },
];

const statusConfig = {
  pending: { label: "承認待ち", color: "text-amber-400 bg-amber-400/10", icon: Clock },
  approved: { label: "承認済", color: "text-blue-400 bg-blue-400/10", icon: CheckCircle },
  "in-progress": { label: "実行中", color: "text-cyan-400 bg-cyan-400/10", icon: Zap },
  completed: { label: "完了", color: "text-emerald-400 bg-emerald-400/10", icon: CheckCircle },
  rejected: { label: "却下", color: "text-red-400 bg-red-400/10", icon: XCircle },
};

export default function ActionQueuePage() {
  const [actionsState, setActionsState] = useState<Action[]>(initialActions);
  const [expandedId, setExpandedId] = useState<string | null>(initialActions[0]?.action_id ?? null);
  const [filter, setFilter] = useState<string>("all");
  const { show } = useToast();

  const handleApprove = (actionId: string) => {
    const action = actionsState.find(a => a.action_id === actionId);
    setActionsState(prev => prev.map(a =>
      a.action_id === actionId
        ? {
            ...a,
            status: "approved" as const,
            audit_log: [...a.audit_log, {
              timestamp: "2026-05-01T15:46:00",
              actor: "経営企画部",
              action: "承認",
            }],
          }
        : a
    ));
    show(`承認しました: ${action?.title?.slice(0, 30)}...`, "success");
  };

  const handleReject = (actionId: string) => {
    const action = actionsState.find(a => a.action_id === actionId);
    setActionsState(prev => prev.map(a =>
      a.action_id === actionId
        ? {
            ...a,
            status: "rejected" as const,
            audit_log: [...a.audit_log, {
              timestamp: "2026-05-01T15:46:00",
              actor: "経営企画部",
              action: "却下",
            }],
          }
        : a
    ));
    show(`却下しました: ${action?.title?.slice(0, 30)}...`, "warning");
  };

  const filtered = filter === "all"
    ? actionsState
    : actionsState.filter(a => a.status === filter);

  const counts = {
    all: actionsState.length,
    pending: actionsState.filter(a => a.status === "pending").length,
    approved: actionsState.filter(a => a.status === "approved").length,
    "in-progress": actionsState.filter(a => a.status === "in-progress").length,
    completed: actionsState.filter(a => a.status === "completed").length,
  };

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col min-w-0">
        <ContextHeader
          title="Action Queue"
          subtitle="推奨対応のタスク管理・承認・監査"
        />

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-5 gap-3">
            {(["all","pending","approved","in-progress","completed"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-lg border p-4 text-center transition-all ${
                  filter === key
                    ? "border-blue-400/30 bg-blue-500/10 ring-1 ring-blue-400/20"
                    : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <div className="kpi-value text-2xl text-white/80">{counts[key]}</div>
                <div className="text-[12px] text-white/40 mt-1">
                  {key === "all" ? "全件" : key === "pending" ? "承認待ち" : key === "approved" ? "承認済" : key === "in-progress" ? "実行中" : "完了"}
                </div>
              </button>
            ))}
          </div>

          {/* Action list */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <div className="px-4 py-2 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="section-title">Actions</span>
                <Filter className="w-3 h-3 text-white/20" />
              </div>
              <span className="text-[10px] text-white/30">{filtered.length}件</span>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {filtered.map((action) => {
                const expanded = expandedId === action.action_id;
                const config = statusConfig[action.status];
                const incident = incidents.find(i => i.incident_id === action.incident_id);
                const StatusIcon = config.icon;

                return (
                  <div key={action.action_id}>
                    <button
                      onClick={() => setExpandedId(expanded ? null : action.action_id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
                    >
                      {expanded
                        ? <ChevronDown className="w-3.5 h-3.5 text-white/30 shrink-0" />
                        : <ChevronRight className="w-3.5 h-3.5 text-white/30 shrink-0" />
                      }
                      <StatusIcon className={`w-4 h-4 shrink-0 ${config.color.split(" ")[0]}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-white/70">{action.title}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-white/30">
                          <span>{action.action_id}</span>
                          {incident && <span>← {incident.title}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-[9px] px-2 py-0.5 rounded font-medium ${config.color}`}>
                          {config.label}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                          action.confidence === "High" ? "text-emerald-400 bg-emerald-400/10" :
                          action.confidence === "Medium" ? "text-amber-400 bg-amber-400/10" : "text-red-400 bg-red-400/10"
                        }`}>
                          {action.confidence}
                        </span>
                      </div>
                    </button>

                    {expanded && (
                      <div className="px-4 pb-4 pl-12 space-y-4 animate-fade-in">
                        {/* Decision Card */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div>
                              <div className="text-[9px] font-bold tracking-[0.1em] text-white/30 uppercase mb-1">Expected Impact</div>
                              <p className="text-[11px] text-emerald-400/80">{action.expected_impact}</p>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold tracking-[0.1em] text-white/30 uppercase mb-1">Owner</div>
                              <div className="flex items-center gap-2">
                                <User className="w-3.5 h-3.5 text-white/30" />
                                <span className="text-[11px] text-white/60">{action.owner_name} ({action.owner_role})</span>
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold tracking-[0.1em] text-white/30 uppercase mb-1">Deadline</div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-white/30" />
                                <span className="text-[11px] text-white/60">{action.due_date}</span>
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold tracking-[0.1em] text-white/30 uppercase mb-1 flex items-center gap-1">
                                <Shield className="w-3 h-3" /> Confidence
                              </div>
                              <span className={`text-[11px] ${
                                action.confidence === "High" ? "text-emerald-400" :
                                action.confidence === "Medium" ? "text-amber-400" : "text-red-400"
                              }`}>{action.confidence}</span>
                            </div>
                          </div>

                          {/* Audit Trail */}
                          <div>
                            <div className="text-[9px] font-bold tracking-[0.1em] text-white/30 uppercase mb-2 flex items-center gap-1">
                              <FileText className="w-3 h-3" /> Audit Trail
                            </div>
                            <div className="space-y-1.5">
                              {action.audit_log.map((log, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <div className="w-1 h-1 rounded-full bg-blue-400/50 mt-1.5 shrink-0" />
                                  <div>
                                    <div className="text-[10px] text-white/50">
                                      <span className="text-white/70 font-medium">{log.actor}</span>
                                      {" — "}{log.action}
                                    </div>
                                    <div className="text-[9px] text-white/25">{log.timestamp}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Approve / Reject buttons */}
                        {action.status === "pending" && (
                          <div className="flex gap-3 pt-3 border-t border-white/[0.06]">
                            <button
                              onClick={() => handleApprove(action.action_id)}
                              className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[13px] font-semibold hover:bg-emerald-500/30 active:scale-[0.97] transition-all"
                            >
                              <CheckCircle className="w-4 h-4" /> 承認する
                            </button>
                            <button
                              onClick={() => handleReject(action.action_id)}
                              className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-red-500/10 text-red-400 text-[13px] font-semibold hover:bg-red-500/20 active:scale-[0.97] transition-all"
                            >
                              <XCircle className="w-4 h-4" /> 却下する
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-white/[0.04] text-white/40 text-[12px] hover:bg-white/[0.06] transition-colors ml-auto">
                              <FileText className="w-4 h-4" /> 修正して承認
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <AIPanel insights={aqInsights} />
    </div>
  );
}
