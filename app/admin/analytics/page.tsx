"use client";

import { useEffect, useState } from "react";
import type { AnalyticsData } from "@/lib/types";
import { getAnalyticsData } from "./actions";
import StatCard from "./components/StatCard";
import BarChartCard from "./components/BarChartCard";
import PieChartCard from "./components/PieChartCard";

const STATUS_COLORS: Record<string, string> = {
  pending: "#9ca3af",
  auto_accept: "#10b981",
  auto_reject: "#ef4444",
  discuss: "#f59e0b",
  accepted: "#22c55e",
  rejected: "#dc2626",
};

const AnalyticsPage = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      const result = await getAnalyticsData();

      if (cancelled) return;

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
      setIsLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!data || data.totalApplicants === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          No applicants found for this semester.
        </div>
      </div>
    );
  }

  // Build boolean pie data
  const spanishData = [
    { name: "Fluent", count: data.spanishFluent.yes },
    { name: "Not fluent", count: data.spanishFluent.no },
  ];
  const campData = [
    { name: "Can attend", count: data.canAttendCamp.yes },
    { name: "Cannot attend", count: data.canAttendCamp.no },
  ];

  const hasScores = data.scoreDistribution.some((b) => b.count > 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Applicants" value={data.totalApplicants} />
        <StatCard
          label="Average Score"
          value={data.avgScore != null ? data.avgScore.toFixed(2) : "N/A"}
          subtitle={data.avgScore != null ? "out of 5.00" : "No scores yet"}
        />
        <StatCard
          label="Statuses"
          value={data.statusBreakdown.length}
          subtitle="distinct status categories"
        />
      </div>

      {/* Status + Score row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChartCard
          title="Application Status"
          data={data.statusBreakdown}
          colorful
        />
        <BarChartCard
          title="Score Distribution"
          data={data.scoreDistribution.map((b) => ({
            name: b.range,
            count: b.count,
          }))}
          color="#8b5cf6"
          emptyMessage={hasScores ? undefined : "No scores calculated yet"}
        />
      </div>

      {/* Demographics row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PieChartCard title="Gender Breakdown" data={data.genderBreakdown} />
        <BarChartCard
          title="Major Distribution"
          data={data.majorBreakdown}
          colorful
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChartCard
          title="Graduation Year"
          data={data.gradYearBreakdown}
          color="#06b6d4"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <PieChartCard
            title="Spanish Fluency"
            data={spanishData}
          />
          <PieChartCard
            title="Camp Attendance"
            data={campData}
          />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
