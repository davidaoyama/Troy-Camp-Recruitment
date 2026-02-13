"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getWrittenAssignments,
  autoAssignWrittenGrading,
  clearWrittenAssignments,
  type WrittenAssignmentView,
} from "./actions";

export default function WrittenAssignmentsPage() {
  const [assignments, setAssignments] = useState<WrittenAssignmentView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getWrittenAssignments();
      setAssignments(data);
    } catch {
      setError("Failed to load assignments");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hasAssignments = assignments.some((a) => a.graders.length > 0);

  const handleAutoAssign = async () => {
    setError(null);
    setSuccessMsg(null);
    setIsAssigning(true);

    const result = await autoAssignWrittenGrading();

    if (result.success) {
      setSuccessMsg(
        `Successfully assigned graders to ${result.assignedCount} applicants.`
      );
      load();
    } else {
      setError(result.error);
    }

    setIsAssigning(false);
  };

  const handleClear = async () => {
    if (
      !confirm(
        "Clear all ungraded written assignments? Graded entries will be preserved."
      )
    )
      return;

    setError(null);
    setSuccessMsg(null);
    setIsClearing(true);

    const result = await clearWrittenAssignments();

    if (result.success) {
      setSuccessMsg("Ungraded assignments cleared.");
      load();
    } else {
      setError(result.error);
    }

    setIsClearing(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Written Grading Assignments
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Each applicant gets 3 graders. Each grader grades all 5 written
            responses.
          </p>
        </div>
        <div className="flex gap-2">
          {hasAssignments && (
            <button
              onClick={handleClear}
              disabled={isClearing}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {isClearing ? "Clearing..." : "Clear Ungraded"}
            </button>
          )}
          <button
            onClick={handleAutoAssign}
            disabled={isAssigning}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isAssigning ? "Assigning..." : "Auto-Assign Graders"}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200"
        >
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 border border-green-200">
          {successMsg}
        </div>
      )}

      {/* Assignments Table */}
      <div className="mt-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Applicant
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Grader 1
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Grader 2
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Grader 3
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Progress
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  Loading assignments...
                </td>
              </tr>
            ) : assignments.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  No applications found.
                </td>
              </tr>
            ) : (
              assignments.map((a) => (
                <tr key={a.applicationId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {a.anonymousId}
                  </td>
                  {[0, 1, 2].map((i) => (
                    <td key={i} className="px-4 py-3 text-gray-700">
                      {a.graders[i]?.fullName ?? (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    {a.graders.length > 0 ? (
                      <span
                        className={`text-xs font-medium ${
                          a.gradedCount === 15
                            ? "text-green-600"
                            : "text-gray-500"
                        }`}
                      >
                        {a.gradedCount}/15
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
