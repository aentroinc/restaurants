"use client";

import { useState } from "react";
import { ContextHeader } from "@/components/context-header";
import { useToast } from "@/components/toast";
import { actions, signals } from "@/lib/mock-data";
import type { Action } from "@/lib/mock-data";
import {
  ChevronDown, ChevronRight, User, Calendar,
  Zap, CheckCircle, Clock, AlertTriangle, Circle,
} from "lucide-react";

type StatusFilter = "all" | Action["status"];

const statusConfig: Record<Action["status"], { label: string; style: string; icon: typeof Circle }> = {
  pending: { label: "承認待ち", style: "bg-amber-500/15 text-amber-400", icon: Clock },
  approved: { label: "承認済", style: "bg-blue-500/15 text-blue-400", icon: CheckCircle },
  "in-progress": { label: "実行中", style: "bg-emerald-500/15 text-emerald-400", icon: Zap },
  completed: { label: "完了", style: "bg-white/[0.06] text-white/40", icon: CheckCircle },
};

const filterOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "pending", label: "承認待ち" },
  { value: "approved", label: "承認済" },
  { value: "in-progress", label: "実行中" },
  { value: "completed", label: "完了" },
];

export default function ActionsPage() {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [localActions, setLocalActions] = useState(actions);
  const { show } = useToast();

  const filtered = filter === "all" ? localActions : localActions.filter((a) => a.status === filter);

  const handleApprove = (id: string) => {
    setLocalActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "approved" as const } : a))
    );
    show("アクションを承認しました。担当者に通知を送信します。", "success");
  };

  const handleReject = (id: string) => {
    setLocalActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "completed" as const } : a))
    );
    show("アクションを却下しました。", "warning");
  };

  return (
    <div className="flex flex-col h-screen">
      <ContextHeader title="アクション管理" subtitle={`${localActions.length}件のアクション`} />
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Status filter tabs */}
        <div className="flex items-center gap-2">
          {filterOptions.map((opt) => {
            const count = opt.value === "all" ? localActions.length : localActions.filter((a) => a.status === opt.value).length;
            return (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`text-[12px] px-3 py-1.5 rounded-md transition-colors ${
                  filter === opt.value
                    ? "bg-emerald-500/15 text-emerald-400 font-medium"
                    : "bg-white/[0.04] text-white/40 hover:text-white/60"
                }`}
              >
                {opt.label}
                <span className="ml-1.5 font-mono text-[11px] opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Action List */}
        {filtered.map((action) => {
          const expanded = expandedId === action.id;
          const config = statusConfig[action.status];
          const signal = signals.find((s) => s.id === action.signal_id);
          const StatusIcon = config.icon;

          return (
            <div
              key={action.id}
              className="rounded-lg border border-white/[0.06] bg-[#0f1419] overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(expanded ? null : action.id)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  {expanded ? (
                    <ChevronDown className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
                  )}
                  <div>
                    <div className="text-[14px] font-medium text-white/85">{action.title}</div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className={`text-[11px] px-2 py-0.5 rounded font-medium flex items-center gap-1 ${config.style}`}>
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </span>
                      <span className="text-[11px] text-white/30 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {action.owner}
                      </span>
                      <span className="text-[11px] text-white/30 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {action.due_date}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-[12px] text-white/30 font-mono">{action.id}</div>
              </button>

              {expanded && (
                <div className="border-t border-white/[0.06] px-6 py-5 space-y-4 animate-slide-down bg-white/[0.01]">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] font-bold tracking-[0.08em] text-white/25 uppercase mb-1">
                        担当者
                      </div>
                      <div className="text-[13px] text-white/60">{action.owner}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold tracking-[0.08em] text-white/25 uppercase mb-1">
                        期限
                      </div>
                      <div className="text-[13px] text-white/60">{action.due_date}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold tracking-[0.08em] text-white/25 uppercase mb-1">
                        期待効果
                      </div>
                      <div className="text-[13px] text-emerald-400/80 font-medium">{action.impact}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold tracking-[0.08em] text-white/25 uppercase mb-1">
                        ステータス
                      </div>
                      <span className={`text-[12px] px-2.5 py-0.5 rounded font-medium ${config.style}`}>
                        {config.label}
                      </span>
                    </div>
                  </div>

                  {/* Signal reference */}
                  {signal && (
                    <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-4">
                      <div className="text-[10px] font-bold tracking-[0.08em] text-white/25 uppercase mb-2">
                        関連シグナル ({signal.id})
                      </div>
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-[13px] text-white/70">{signal.title}</div>
                          <div className="text-[11px] text-white/30 mt-1">{signal.affected}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Approve/Reject buttons for pending */}
                  {action.status === "pending" && (
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => handleApprove(action.id)}
                        className="flex-1 text-[13px] font-semibold py-2.5 rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 active:scale-[0.97] transition-all"
                      >
                        承認する
                      </button>
                      <button
                        onClick={() => handleReject(action.id)}
                        className="flex-1 text-[13px] font-semibold py-2.5 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-[0.97] transition-all"
                      >
                        却下する
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-[13px] text-white/20">
            該当するアクションはありません
          </div>
        )}
      </div>
    </div>
  );
}
