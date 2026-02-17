"use client";

import { useState } from "react";
import Link from "next/link";
import type { UserDetail } from "@/lib/types";

interface UserProfileProps {
  detail: UserDetail;
}

export const UserProfile = ({ detail }: UserProfileProps) => {
  const { user, writtenAssignments, interviewAssignments } = detail;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {user.full_name}
        </h1>
        <span
          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
            user.role === "admin"
              ? "bg-purple-100 text-purple-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {user.role}
        </span>
      </div>

      {/* User Info */}
      <div className="bg-gray-50 rounded-lg p-5 border border-gray-200 max-w-md">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          User Info
        </h3>
        <div className="space-y-2 text-sm">
          <InfoRow label="Username" value={user.username} />
          <InfoRow label="TC Name" value={user.tc_name} />
          <InfoRow label="Email" value={user.email ?? "—"} />
        </div>
      </div>

      {/* Written Assignments */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Written Assignments ({writtenAssignments.length})
        </h2>
        {writtenAssignments.length === 0 ? (
          <p className="text-sm text-gray-500">No written assignments.</p>
        ) : (
          <div className="space-y-3">
            {writtenAssignments.map((assignment) => (
              <WrittenAssignmentCard
                key={assignment.applicationId}
                assignment={assignment}
              />
            ))}
          </div>
        )}
      </div>

      {/* Interview Assignments */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Interview Assignments ({interviewAssignments.length})
        </h2>
        {interviewAssignments.length === 0 ? (
          <p className="text-sm text-gray-500">No interview assignments.</p>
        ) : (
          <div className="space-y-3">
            {interviewAssignments.map((assignment) => (
              <InterviewAssignmentCard
                key={`${assignment.applicationId}-${assignment.section}`}
                assignment={assignment}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium text-gray-900">{value}</span>
  </div>
);

// ============================================
// Written Assignment Card (expandable)
// ============================================

const WrittenAssignmentCard = ({
  assignment,
}: {
  assignment: UserDetail["writtenAssignments"][number];
}) => {
  const [open, setOpen] = useState(false);

  const gradedCount = assignment.grades.filter((g) => g.score !== null).length;
  const totalQuestions = assignment.grades.length;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-semibold text-blue-700">
            {assignment.anonymousId}
          </span>
          <span className="text-sm text-gray-700">
            {assignment.firstName} {assignment.lastName}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              gradedCount === totalQuestions
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {gradedCount}/{totalQuestions} graded
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="pb-2 font-medium">Q#</th>
                <th className="pb-2 font-medium">Question</th>
                <th className="pb-2 font-medium text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {assignment.grades.map((g) => (
                <tr key={g.questionNumber}>
                  <td className="py-2 text-gray-600">{g.questionNumber}</td>
                  <td className="py-2 text-gray-700 pr-4 max-w-md truncate">
                    {g.questionText}
                  </td>
                  <td className="py-2 text-right font-semibold">
                    {g.score !== null ? (
                      <span className="text-gray-900">{g.score}/5</span>
                    ) : (
                      <span className="text-gray-400">Not graded</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 text-right">
            <Link
              href={`/admin/applicants/${assignment.applicationId}`}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              View Applicant &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// Interview Assignment Card (expandable)
// ============================================

const InterviewAssignmentCard = ({
  assignment,
}: {
  assignment: UserDetail["interviewAssignments"][number];
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-semibold text-blue-700">
            {assignment.anonymousId}
          </span>
          <span className="text-sm text-gray-700">
            {assignment.firstName} {assignment.lastName}
          </span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            Section {assignment.section}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {assignment.score !== null ? (
            <span className="text-sm font-semibold text-gray-900">
              {assignment.score}/5
            </span>
          ) : (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
              Not graded
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
          {assignment.notes.length === 0 ? (
            <p className="text-sm text-gray-500">No notes recorded.</p>
          ) : (
            <div className="space-y-3">
              {assignment.notes.map((n) => (
                <div key={n.questionNumber}>
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    Q{n.questionNumber}: {n.questionText}
                  </p>
                  <p className="text-sm text-gray-800 bg-white rounded p-2 border border-gray-200">
                    {n.notes || <span className="text-gray-400 italic">No notes</span>}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 text-right">
            <Link
              href={`/admin/applicants/${assignment.applicationId}`}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              View Applicant &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
