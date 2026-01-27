"use client";

import { useState } from "react";
import type { Suggestion } from "@/lib/ai-suggestions";

interface SuggestionsPanelProps {
  suggestions: Suggestion[];
  onDismiss?: (id: string) => void;
  onAccept?: (id: string) => void;
  onJumpToRegion?: (regionId: string, pageNumber: number) => void;
}

const SEVERITY_COLORS = {
  info: "border-blue-500 bg-blue-50 dark:bg-blue-950",
  warning: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950",
  error: "border-red-500 bg-red-50 dark:bg-red-950",
};

const SEVERITY_ICONS = {
  info: (
    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const TYPE_LABELS = {
  undefined_symbol: "Undefined Symbol",
  suspicious_math: "Suspicious Math",
  logic_gap: "Logic Gap",
  clarification: "Needs Clarification",
};

export default function SuggestionsPanel({
  suggestions,
  onDismiss,
  onAccept,
  onJumpToRegion,
}: SuggestionsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const filteredSuggestions = suggestions.filter((s) => {
    if (filter === "all") return true;
    return s.severity === filter || s.type === filter;
  });

  if (suggestions.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        <svg
          className="w-12 h-12 mx-auto mb-4 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="font-medium">No issues found</p>
        <p className="text-sm">Your document looks good!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            AI Suggestions
          </h3>
          <span className="text-sm text-gray-500">
            {filteredSuggestions.length} issue{filteredSuggestions.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-1">
          {["all", "error", "warning", "info"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-xs rounded ${
                filter === f
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Suggestions list */}
      <div className="flex-1 overflow-auto">
        {filteredSuggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className={`border-l-4 m-2 rounded ${SEVERITY_COLORS[suggestion.severity]}`}
          >
            <div
              className="p-3 cursor-pointer"
              onClick={() =>
                setExpandedId(expandedId === suggestion.id ? null : suggestion.id)
              }
            >
              <div className="flex items-start gap-3">
                {SEVERITY_ICONS[suggestion.severity]}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {TYPE_LABELS[suggestion.type]}
                    </span>
                    {suggestion.pageNumber && (
                      <span className="text-xs text-gray-400">
                        Page {suggestion.pageNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                    {suggestion.message}
                  </p>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    expandedId === suggestion.id ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>

            {/* Expanded content */}
            {expandedId === suggestion.id && (
              <div className="px-3 pb-3 pt-0">
                {suggestion.context && (
                  <div className="mb-3 p-2 bg-white/50 dark:bg-black/20 rounded">
                    <p className="text-xs text-gray-500 mb-1">Context:</p>
                    <code className="text-xs text-gray-700 dark:text-gray-300">
                      {suggestion.context}
                    </code>
                  </div>
                )}

                {suggestion.suggestion && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Suggestion:</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {suggestion.suggestion}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  {suggestion.regionId && onJumpToRegion && (
                    <button
                      onClick={() =>
                        onJumpToRegion(suggestion.regionId, suggestion.pageNumber)
                      }
                      className="px-3 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Go to region
                    </button>
                  )}
                  {onAccept && (
                    <button
                      onClick={() => onAccept(suggestion.id)}
                      className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Accept
                    </button>
                  )}
                  {onDismiss && (
                    <button
                      onClick={() => onDismiss(suggestion.id)}
                      className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
