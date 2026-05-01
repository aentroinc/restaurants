"use client";

import { useState } from "react";
import { Bot, ChevronRight, ChevronDown, Shield, Clock, User } from "lucide-react";
import { useToast } from "@/components/toast";

export interface AIInsight {
  id: string;
  finding: string;
  evidence: string[];
  recommended_action: string;
  expected_impact: string;
  confidence: "High" | "Medium" | "Low";
  requires_approval: boolean;
  generated_at: string;
}

interface AIPanelProps {
  insights: AIInsight[];
}

const confidenceColor = {
  High: "text-emerald-400 bg-emerald-400/10",
  Medium: "text-amber-400 bg-amber-400/10",
  Low: "text-red-400 bg-red-400/10",
};

const confidenceLabel = { High: "高", Medium: "中", Low: "低" };

export function AIPanel({ insights }: AIPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(insights[0]?.id ?? null);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const { show } = useToast();

  const handleApprove = (id: string) => {
    setApprovedIds(prev => new Set(prev).add(id));
    show("AI推奨を承認しました。担当者にタスクを発行します。", "success");
  };

  const handleReject = (id: string) => {
    show("AI推奨を却下しました。", "warning");
  };

  return (
    <div className="w-80 border-l border-white/[0.06] bg-[#080c12] flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-white/[0.06]">
        <Bot className="w-4.5 h-4.5 text-blue-400" />
        <span className="text-[12px] font-bold tracking-[0.08em] text-white/70 uppercase">AI アシスタント</span>
        <span className="ml-auto text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono">
          {insights.length}
        </span>
      </div>

      {/* Insights */}
      <div className="flex-1 overflow-y-auto">
        {insights.map((insight) => {
          const expanded = expandedId === insight.id;
          const isApproved = approvedIds.has(insight.id);
          return (
            <div key={insight.id} className="border-b border-white/[0.04]">
              <button
                onClick={() => setExpandedId(expanded ? null : insight.id)}
                className="w-full flex items-start gap-2.5 px-4 py-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                {expanded ? (
                  <ChevronDown className="w-4 h-4 text-white/30 mt-0.5 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-white/30 mt-0.5 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-[13px] text-white/80 leading-relaxed">{insight.finding}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${confidenceColor[insight.confidence]}`}>
                      信頼度: {confidenceLabel[insight.confidence]}
                    </span>
                    {insight.requires_approval && !isApproved && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">
                        要承認
                      </span>
                    )}
                    {isApproved && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                        承認済
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {expanded && (
                <div className="px-4 pb-4 pl-10 space-y-3 animate-fade-in">
                  {/* Evidence */}
                  <div>
                    <div className="text-[10px] font-bold tracking-[0.08em] text-white/30 uppercase mb-1.5">根拠データ</div>
                    <ul className="space-y-1.5">
                      {insight.evidence.map((e, i) => (
                        <li key={i} className="text-[12px] text-white/50 flex items-start gap-2 leading-relaxed">
                          <span className="text-blue-400/60 mt-0.5 shrink-0">-</span>
                          {e}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommended Action */}
                  <div>
                    <div className="text-[10px] font-bold tracking-[0.08em] text-white/30 uppercase mb-1.5">推奨アクション</div>
                    <p className="text-[12px] text-white/60 leading-relaxed">{insight.recommended_action}</p>
                  </div>

                  {/* Expected Impact */}
                  <div>
                    <div className="text-[10px] font-bold tracking-[0.08em] text-white/30 uppercase mb-1.5">期待効果</div>
                    <p className="text-[13px] text-emerald-400/80 font-medium">{insight.expected_impact}</p>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-[10px] text-white/30 pt-1">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{insight.generated_at}</span>
                    <span className="flex items-center gap-1"><Shield className="w-3 h-3" />{confidenceLabel[insight.confidence]}</span>
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{insight.requires_approval ? "人間承認" : "自動"}</span>
                  </div>

                  {/* Actions */}
                  {insight.requires_approval && !isApproved && (
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleApprove(insight.id)}
                        className="flex-1 text-[12px] font-semibold py-2 rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 active:scale-[0.97] transition-all"
                      >
                        承認する
                      </button>
                      <button
                        onClick={() => handleReject(insight.id)}
                        className="flex-1 text-[12px] font-semibold py-2 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-[0.97] transition-all"
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
      </div>
    </div>
  );
}
