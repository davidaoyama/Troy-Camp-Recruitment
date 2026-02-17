"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getInterviewGradingData,
  saveInterviewNote,
  saveInterviewScore,
  submitAllInterviewGrades,
  type InterviewGradingPageData,
  type InterviewGradingQuestion,
  type InterviewGradingScoreEntry,
} from "../actions";

export default function InterviewGradingPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.assignmentId as string;

  const [data, setData] = useState<InterviewGradingPageData | null>(null);
  const [scores, setScores] = useState<Record<1 | 2, number | null>>({ 1: null, 2: null });
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingNote, setSavingNote] = useState<number | null>(null);
  const [savingScore, setSavingScore] = useState<1 | 2 | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [rubricOpen, setRubricOpen] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getInterviewGradingData(assignmentId);
    if (result.success) {
      setData(result.data);
      const initialScores: Record<1 | 2, number | null> = { 1: null, 2: null };
      for (const s of result.data.scores) {
        initialScores[s.subSection] = s.score;
      }
      setScores(initialScores);
      const initialNotes: Record<number, string> = {};
      for (const q of result.data.questions) {
        initialNotes[q.questionNumber] = q.notes ?? "";
      }
      setNotes(initialNotes);
    } else {
      setError(result.error);
    }
    setIsLoading(false);
  }, [assignmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleScoreChange = async (subSection: 1 | 2, newScore: number) => {
    const prevScore = scores[subSection];

    // Optimistic update
    setScores((prev) => ({ ...prev, [subSection]: newScore }));
    setSavingScore(subSection);
    setError(null);

    const result = await saveInterviewScore(assignmentId, subSection, newScore);

    if (!result.success) {
      // Rollback
      setScores((prev) => ({ ...prev, [subSection]: prevScore }));
      setError(result.error);
    }

    setSavingScore(null);
  };

  const handleNotesChange = (questionNumber: number, value: string) => {
    setNotes((prev) => ({ ...prev, [questionNumber]: value }));
  };

  const handleNotesBlur = async (questionNumber: number) => {
    const currentNotes = notes[questionNumber];
    setSavingNote(questionNumber);
    setError(null);

    const result = await saveInterviewNote(
      assignmentId,
      questionNumber,
      currentNotes || null
    );

    if (!result.success) {
      setError(result.error);
    }

    setSavingNote(null);
  };

  const handleSubmitAll = async () => {
    if (!data) return;

    // Client-side validation — both sub-section scores required
    if (scores[1] === null || scores[2] === null) {
      const missing = [1, 2].filter((s) => scores[s as 1 | 2] === null);
      setError(`Please provide scores for sub-section(s): ${missing.join(", ")}`);
      return;
    }

    const shortNotes = data.questions.filter(
      (q) => !notes[q.questionNumber] || notes[q.questionNumber].trim().length < 50
    );
    if (shortNotes.length > 0) {
      setError(
        `Notes must be at least 50 characters for question(s): ${shortNotes
          .map((q) => q.questionNumber)
          .join(", ")}`
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await submitAllInterviewGrades(assignmentId);

    if (result.success) {
      setSuccessMsg("All interview grades submitted successfully!");
      setTimeout(() => router.push("/grader/interview"), 1500);
    } else {
      setError(result.error);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center text-gray-500 mt-8">
        Loading interview grading data...
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
          onClick={() => router.push("/grader/interview")}
          className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!data) return null;

  const allNotesValid = data.questions.every(
    (q) => notes[q.questionNumber]?.trim().length >= 50
  );
  const bothScoresSet = scores[1] !== null && scores[2] !== null;
  const allComplete = bothScoresSet && allNotesValid;

  // Group questions by sub-section
  const sub1Questions = data.questions.filter((q) => q.subSection === 1);
  const sub2Questions = data.questions.filter((q) => q.subSection === 2);

  const renderScoreWidget = (subSection: 1 | 2, label: string) => (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-gray-900">
          {label}:
        </span>
        <div
          className="flex gap-2"
          role="radiogroup"
          aria-label={label}
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              onClick={() => handleScoreChange(subSection, value)}
              disabled={savingScore !== null}
              aria-pressed={scores[subSection] === value}
              className={`w-11 h-11 rounded-lg text-base font-bold transition-colors ${
                scores[subSection] === value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {value}
            </button>
          ))}
        </div>
        {savingScore === subSection && (
          <span className="text-xs text-gray-400">Saving...</span>
        )}
        {savingScore !== subSection && scores[subSection] !== null && (
          <span className="text-xs text-green-600">Saved</span>
        )}
      </div>
    </div>
  );

  const renderQuestionList = (questions: InterviewGradingQuestion[]) =>
    questions.map((question) => (
      <QuestionCard
        key={question.questionNumber}
        question={question}
        notes={notes[question.questionNumber] ?? ""}
        isSaving={savingNote === question.questionNumber}
        rubricOpen={rubricOpen === question.questionNumber}
        onNotesChange={(value) =>
          handleNotesChange(question.questionNumber, value)
        }
        onNotesBlur={() => handleNotesBlur(question.questionNumber)}
        onToggleRubric={() =>
          setRubricOpen((prev) =>
            prev === question.questionNumber
              ? null
              : question.questionNumber
          )
        }
      />
    ));

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push("/grader/interview")}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            &larr; Back to Dashboard
          </button>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            {data.assignment.anonymousId} — Round{" "}
            {data.assignment.section}
          </h1>
        </div>
        <div className="text-sm text-gray-500">
          {
            data.questions.filter(
              (q) => notes[q.questionNumber]?.trim().length >= 50
            ).length
          }{" "}
          / {data.questions.length} notes &middot; {[1, 2].filter((s) => scores[s as 1 | 2] !== null).length}/2 scored
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

      {/* Sub-section 1 */}
      {sub1Questions.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Sub-section 1</h2>
          {renderScoreWidget(1, "Sub-section 1 Score")}
          <div className="mt-4 space-y-6">
            {renderQuestionList(sub1Questions)}
          </div>
        </div>
      )}

      {/* Sub-section 2 */}
      {sub2Questions.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Sub-section 2</h2>
          {renderScoreWidget(2, "Sub-section 2 Score")}
          <div className="mt-4 space-y-6">
            {renderQuestionList(sub2Questions)}
          </div>
        </div>
      )}

      {/* Warning if a sub-section has no rubrics */}
      {sub1Questions.length === 0 && (
        <div className="mt-6 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-700">
          No rubric questions found for Sub-section 1. Contact an admin to add them.
        </div>
      )}
      {sub2Questions.length === 0 && (
        <div className="mt-6 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-700">
          No rubric questions found for Sub-section 2. Contact an admin to add them.
        </div>
      )}

      {/* Submit */}
      <div className="mt-8 flex items-center justify-end gap-3 pb-8">
        <button
          onClick={handleSubmitAll}
          disabled={!allComplete || isSubmitting}
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
  notes,
  isSaving,
  rubricOpen,
  onNotesChange,
  onNotesBlur,
  onToggleRubric,
}: {
  question: InterviewGradingQuestion;
  notes: string;
  isSaving: boolean;
  rubricOpen: boolean;
  onNotesChange: (value: string) => void;
  onNotesBlur: () => void;
  onToggleRubric: () => void;
}) => {
  const notesLength = notes.trim().length;
  const notesValid = notesLength >= 50;

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

      {/* Notes textarea */}
      <div className="mt-3">
        <label className="text-xs font-medium text-gray-700 mb-1 block">
          Interview Notes (minimum 50 characters)
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          onBlur={onNotesBlur}
          placeholder="Record your observations during the interview..."
          className={`w-full rounded-lg border p-3 text-sm min-h-[120px] transition-colors ${
            notesLength > 0 && !notesValid
              ? "border-red-300 bg-red-50"
              : "border-gray-300 bg-white"
          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
        />
        <div className="flex items-center justify-between mt-1">
          <span
            className={`text-xs ${
              notesLength === 0
                ? "text-gray-400"
                : notesValid
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {notesLength} / 50 characters
          </span>
          {isSaving && (
            <span className="text-xs text-gray-400">Saving...</span>
          )}
        </div>
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
