"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getWrittenAssignments,
  autoFillWrittenGrading,
  clearWrittenAssignments,
  getGraders,
  saveWrittenAssignment,
  type WrittenAssignmentView,
} from "./actions";
import type { UserRow } from "@/lib/types";

export default function WrittenAssignmentsPage() {
  const [assignments, setAssignments] = useState<WrittenAssignmentView[]>([]);
  const [graders, setGraders] = useState<Pick<UserRow, "id" | "full_name">[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isFilling, setIsFilling] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [assignData, graderData] = await Promise.all([
        getWrittenAssignments(),
        getGraders(),
      ]);
      setAssignments(assignData);
      setGraders(graderData);
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

  const handleAutoFill = async () => {
    setError(null);
    setSuccessMsg(null);
    setIsFilling(true);

    const result = await autoFillWrittenGrading();

    if (result.success) {
      setSuccessMsg(
        `Successfully filled graders for ${result.filledCount} applicants.`
      );
      load();
    } else {
      setError(result.error);
    }

    setIsFilling(false);
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
            responses. Select graders manually or use Auto-Fill.
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
            onClick={handleAutoFill}
            disabled={isFilling}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isFilling ? "Filling..." : "Auto-Fill Graders"}
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
              <th className="text-right px-4 py-3 font-medium text-gray-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  Loading assignments...
                </td>
              </tr>
            ) : assignments.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  No applications found.
                </td>
              </tr>
            ) : (
              assignments.map((a) => (
                <AssignmentRow
                  key={a.applicationId}
                  assignment={a}
                  graders={graders}
                  onSaved={load}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const AssignmentRow = ({
  assignment,
  graders,
  onSaved,
}: {
  assignment: WrittenAssignmentView;
  graders: Pick<UserRow, "id" | "full_name">[];
  onSaved: () => void;
}) => {
  const [grader1, setGrader1] = useState(assignment.graders[0]?.id ?? "");
  const [grader2, setGrader2] = useState(assignment.graders[1]?.id ?? "");
  const [grader3, setGrader3] = useState(assignment.graders[2]?.id ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setRowError(null);
    setSaved(false);
    setIsSaving(true);

    const result = await saveWrittenAssignment(assignment.applicationId, [
      grader1,
      grader2,
      grader3,
    ]);

    if (result.success) {
      setSaved(true);
      onSaved();
    } else {
      setRowError(result.error);
    }

    setIsSaving(false);
  };

  const allSelected = grader1 && grader2 && grader3;
  const allDifferent =
    new Set([grader1, grader2, grader3]).size === 3;
  const canSave = allSelected && allDifferent;

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 font-medium text-gray-900">
        {assignment.anonymousId}
      </td>
      <td className="px-4 py-3">
        <GraderSelect
          value={grader1}
          onChange={setGrader1}
          graders={graders}
          excludeIds={[grader2, grader3]}
        />
      </td>
      <td className="px-4 py-3">
        <GraderSelect
          value={grader2}
          onChange={setGrader2}
          graders={graders}
          excludeIds={[grader1, grader3]}
        />
      </td>
      <td className="px-4 py-3">
        <GraderSelect
          value={grader3}
          onChange={setGrader3}
          graders={graders}
          excludeIds={[grader1, grader2]}
        />
      </td>
      <td className="px-4 py-3">
        {assignment.graders.length > 0 ? (
          <span
            className={`text-xs font-medium ${
              assignment.gradedCount === 15
                ? "text-green-600"
                : "text-gray-500"
            }`}
          >
            {assignment.gradedCount}/15
          </span>
        ) : (
          <span className="text-xs text-gray-400">&mdash;</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {rowError && (
            <span className="text-xs text-red-600">{rowError}</span>
          )}
          {saved && <span className="text-xs text-green-600">Saved</span>}
          <button
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? "..." : "Save"}
          </button>
        </div>
      </td>
    </tr>
  );
};

const GraderSelect = ({
  value,
  onChange,
  graders,
  excludeIds,
}: {
  value: string;
  onChange: (val: string) => void;
  graders: Pick<UserRow, "id" | "full_name">[];
  excludeIds: string[];
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    aria-label="Select grader"
    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
  >
    <option value="">Select grader...</option>
    {graders.map((g) => (
      <option key={g.id} value={g.id} disabled={excludeIds.includes(g.id)}>
        {g.full_name}
      </option>
    ))}
  </select>
);
