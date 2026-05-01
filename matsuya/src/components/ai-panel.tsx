"use client";

import { useState } from "react";
import { Bot, ChevronRight, ChevronDown, Shield, Clock, User } from "lucide-react";

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
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

const confidenceColor = {
  High: "text-emerald-400 bg-emerald-400/10",
  Medium: "text-amber-400 bg-amber-400/10",
  Low: "text-red-400 bg-red-400/10",
};

export function AIPanel({ insights, onApprove, onReject }: AIPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(insights[0]?.id ?? null);

  return (
    <div className="w-80 border-l border-white/[0.06] bg-[#080c12] flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-11 border-b border-white/[0.06]">
        <Bot className="w-4 h-4 text-blue-400" />
        <span className="text-[11px] font-bold tracking-[0.1em] text-white/70 uppercase">AIP Assistant</span>
        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono">
          {insights.length}
        </span>
      </div>

      {/* Insights */}
      <div className="flex-1 overflow-y-auto">
        {insights.map((insight) => {
          const expanded = expandedId === insight.id;
          return (
            <div key={insight.id} className="border-b border-white/[0.04]">
              <button
                onClick={() => setExpandedId(expanded ? null : insight.id)}
                className="w-full flex items-start gap-2 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
              >
                {expanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-white/30 mt-0.5 shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-white/30 mt-0.5 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-[12px] text-white/80 leading-relaxed">{insight.finding}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${confidenceColor[insight.confidence]}`}>
                      {insight.confidence}
                    </span>
                    {insight.requires_approval && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                        Approval Required
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {expanded && (
                <div className="px-4 pb-4 pl-9 space-y-3 animate-fade-in">
                  {/* Evidence */}
                  <div>
                    <div className="text-[9px] font-bold tracking-[0.1em] text-white/30 uppercase mb-1">Evidence</div>
                    <ul className="space-y-1">
                      {insight.evidence.map((e, i) => (
                        <li key={i} className="text-[11px] text-white/50 flex items-start gap-1.5">
                          <span className="text-blue-400/60 mt-0.5">-</span>
                          {e}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommended Action */}
                  <div>
                    <div className="text-[9px] font-bold tracking-[0.1em] text-white/30 uppercase mb-1">Recommended Action</div>
                    <p className="text-[11px] text-white/60">{insight.recommended_action}</p>
                  </div>

                  {/* Expected Impact */}
                  <div>
                    <div className="text-[9px] font-bold tracking-[0.1em] text-white/30 uppercase mb-1">Expected Impact</div>
                    <p className="text-[11px] text-emerald-400/80">{insight.expected_impact}</p>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-[9px] text-white/30">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{insight.generated_at}</span>
                    <span className="flex items-center gap-1"><Shield className="w-3 h-3" />{insight.confidence}</span>
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{insight.requires_approval ? "Human-in-loop" : "Auto"}</span>
                  </div>

                  {/* Actions */}
                  {insight.requires_approval && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => onApprove?.(insight.id)}
                        className="flex-1 text-[11px] font-medium py-1.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => onReject?.(insight.id)}
                        className="flex-1 text-[11px] font-medium py-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        Reject
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
