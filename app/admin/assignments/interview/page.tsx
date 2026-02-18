"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getInterviewAssignments,
  getGraders,
  saveInterviewAssignment,
  type InterviewAssignmentView,
} from "./actions";
import type { UserRow } from "@/lib/types";

type GraderPair = [string, string];

// Key format: "appId-section"
function makeKey(appId: string, section: 1 | 2) {
  return `${appId}-${section}`;
}

export default function InterviewAssignmentsPage() {
  const [assignments, setAssignments] = useState<InterviewAssignmentView[]>([]);
  const [graders, setGraders] = useState<Pick<UserRow, "id" | "full_name">[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Lifted grader selections: "appId-section" -> [grader1, grader2]
  const [selections, setSelections] = useState<Record<string, GraderPair>>({});
  const [savedSelections, setSavedSelections] = useState<
    Record<string, GraderPair>
  >({});

  const initializeSelections = useCallback(
    (data: InterviewAssignmentView[]) => {
      const sel: Record<string, GraderPair> = {};
      for (const a of data) {
        sel[makeKey(a.applicationId, 1)] = [
          a.section1[0]?.graderId ?? "",
          a.section1[1]?.graderId ?? "",
        ];
        sel[makeKey(a.applicationId, 2)] = [
          a.section2[0]?.graderId ?? "",
          a.section2[1]?.graderId ?? "",
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
        getInterviewAssignments(),
        getGraders(),
      ]);
      setAssignments(assignData);
      setGraders(graderData);
      initializeSelections(assignData);
    } catch {
      setError("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [initializeSelections]);

  useEffect(() => {
    load();
  }, [load]);

  // Compute dirty keys
  const dirtyKeys = useMemo(() => {
    const dirty: string[] = [];
    for (const key of Object.keys(selections)) {
      const cur = selections[key];
      const saved = savedSelections[key];
      if (!saved || cur[0] !== saved[0] || cur[1] !== saved[1]) {
        dirty.push(key);
      }
    }
    return dirty;
  }, [selections, savedSelections]);

  const hasDirtyRows = dirtyKeys.length > 0;

  const updateGrader = (
    appId: string,
    section: 1 | 2,
    index: 0 | 1,
    value: string
  ) => {
    const key = makeKey(appId, section);
    setSelections((prev) => {
      const pair = [...(prev[key] ?? ["", ""])] as GraderPair;
      pair[index] = value;
      return { ...prev, [key]: pair };
    });
    setSuccessMsg(null);
    setError(null);
  };

  const handleSaveAll = async () => {
    setError(null);
    setSuccessMsg(null);
    setIsSaving(true);

    // Parse dirty keys and validate
    const toSave: {
      key: string;
      appId: string;
      section: 1 | 2;
      g1: string;
      g2: string;
    }[] = [];

    for (const key of dirtyKeys) {
      const [appId, sectionStr] = key.split("-");
      const section = Number(sectionStr) as 1 | 2;
      const [g1, g2] = selections[key];

      if (!g1 || !g2) {
        setError("Both graders must be selected for every modified row.");
        setIsSaving(false);
        return;
      }
      if (g1 === g2) {
        setError("Both graders must be different for every modified row.");
        setIsSaving(false);
        return;
      }
      toSave.push({ key, appId, section, g1, g2 });
    }

    const results = await Promise.all(
      toSave.map((item) =>
        saveInterviewAssignment(
          item.appId,
          item.section,
          item.g1,
          item.g2
        ).then((r) => ({ key: item.key, ...r }))
      )
    );

    const failures = results.filter((r) => !r.success);

    if (failures.length > 0) {
      setError(
        `${failures.length} row(s) failed to save. ${failures[0] && "error" in failures[0] ? failures[0].error : ""}`
      );
    } else {
      setSuccessMsg(`Saved ${toSave.length} assignment(s) successfully.`);
      setSavedSelections((prev) => {
        const next = { ...prev };
        for (const item of toSave) {
          next[item.key] = [...selections[item.key]] as GraderPair;
        }
        return next;
      });
    }

    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Interview Assignments
        </h1>
        <p className="mt-8 text-center text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        Interview Assignments
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Assign 2 graders per applicant per round. Make your changes, then click
        Save All.
      </p>

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

      {assignments.length === 0 ? (
        <p className="mt-8 text-center text-gray-500">
          No applications found.
        </p>
      ) : (
        <div className="mt-6 space-y-8">
          {([1, 2] as const).map((section) => (
            <div key={section}>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Round {section}
              </h2>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {assignments.map((a) => {
                      const key = makeKey(a.applicationId, section);
                      const isDirty = dirtyKeys.includes(key);
                      const sel = selections[key] ?? ["", ""];
                      return (
                        <tr
                          key={a.applicationId}
                          className={
                            isDirty ? "bg-amber-50" : "hover:bg-gray-50"
                          }
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              {a.anonymousId}
                              {isDirty && (
                                <span
                                  className="inline-block w-2 h-2 rounded-full bg-amber-400"
                                  title="Unsaved changes"
                                />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <GraderSelect
                              value={sel[0]}
                              onChange={(v) =>
                                updateGrader(a.applicationId, section, 0, v)
                              }
                              graders={graders}
                              excludeId={sel[1]}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <GraderSelect
                              value={sel[1]}
                              onChange={(v) =>
                                updateGrader(a.applicationId, section, 1, v)
                              }
                              graders={graders}
                              excludeId={sel[0]}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

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
              : `Save All Changes (${dirtyKeys.length})`}
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
  excludeId,
}: {
  value: string;
  onChange: (val: string) => void;
  graders: Pick<UserRow, "id" | "full_name">[];
  excludeId: string;
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    aria-label="Select grader"
    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
  >
    <option value="">Select grader...</option>
    {graders.map((g) => (
      <option key={g.id} value={g.id} disabled={g.id === excludeId}>
        {g.full_name}
      </option>
    ))}
  </select>
);
