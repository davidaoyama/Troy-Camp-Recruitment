"use client";

import { useState, useEffect, useCallback } from "react";
import type { DeliberationApplicant, DeliberationDetail } from "@/lib/types";
import {
  getDeliberationApplicants,
  getApplicantDetail,
  recordDecision,
} from "./actions";
import { DeliberationsSidebar } from "./components/DeliberationsSidebar";
import { ApplicantCard } from "./components/ApplicantCard";
import { WrittenResponsesAccordion } from "./components/WrittenResponsesAccordion";
import { InterviewGradesAccordion } from "./components/InterviewGradesAccordion";
import { DecisionButtons } from "./components/DecisionButtons";

type FilterTab = "all" | "auto_accept" | "discuss" | "auto_reject";

export default function DeliberationsPage() {
  const [applicants, setApplicants] = useState<DeliberationApplicant[]>([]);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DeliberationDetail | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch sidebar list on mount
  useEffect(() => {
    let cancelled = false;

    const fetchList = async () => {
      setIsLoadingList(true);
      const result = await getDeliberationApplicants();
      if (cancelled) return;

      if (result.success) {
        setApplicants(result.applicants);
        setError(null);
      } else {
        setError(result.error);
      }
      setIsLoadingList(false);
    };

    fetchList();
    return () => { cancelled = true; };
  }, []);

  // Fetch detail when selectedId changes
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }

    let cancelled = false;

    const fetchDetail = async () => {
      setIsLoadingDetail(true);
      const result = await getApplicantDetail(selectedId);
      if (cancelled) return;

      if (result.success) {
        setDetail(result.detail);
        setError(null);
      } else {
        setError(result.error);
      }
      setIsLoadingDetail(false);
    };

    fetchDetail();
    return () => { cancelled = true; };
  }, [selectedId]);

  // Filtered list for navigation
  const filteredApplicants =
    filter === "all"
      ? applicants
      : applicants.filter((a) => a.status === filter);

  const currentIndex = filteredApplicants.findIndex(
    (a) => a.id === selectedId
  );

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setSelectedId(filteredApplicants[currentIndex - 1].id);
    }
  }, [currentIndex, filteredApplicants]);

  const goToNext = useCallback(() => {
    if (currentIndex < filteredApplicants.length - 1) {
      setSelectedId(filteredApplicants[currentIndex + 1].id);
    }
  }, [currentIndex, filteredApplicants]);

  const handleDecision = async (decision: "accept" | "reject") => {
    if (!selectedId || isSubmitting) return;

    setIsSubmitting(true);
    const result = await recordDecision(selectedId, decision);

    if (result.success) {
      // Update the applicant in the sidebar list
      setApplicants((prev) =>
        prev.map((a) =>
          a.id === selectedId
            ? {
                ...a,
                status: result.updatedStatus as DeliberationApplicant["status"],
                hasDecision: true,
              }
            : a
        )
      );

      // Update the detail status
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              applicant: {
                ...prev.applicant,
                status: result.updatedStatus as DeliberationApplicant["status"],
              },
            }
          : null
      );

      // Auto-advance to next applicant
      if (currentIndex < filteredApplicants.length - 1) {
        setSelectedId(filteredApplicants[currentIndex + 1].id);
      }
    } else {
      setError(result.error);
    }

    setIsSubmitting(false);
  };

  // Loading state for sidebar
  if (isLoadingList) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading applicants...</p>
      </div>
    );
  }

  if (applicants.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500 text-lg">No applicants found.</p>
          <p className="text-gray-400 text-sm mt-1">
            Run score recalculation and categorization first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full -m-8">
      {/* Sidebar */}
      <DeliberationsSidebar
        applicants={applicants}
        filter={filter}
        selectedId={selectedId}
        onFilterChange={setFilter}
        onSelectApplicant={setSelectedId}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        {!selectedId && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-lg">
              Select an applicant from the sidebar
            </p>
          </div>
        )}

        {selectedId && isLoadingDetail && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Loading applicant details...</p>
          </div>
        )}

        {selectedId && !isLoadingDetail && detail && (
          <div>
            {/* Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={goToPrevious}
                disabled={currentIndex <= 0}
                className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <h1 className="text-xl font-bold text-gray-900">
                {detail.applicant.anonymousId}: {detail.applicant.firstName}{" "}
                {detail.applicant.lastName}
              </h1>

              <button
                onClick={goToNext}
                disabled={currentIndex >= filteredApplicants.length - 1}
                className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>

            {/* Applicant Info Card */}
            <ApplicantCard detail={detail} />

            {/* Written Responses */}
            <div className="mt-8">
              <WrittenResponsesAccordion
                responses={detail.writtenResponses}
                writtenAvg={detail.writtenAvg}
              />
            </div>

            {/* Interview Grades */}
            <div className="mt-8">
              <InterviewGradesAccordion
                sections={detail.interviewSections}
                interviewAvg={detail.interviewAvg}
              />
            </div>

            {/* Decision Buttons */}
            <DecisionButtons
              currentStatus={detail.applicant.status}
              isSubmitting={isSubmitting}
              onDecision={handleDecision}
            />
          </div>
        )}
      </div>
    </div>
  );
}
