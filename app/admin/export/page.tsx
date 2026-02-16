"use client";

import { useState } from "react";
import { exportAllCSV, exportAcceptedCSV, exportBackupJSON } from "./actions";

const SEMESTER = process.env.NEXT_PUBLIC_CURRENT_SEMESTER ?? "Unknown";

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeSemester(semester: string): string {
  return semester.toLowerCase().replace(/\s+/g, "_");
}

export default function ExportPage() {
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadingAccepted, setLoadingAccepted] = useState(false);
  const [loadingBackup, setLoadingBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const handleExportAll = async () => {
    setLoadingAll(true);
    setError(null);
    setLastResult(null);
    try {
      const result = await exportAllCSV();
      if (!result.success) {
        setError(result.error);
        return;
      }
      const filename = `${sanitizeSemester(SEMESTER)}_all_applicants.csv`;
      downloadFile(result.csv, filename, "text/csv;charset=utf-8;");
      setLastResult(`Exported ${result.count} applicants to ${filename}`);
    } catch {
      setError("Failed to export CSV.");
    } finally {
      setLoadingAll(false);
    }
  };

  const handleExportAccepted = async () => {
    setLoadingAccepted(true);
    setError(null);
    setLastResult(null);
    try {
      const result = await exportAcceptedCSV();
      if (!result.success) {
        setError(result.error);
        return;
      }
      const filename = `${sanitizeSemester(SEMESTER)}_accepted.csv`;
      downloadFile(result.csv, filename, "text/csv;charset=utf-8;");
      setLastResult(`Exported ${result.count} accepted applicants to ${filename}`);
    } catch {
      setError("Failed to export accepted CSV.");
    } finally {
      setLoadingAccepted(false);
    }
  };

  const handleBackup = async () => {
    setLoadingBackup(true);
    setError(null);
    setLastResult(null);
    try {
      const result = await exportBackupJSON();
      if (!result.success) {
        setError(result.error);
        return;
      }
      const filename = `${sanitizeSemester(SEMESTER)}_backup.json`;
      downloadFile(result.json, filename, "application/json");
      setLastResult(`Database backup saved to ${filename}`);
    } catch {
      setError("Failed to export backup.");
    } finally {
      setLoadingBackup(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        Export Data — {SEMESTER}
      </h1>

      {/* Feedback messages */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {lastResult && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {lastResult}
        </div>
      )}

      {/* Export Options */}
      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Export Options</h2>

        <ExportCard
          title="All Applicants (CSV)"
          description="Export all applicants with demographics, per-question written averages, interview section averages, total score, status, and decision."
          buttonLabel="Export All CSV"
          loading={loadingAll}
          onClick={handleExportAll}
        />

        <ExportCard
          title="Accepted Applicants (CSV)"
          description="Export only accepted applicants in the same CSV format."
          buttonLabel="Export Accepted CSV"
          loading={loadingAccepted}
          onClick={handleExportAccepted}
        />

        <ExportCard
          title="Full Database Backup (JSON)"
          description="Export all semester data — applications, written responses, grades, interview assignments, grades, notes, and deliberation decisions."
          buttonLabel="Download Backup"
          loading={loadingBackup}
          onClick={handleBackup}
        />
      </div>
    </div>
  );
}

const ExportCard = ({
  title,
  description,
  buttonLabel,
  loading,
  onClick,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  loading: boolean;
  onClick: () => void;
}) => (
  <div className="rounded-lg border border-gray-200 bg-white p-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="font-medium text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      <button
        onClick={onClick}
        disabled={loading}
        className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Exporting..." : buttonLabel}
      </button>
    </div>
  </div>
);
