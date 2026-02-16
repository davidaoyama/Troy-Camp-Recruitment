"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { recalculateAllScores, categorizeApplicants } from "../actions";
import type { CategorizationResult } from "@/lib/types";

export const ScoreManagementSection = () => {
  const router = useRouter();

  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [recalcMessage, setRecalcMessage] = useState<string | null>(null);
  const [categorizationResults, setCategorizationResults] =
    useState<CategorizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    setError(null);
    setRecalcMessage(null);

    const result = await recalculateAllScores();

    if (result.success) {
      const incompleteMsg =
        result.incompleteCount > 0
          ? ` (${result.incompleteCount} with incomplete grading)`
          : "";
      setRecalcMessage(
        `Scores calculated for ${result.calculatedCount} applicants${incompleteMsg}.`
      );
      router.refresh();
    } else {
      setError(result.error);
    }

    setIsRecalculating(false);
  };

  const handleCategorize = async () => {
    setIsCategorizing(true);
    setError(null);
    setCategorizationResults(null);

    const result = await categorizeApplicants();

    if (result.success) {
      setCategorizationResults({
        autoAcceptCount: result.autoAcceptCount,
        discussCount: result.discussCount,
        autoRejectCount: result.autoRejectCount,
        skippedCount: result.skippedCount,
      });
      router.refresh();
    } else {
      setError(result.error);
    }

    setIsCategorizing(false);
  };

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900">
        Score Management
      </h2>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Recalculate Scores */}
      <div className="mt-4 rounded-lg bg-white border border-gray-200 p-5">
        <h3 className="font-medium text-gray-900">Recalculate Scores</h3>
        <p className="mt-1 text-sm text-gray-500">
          Calculate total score for all applicants based on written and interview
          grades. Formula: (written avg + interview avg) / 2.
        </p>
        <button
          onClick={handleRecalculate}
          disabled={isRecalculating}
          className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRecalculating ? "Calculating…" : "Recalculate All Scores"}
        </button>

        {recalcMessage && (
          <p className="mt-3 text-sm text-green-700">{recalcMessage}</p>
        )}
      </div>

      {/* Categorize Applicants */}
      <div className="mt-4 rounded-lg bg-white border border-gray-200 p-5">
        <h3 className="font-medium text-gray-900">Categorize Applicants</h3>
        <p className="mt-1 text-sm text-gray-500">
          Auto-categorize by score: top 25% → auto-accept, bottom 25% →
          auto-reject, middle 50% → discuss. Only affects applicants with
          calculated scores.
        </p>
        <button
          onClick={handleCategorize}
          disabled={isCategorizing}
          className="mt-3 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCategorizing ? "Categorizing…" : "Categorize Applicants"}
        </button>

        {categorizationResults && (
          <div className="mt-3 space-y-1 text-sm">
            <p className="text-green-700">
              Auto-Accept: {categorizationResults.autoAcceptCount}
            </p>
            <p className="text-yellow-700">
              Discuss: {categorizationResults.discussCount}
            </p>
            <p className="text-red-700">
              Auto-Reject: {categorizationResults.autoRejectCount}
            </p>
            {categorizationResults.skippedCount > 0 && (
              <p className="text-gray-500">
                Skipped (no score): {categorizationResults.skippedCount}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
