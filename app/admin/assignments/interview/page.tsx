"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getInterviewAssignments,
  getGraders,
  saveInterviewAssignment,
  type InterviewAssignmentView,
} from "./actions";
import type { UserRow } from "@/lib/types";

export default function InterviewAssignmentsPage() {
  const [assignments, setAssignments] = useState<InterviewAssignmentView[]>([]);
  const [graders, setGraders] = useState<Pick<UserRow, "id" | "full_name">[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [assignData, graderData] = await Promise.all([
        getInterviewAssignments(),
        getGraders(),
      ]);
      setAssignments(assignData);
      setGraders(graderData);
    } catch {
      setError("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
        Assign 2 graders per applicant per section. Select graders and click
        Save.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200"
        >
          {error}
        </div>
      )}

      {assignments.length === 0 ? (
        <p className="mt-8 text-center text-gray-500">
          No applications found.
        </p>
      ) : (
        <div className="mt-6 space-y-8">
          <SectionTable
            title="Section 1"
            section={1}
            assignments={assignments}
            graders={graders}
            onSaved={load}
          />
          <SectionTable
            title="Section 2"
            section={2}
            assignments={assignments}
            graders={graders}
            onSaved={load}
          />
        </div>
      )}
    </div>
  );
}

const SectionTable = ({
  title,
  section,
  assignments,
  graders,
  onSaved,
}: {
  title: string;
  section: 1 | 2;
  assignments: InterviewAssignmentView[];
  graders: Pick<UserRow, "id" | "full_name">[];
  onSaved: () => void;
}) => (
  <div>
    <h2 className="text-lg font-semibold text-gray-900 mb-3">{title}</h2>
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
            <th className="text-right px-4 py-3 font-medium text-gray-600">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {assignments.map((a) => (
            <AssignmentRow
              key={a.applicationId}
              assignment={a}
              section={section}
              graders={graders}
              onSaved={onSaved}
            />
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const AssignmentRow = ({
  assignment,
  section,
  graders,
  onSaved,
}: {
  assignment: InterviewAssignmentView;
  section: 1 | 2;
  graders: Pick<UserRow, "id" | "full_name">[];
  onSaved: () => void;
}) => {
  const existing = section === 1 ? assignment.section1 : assignment.section2;

  const [grader1, setGrader1] = useState(existing[0]?.graderId ?? "");
  const [grader2, setGrader2] = useState(existing[1]?.graderId ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setRowError(null);
    setSaved(false);
    setIsSaving(true);

    const result = await saveInterviewAssignment(
      assignment.applicationId,
      section,
      grader1,
      grader2
    );

    if (result.success) {
      setSaved(true);
      onSaved();
    } else {
      setRowError(result.error);
    }

    setIsSaving(false);
  };

  const canSave = grader1 && grader2 && grader1 !== grader2;

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
          excludeId={grader2}
        />
      </td>
      <td className="px-4 py-3">
        <GraderSelect
          value={grader2}
          onChange={setGrader2}
          graders={graders}
          excludeId={grader1}
        />
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
