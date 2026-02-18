"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getWrittenAssignments,
  autoFillWrittenGrading,
  clearWrittenAssignments,
  getGraders,
  saveWrittenAssignment,
  type WrittenAssignmentView,
} from "./actions";
import type { UserRow } from "@/lib/types";

type GraderTuple = [string, string, string];

export default function WrittenAssignmentsPage() {
  const [assignments, setAssignments] = useState<WrittenAssignmentView[]>([]);
  const [graders, setGraders] = useState<Pick<UserRow, "id" | "full_name">[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isFilling, setIsFilling] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Lifted grader selections: appId -> [grader1, grader2, grader3]
  const [selections, setSelections] = useState<Record<string, GraderTuple>>(
    {}
  );
  const [savedSelections, setSavedSelections] = useState<
    Record<string, GraderTuple>
  >({});

  const initializeSelections = useCallback(
    (data: WrittenAssignmentView[]) => {
      const sel: Record<string, GraderTuple> = {};
      for (const a of data) {
        sel[a.applicationId] = [
          a.graders[0]?.id ?? "",
          a.graders[1]?.id ?? "",
          a.graders[2]?.id ?? "",
        ];
      }
      setSelections(sel);
      setSavedSelections(sel);
    },
    []
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [assignData, graderData] = await Promise.all([
        getWrittenAssignments(),
        getGraders(),
      ]);
      setAssignments(assignData);
      setGraders(graderData);
      initializeSelections(assignData);
    } catch {
      setError("Failed to load assignments");
    } finally {
      setIsLoading(false);
    }
  }, [initializeSelections]);

  useEffect(() => {
    load();
  }, [load]);

  // Compute dirty rows
  const dirtyAppIds = useMemo(() => {
    const dirty: string[] = [];
    for (const appId of Object.keys(selections)) {
      const cur = selections[appId];
      const saved = savedSelections[appId];
      if (!saved || cur[0] !== saved[0] || cur[1] !== saved[1] || cur[2] !== saved[2]) {
        dirty.push(appId);
      }
    }
    return dirty;
  }, [selections, savedSelections]);

  const hasDirtyRows = dirtyAppIds.length > 0;

  const updateGrader = (appId: string, index: 0 | 1 | 2, value: string) => {
    setSelections((prev) => {
      const tuple = [...(prev[appId] ?? ["", "", ""])] as GraderTuple;
      tuple[index] = value;
      return { ...prev, [appId]: tuple };
    });
    // Clear messages when user makes changes
    setSuccessMsg(null);
    setError(null);
  };

  const handleSaveAll = async () => {
    setError(null);
    setSuccessMsg(null);
    setIsSaving(true);

    // Validate all dirty rows before saving
    const toSave: { appId: string; graderIds: GraderTuple }[] = [];
    for (const appId of dirtyAppIds) {
      const [g1, g2, g3] = selections[appId];
      if (!g1 || !g2 || !g3) {
        setError("All 3 graders must be selected for every modified row.");
        setIsSaving(false);
        return;
      }
      if (new Set([g1, g2, g3]).size !== 3) {
        setError("All 3 graders must be different for every modified row.");
        setIsSaving(false);
        return;
      }
      toSave.push({ appId, graderIds: [g1, g2, g3] });
    }

    // Save all dirty rows in parallel
    const results = await Promise.all(
      toSave.map((item) =>
        saveWrittenAssignment(item.appId, item.graderIds).then((r) => ({
          appId: item.appId,
          ...r,
        }))
      )
    );

    const failures = results.filter((r) => !r.success);

    if (failures.length > 0) {
      setError(
        `${failures.length} row(s) failed to save. ${failures[0] && "error" in failures[0] ? failures[0].error : ""}`
      );
    } else {
      setSuccessMsg(`Saved ${toSave.length} assignment(s) successfully.`);
      // Update saved state to match current selections (no reload)
      setSavedSelections((prev) => {
        const next = { ...prev };
        for (const item of toSave) {
          next[item.appId] = [...selections[item.appId]] as GraderTuple;
        }
        return next;
      });
    }

    setIsSaving(false);
  };

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
              assignments.map((a) => {
                const isDirty = dirtyAppIds.includes(a.applicationId);
                const sel = selections[a.applicationId] ?? ["", "", ""];
                return (
                  <tr
                    key={a.applicationId}
                    className={isDirty ? "bg-amber-50" : "hover:bg-gray-50"}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        {a.anonymousId}
                        {isDirty && (
                          <span className="inline-block w-2 h-2 rounded-full bg-amber-400" title="Unsaved changes" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <GraderSelect
                        value={sel[0]}
                        onChange={(v) => updateGrader(a.applicationId, 0, v)}
                        graders={graders}
                        excludeIds={[sel[1], sel[2]]}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <GraderSelect
                        value={sel[1]}
                        onChange={(v) => updateGrader(a.applicationId, 1, v)}
                        graders={graders}
                        excludeIds={[sel[0], sel[2]]}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <GraderSelect
                        value={sel[2]}
                        onChange={(v) => updateGrader(a.applicationId, 2, v)}
                        graders={graders}
                        excludeIds={[sel[0], sel[1]]}
                      />
                    </td>
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
                        <span className="text-xs text-gray-400">&mdash;</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Sticky Save All button */}
      {hasDirtyRows && (
        <div className="sticky bottom-4 mt-4 flex justify-end">
          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSaving
              ? "Saving..."
              : `Save All Changes (${dirtyAppIds.length})`}
          </button>
        </div>
      )}
    </div>
  );
}

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
