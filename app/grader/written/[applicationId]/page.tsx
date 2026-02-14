"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getGradingData,
  saveGrade,
  submitAllGrades,
  type GradingPageData,
  type GradingQuestion,
} from "../actions";

export default function GradingPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.applicationId as string;

  const [data, setData] = useState<GradingPageData | null>(null);
  const [scores, setScores] = useState<Record<number, number | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingQuestion, setSavingQuestion] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [rubricOpen, setRubricOpen] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getGradingData(applicationId);
    if (result.success) {
      setData(result.data);
      // Initialize local scores from DB
      const initial: Record<number, number | null> = {};
      for (const q of result.data.questions) {
        initial[q.questionNumber] = q.score;
      }
      setScores(initial);
    } else {
      setError(result.error);
    }
    setIsLoading(false);
  }, [applicationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleScoreChange = async (question: GradingQuestion, newScore: number) => {
    const prevScore = scores[question.questionNumber];

    // Optimistic update
    setScores((prev) => ({ ...prev, [question.questionNumber]: newScore }));
    setSavingQuestion(question.questionNumber);
    setError(null);

    const result = await saveGrade(question.gradeId, newScore);

    if (!result.success) {
      // Rollback
      setScores((prev) => ({ ...prev, [question.questionNumber]: prevScore }));
      setError(result.error);
    }

    setSavingQuestion(null);
  };

  const handleSubmitAll = async () => {
    if (!data) return;

    // Client-side validation
    const unscored = data.questions.filter(
      (q) => scores[q.questionNumber] === null
    );
    if (unscored.length > 0) {
      setError(
        `Please score all questions before submitting. Questions ${unscored
          .map((q) => q.questionNumber)
          .join(", ")} are unscored.`
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await submitAllGrades(applicationId);

    if (result.success) {
      setSuccessMsg("All grades submitted successfully!");
      setTimeout(() => router.push("/grader/written"), 1500);
    } else {
      setError(result.error);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center text-gray-500 mt-8">
        Loading grading data...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mt-8">
        <div
          role="alert"
          className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200"
        >
          {error}
        </div>
        <button
          onClick={() => router.push("/grader/written")}
          className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!data) return null;

  const allScored = data.questions.every(
    (q) => scores[q.questionNumber] !== null
  );

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push("/grader/written")}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            {data.application.anonymousId}
          </h1>
        </div>
        <div className="text-sm text-gray-500">
          {Object.values(scores).filter((s) => s !== null).length} / 5 scored
        </div>
      </div>

      {/* Error / Success banners */}
      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200"
        >
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 border border-green-200">
          {successMsg}
        </div>
      )}

      {/* Questions */}
      <div className="mt-6 space-y-6">
        {data.questions.map((question) => (
          <QuestionCard
            key={question.questionNumber}
            question={question}
            score={scores[question.questionNumber]}
            isSaving={savingQuestion === question.questionNumber}
            rubricOpen={rubricOpen === question.questionNumber}
            onScoreChange={(score) => handleScoreChange(question, score)}
            onToggleRubric={() =>
              setRubricOpen((prev) =>
                prev === question.questionNumber
                  ? null
                  : question.questionNumber
              )
            }
          />
        ))}
      </div>

      {/* Submit */}
      <div className="mt-8 flex items-center justify-end gap-3 pb-8">
        <button
          onClick={handleSubmitAll}
          disabled={!allScored || isSubmitting}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "Submitting..." : "Submit All Grades"}
        </button>
      </div>

      {/* Rubric Modal */}
      {rubricOpen !== null && (
        <RubricModal
          questionNumber={rubricOpen}
          content={
            data.questions.find((q) => q.questionNumber === rubricOpen)
              ?.rubricContent ?? null
          }
          onClose={() => setRubricOpen(null)}
        />
      )}
    </div>
  );
}

// ============================================
// Question Card (Dumb Component)
// ============================================

const QuestionCard = ({
  question,
  score,
  isSaving,
  rubricOpen,
  onScoreChange,
  onToggleRubric,
}: {
  question: GradingQuestion;
  score: number | null;
  isSaving: boolean;
  rubricOpen: boolean;
  onScoreChange: (score: number) => void;
  onToggleRubric: () => void;
}) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      {/* Question header */}
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Question {question.questionNumber}
        </h3>
        {question.rubricContent && (
          <button
            onClick={onToggleRubric}
            className={`text-xs font-medium transition-colors ${
              rubricOpen
                ? "text-blue-700"
                : "text-blue-600 hover:text-blue-800"
            }`}
          >
            {rubricOpen ? "Hide Rubric" : "View Rubric"}
          </button>
        )}
      </div>

      {/* Question text */}
      <p className="mt-1 text-sm text-gray-600">{question.questionText}</p>

      {/* Applicant response */}
      <div className="mt-3 rounded-lg bg-gray-50 p-4">
        <p className="text-xs font-medium text-gray-500 mb-1">
          Applicant Response
        </p>
        <p className="text-sm text-gray-800 whitespace-pre-wrap">
          {question.responseText || (
            <span className="italic text-gray-400">No response provided</span>
          )}
        </p>
      </div>

      {/* Score selection */}
      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Score:</span>
        <div className="flex gap-2" role="radiogroup" aria-label={`Score for question ${question.questionNumber}`}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              onClick={() => onScoreChange(value)}
              disabled={isSaving}
              aria-pressed={score === value}
              className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                score === value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {value}
            </button>
          ))}
        </div>
        {isSaving && (
          <span className="text-xs text-gray-400">Saving...</span>
        )}
      </div>
    </div>
  );
};

// ============================================
// Rubric Modal (Dumb Component)
// ============================================

const RubricModal = ({
  questionNumber,
  content,
  onClose,
}: {
  questionNumber: number;
  content: string | null;
  onClose: () => void;
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            Rubric — Question {questionNumber}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg font-bold"
            aria-label="Close rubric"
          >
            &times;
          </button>
        </div>
        {content ? (
          <div className="text-sm text-gray-700 whitespace-pre-wrap">
            {content}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">
            No rubric content available for this question.
          </p>
        )}
      </div>
    </div>
  );
};
