"use client";

import { useState } from "react";
import { aiAdvice, type Advice } from "@/lib/mock-data";
import {
  Lightbulb, TrendingUp, DollarSign, Users, CalendarDays,
  ShoppingCart, ChevronDown, ChevronUp, CheckCircle,
} from "lucide-react";

const typeConfig: Record<Advice["type"], { icon: typeof Lightbulb; color: string; bg: string }> = {
  "売上": { icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
  "コスト": { icon: DollarSign, color: "text-amber-600", bg: "bg-amber-50" },
  "集客": { icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
  "シフト": { icon: CalendarDays, color: "text-purple-600", bg: "bg-purple-50" },
  "発注": { icon: ShoppingCart, color: "text-red-600", bg: "bg-red-50" },
};

const priorityLabel = { high: "重要", medium: "参考", low: "ヒント" };
const priorityColor = {
  high: "bg-red-50 text-red-600",
  medium: "bg-amber-50 text-amber-600",
  low: "bg-gray-100 text-gray-500",
};

export default function AdvicePage() {
  const [expandedId, setExpandedId] = useState<string | null>(aiAdvice[0].id);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "high">("all");

  const displayed = filter === "high" ? aiAdvice.filter(a => a.priority === "high") : aiAdvice;

  const markDone = (id: string) => {
    setDoneIds(prev => new Set(prev).add(id));
  };

  return (
    <div className="px-4 pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">AIからの提案</h1>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Lightbulb className="w-3.5 h-3.5 text-blue-500" />
          {aiAdvice.length}件
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-400 leading-relaxed">
        過去の売上データ・在庫・シフトを分析して、今やるべきことを提案します。
      </p>

      {/* Filter */}
      <div className="flex gap-2">
        {(["all", "high"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              filter === f ? "bg-blue-100 text-blue-600 font-medium" : "bg-gray-100 text-gray-400"
            }`}
          >
            {f === "all" ? "すべて" : "重要のみ"}
          </button>
        ))}
      </div>

      {/* Advice cards */}
      <div className="space-y-3">
        {displayed.map((adv) => {
          const expanded = expandedId === adv.id;
          const isDone = doneIds.has(adv.id);
          const config = typeConfig[adv.type];
          const Icon = config.icon;

          return (
            <div
              key={adv.id}
              className={`bg-white rounded-xl shadow-sm border transition-all ${
                isDone ? "border-emerald-200 opacity-60" : "border-gray-100"
              }`}
            >
              <button
                onClick={() => setExpandedId(expanded ? null : adv.id)}
                className="w-full flex items-start gap-3 px-4 py-4 text-left tap-scale"
              >
                <div className={`w-9 h-9 rounded-full ${config.bg} ${config.color} flex items-center justify-center shrink-0 mt-0.5`}>
                  {isDone ? <CheckCircle className="w-4.5 h-4.5 text-emerald-500" /> : <Icon className="w-4.5 h-4.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${priorityColor[adv.priority]}`}>
                      {priorityLabel[adv.priority]}
                    </span>
                    <span className="text-[10px] text-gray-400">{adv.type}</span>
                  </div>
                  <p className={`text-sm font-medium mt-1.5 ${isDone ? "text-gray-400 line-through" : "text-gray-800"}`}>
                    {adv.title}
                  </p>
                  <p className="text-xs text-emerald-600 mt-1">{adv.impact}</p>
                </div>
                <div className="shrink-0 mt-2">
                  {expanded ? <ChevronUp className="w-4 h-4 text-gray-300" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
                </div>
              </button>

              {expanded && (
                <div className="px-4 pb-4 pl-16 space-y-3 animate-fade-in">
                  <p className="text-sm text-gray-600 leading-relaxed">{adv.detail}</p>

                  {!isDone && (
                    <button
                      onClick={() => markDone(adv.id)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold active:scale-[0.97] transition-transform w-full justify-center"
                    >
                      <CheckCircle className="w-4 h-4" /> 対応済みにする
                    </button>
                  )}

                  {isDone && (
                    <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                      <CheckCircle className="w-4 h-4" /> 対応済み
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
