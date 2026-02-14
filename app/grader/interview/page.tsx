"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getInterviewAssignments,
  type InterviewAssignmentCard,
} from "./actions";

export default function InterviewDashboardPage() {
  const [assignments, setAssignments] = useState<InterviewAssignmentCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAssignments = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getInterviewAssignments();
      setAssignments(data);
    } catch {
      setError("Failed to load interview assignments");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const completedCount = assignments.filter(
    (a) => a.hasScore && a.notesCount === a.totalQuestions
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Interview Grading
          </h1>
          {!isLoading && assignments.length > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              {completedCount} of {assignments.length} interviews completed
            </p>
          )}
        </div>
      </div>

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

      {isLoading ? (
        <div className="mt-8 text-center text-gray-500">
          Loading assignments...
        </div>
      ) : assignments.length === 0 ? (
        <div className="mt-8 text-center text-gray-500">
          No interview assignments yet.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map((assignment) => {
            const isComplete =
              assignment.hasScore &&
              assignment.notesCount === assignment.totalQuestions;
            const inProgress =
              assignment.hasScore || assignment.notesCount > 0;
            const progressPercent =
              assignment.totalQuestions > 0
                ? (assignment.notesCount / assignment.totalQuestions) * 100
                : 0;

            return (
              <Link
                key={assignment.assignmentId}
                href={`/grader/interview/${assignment.assignmentId}`}
                className="block rounded-lg border border-gray-200 bg-white p-5 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {assignment.anonymousId}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Section {assignment.section}
                    </p>
                  </div>
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      isComplete
                        ? "bg-green-100 text-green-700"
                        : inProgress
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {isComplete
                      ? "Complete"
                      : inProgress
                      ? "In Progress"
                      : "Not Started"}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>
                      {assignment.notesCount} / {assignment.totalQuestions} notes
                    </span>
                    <span>
                      {assignment.hasScore ? "Scored" : "No score"}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isComplete ? "bg-green-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
