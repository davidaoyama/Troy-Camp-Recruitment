"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApplicationRow } from "@/lib/types";

type SortKey = "anonymous_id" | "last_name" | "total_score" | "status";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  auto_accept: "bg-green-100 text-green-700",
  auto_reject: "bg-red-100 text-red-700",
  discuss: "bg-blue-100 text-blue-700",
  accepted: "bg-green-200 text-green-800",
  rejected: "bg-red-200 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  auto_accept: "Auto-Accept",
  auto_reject: "Auto-Reject",
  discuss: "Discuss",
  accepted: "Accepted",
  rejected: "Rejected",
};

export const ApplicantTable = ({
  applicants,
}: {
  applicants: ApplicationRow[];
}) => {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("anonymous_id");
  const [sortAsc, setSortAsc] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const filtered =
    statusFilter === "all"
      ? applicants
      : applicants.filter((a) => a.status === statusFilter);

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortAsc ? 1 : -1;
    if (sortKey === "total_score") {
      return ((a.total_score ?? 0) - (b.total_score ?? 0)) * dir;
    }
    const aVal = a[sortKey] ?? "";
    const bVal = b[sortKey] ?? "";
    return String(aVal).localeCompare(String(bVal)) * dir;
  });

  const statuses = ["all", ...new Set(applicants.map((a) => a.status))];

  return (
    <div className="mt-4">
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === s
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s === "all" ? "All" : STATUS_LABELS[s] ?? s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <SortableHeader
                label="ID"
                sortKey="anonymous_id"
                current={sortKey}
                asc={sortAsc}
                onSort={handleSort}
              />
              <SortableHeader
                label="Name"
                sortKey="last_name"
                current={sortKey}
                asc={sortAsc}
                onSort={handleSort}
              />
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Major
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Year
              </th>
              <SortableHeader
                label="Score"
                sortKey="total_score"
                current={sortKey}
                asc={sortAsc}
                onSort={handleSort}
              />
              <SortableHeader
                label="Status"
                sortKey="status"
                current={sortKey}
                asc={sortAsc}
                onSort={handleSort}
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  No applicants found.
                </td>
              </tr>
            ) : (
              sorted.map((app) => (
                <tr
                  key={app.id}
                  onClick={() => router.push(`/admin/applicants/${app.id}`)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {app.anonymous_id}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {app.first_name} {app.last_name}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{app.major}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {app.graduation_year}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {app.total_score !== null ? app.total_score.toFixed(2) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[app.status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {STATUS_LABELS[app.status] ?? app.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SortableHeader = ({
  label,
  sortKey,
  current,
  asc,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  asc: boolean;
  onSort: (key: SortKey) => void;
}) => (
  <th className="text-left px-4 py-3">
    <button
      onClick={() => onSort(sortKey)}
      className="font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1"
    >
      {label}
      {current === sortKey && (
        <span className="text-xs">{asc ? "\u2191" : "\u2193"}</span>
      )}
    </button>
  </th>
);
