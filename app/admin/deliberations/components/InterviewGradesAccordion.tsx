"use client";

import { useState } from "react";
import type { InterviewSectionDetail } from "@/lib/types";

interface InterviewGradesAccordionProps {
  sections: InterviewSectionDetail[];
  interviewAvg: number | null;
}

export const InterviewGradesAccordion = ({
  sections,
  interviewAvg,
}: InterviewGradesAccordionProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  if (sections.length === 0) {
    return (
      <div className="text-sm text-gray-400 py-3">
        No interview assignments for this applicant.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Interview Grades
        </h3>
        {interviewAvg !== null && (
          <span className="text-sm font-medium text-gray-600">
            Avg: {interviewAvg.toFixed(2)}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {sections.map((s, idx) => {
          const isOpen = openIndex === idx;

          return (
            <div
              key={s.section}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggle(idx)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
              >
                <span className="text-sm font-medium text-gray-900">
                  Section {s.section}
                </span>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="text-sm text-gray-500">
                    {s.avgScore !== null ? s.avgScore.toFixed(1) : "N/A"}
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
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 space-y-4">
                  {s.graderDetails.map((grader, gi) => (
                    <div
                      key={gi}
                      className={`${gi > 0 ? "border-t border-gray-200 pt-3" : ""}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {grader.graderName}
                        </span>
                        <span className="text-sm font-bold text-blue-600">
                          {grader.score > 0 ? grader.score : "N/A"}
                        </span>
                      </div>

                      {grader.notes.length > 0 && (
                        <div className="space-y-2 ml-3">
                          {grader.notes.map((note) => (
                            <div key={note.questionNumber}>
                              <p className="text-xs font-medium text-gray-500">
                                Q{note.questionNumber}: {note.questionText}
                              </p>
                              <p className="text-sm text-gray-700 mt-0.5">
                                {note.notes || "—"}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
