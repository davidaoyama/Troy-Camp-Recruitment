"use client";

import type { DeliberationDetail } from "@/lib/types";
import { WrittenResponsesAccordion } from "@/app/admin/deliberations/components/WrittenResponsesAccordion";
import { InterviewGradesAccordion } from "@/app/admin/deliberations/components/InterviewGradesAccordion";

interface ApplicantProfileProps {
  detail: DeliberationDetail;
}

const STATUS_STYLES: Record<string, string> = {
  auto_accept: "bg-green-100 text-green-800",
  discuss: "bg-yellow-100 text-yellow-800",
  auto_reject: "bg-red-100 text-red-800",
  accepted: "bg-green-600 text-white",
  rejected: "bg-red-600 text-white",
  pending: "bg-gray-100 text-gray-800",
};

const STATUS_LABELS: Record<string, string> = {
  auto_accept: "Auto-Accept",
  discuss: "Discuss",
  auto_reject: "Auto-Reject",
  accepted: "Accepted",
  rejected: "Rejected",
  pending: "Pending",
};

export const ApplicantProfile = ({ detail }: ApplicantProfileProps) => {
  const { applicant, writtenAvg, interviewAvg, writtenResponses, interviewSections } = detail;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {applicant.anonymousId}: {applicant.firstName} {applicant.lastName}
        </h1>
        <span
          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[applicant.status] ?? "bg-gray-100 text-gray-800"}`}
        >
          {STATUS_LABELS[applicant.status] ?? applicant.status}
        </span>
      </div>

      {/* Two Column Layout: Photo+Demographics | Scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Photo + Demographics */}
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={applicant.photoUrl}
            alt={`${applicant.firstName} ${applicant.lastName}`}
            className="w-full max-w-sm aspect-square object-cover rounded-lg mb-4 bg-gray-100"
          />

          <div className="space-y-2 text-sm">
            <InfoRow label="Email" value={applicant.email} />
            <InfoRow label="Phone" value={applicant.phoneNumber} />
            <InfoRow label="Pronouns" value={applicant.pronouns} />
            <InfoRow label="Major" value={applicant.major} />
            <InfoRow label="Graduation" value={applicant.graduationYear} />
            <InfoRow label="Gender" value={applicant.gender} />
            <InfoRow
              label="Spanish Fluency"
              value={applicant.spanishFluent ? "Yes" : "No"}
            />
            <InfoRow
              label="Can Attend Camp"
              value={applicant.canAttendCamp ? "Yes" : "No"}
            />
          </div>
        </div>

        {/* Right Column: Score Summary */}
        <div>
          <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Score Summary
            </h3>
            <div className="space-y-3">
              <ScoreRow label="Written Avg" value={writtenAvg} />
              <ScoreRow label="Interview Avg" value={interviewAvg} />
              <div className="border-t border-gray-200 pt-3">
                <ScoreRow label="Total Score" value={applicant.totalScore} large />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Written Responses */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <WrittenResponsesAccordion
          responses={writtenResponses}
          writtenAvg={writtenAvg}
        />
      </div>

      {/* Interview Grades */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <InterviewGradesAccordion
          sections={interviewSections}
          interviewAvg={interviewAvg}
        />
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

const ScoreRow = ({
  label,
  value,
  large,
}: {
  label: string;
  value: number | null;
  large?: boolean;
}) => (
  <div className="flex justify-between items-baseline">
    <span className={`text-gray-600 ${large ? "font-semibold" : ""}`}>
      {label}
    </span>
    <span
      className={`font-bold ${large ? "text-2xl text-gray-900" : "text-lg text-gray-800"}`}
    >
      {value !== null ? value.toFixed(2) : "N/A"}
    </span>
  </div>
);
