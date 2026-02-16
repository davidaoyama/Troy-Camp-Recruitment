"use client";

import { useState } from "react";
import type { WrittenResponseDetail } from "@/lib/types";

interface WrittenResponsesAccordionProps {
  responses: WrittenResponseDetail[];
  writtenAvg: number | null;
}

export const WrittenResponsesAccordion = ({
  responses,
  writtenAvg,
}: WrittenResponsesAccordionProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  if (responses.length === 0) {
    return (
      <div className="text-sm text-gray-400 py-3">
        No written responses available.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Written Responses
        </h3>
        {writtenAvg !== null && (
          <span className="text-sm font-medium text-gray-600">
            Avg: {writtenAvg.toFixed(2)}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {responses.map((r, idx) => {
          const isOpen = openIndex === idx;

          return (
            <div
              key={r.questionNumber}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggle(idx)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
              >
                <span className="text-sm font-medium text-gray-900">
                  Q{r.questionNumber}: {r.questionText}
                </span>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="text-sm text-gray-500">
                    {r.avgScore !== null ? r.avgScore.toFixed(1) : "N/A"}
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
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
              </button>

              {isOpen && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Response
                    </p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {r.responseText}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Grader Scores
                    </p>
                    <div className="flex gap-4">
                      {r.graderDetails.map((g, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 text-sm"
                        >
                          <span className="text-gray-600">{g.graderName}</span>
                          <span className="font-bold text-gray-900">
                            {g.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
