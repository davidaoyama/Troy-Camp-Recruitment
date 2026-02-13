import { supabaseAdmin } from "@/lib/supabase-admin";
import type { DashboardStats } from "@/lib/types";

const SEMESTER = process.env.NEXT_PUBLIC_CURRENT_SEMESTER!;

async function getDashboardStats(): Promise<DashboardStats> {
  // Total applications for this semester
  const { count: totalApplications } = await supabaseAdmin
    .from("applications")
    .select("*", { count: "exact", head: true })
    .eq("semester", SEMESTER);

  // Pending applications
  const { count: pendingCount } = await supabaseAdmin
    .from("applications")
    .select("*", { count: "exact", head: true })
    .eq("semester", SEMESTER)
    .eq("status", "pending");

  // Total graders
  const { count: totalGraders } = await supabaseAdmin
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("role", "grader");

  // Written grading progress: grades with non-null scores vs total placeholder rows
  const { count: writtenTotal } = await supabaseAdmin
    .from("written_grades")
    .select("*, applications!inner(semester)", { count: "exact", head: true })
    .eq("applications.semester", SEMESTER);

  const { count: writtenCompleted } = await supabaseAdmin
    .from("written_grades")
    .select("*, applications!inner(semester)", { count: "exact", head: true })
    .eq("applications.semester", SEMESTER)
    .not("score", "is", null);

  // Interview grading progress
  const { count: interviewTotal } = await supabaseAdmin
    .from("interview_assignments")
    .select("*, applications!inner(semester)", { count: "exact", head: true })
    .eq("applications.semester", SEMESTER);

  const { count: interviewCompleted } = await supabaseAdmin
    .from("interview_grades")
    .select("*, applications!inner(semester)", { count: "exact", head: true })
    .eq("applications.semester", SEMESTER);

  return {
    totalApplications: totalApplications ?? 0,
    pendingCount: pendingCount ?? 0,
    totalGraders: totalGraders ?? 0,
    writtenGradingProgress: {
      completed: writtenCompleted ?? 0,
      total: writtenTotal ?? 0,
    },
    interviewGradingProgress: {
      completed: interviewCompleted ?? 0,
      total: interviewTotal ?? 0,
    },
  };
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  const writtenPct =
    stats.writtenGradingProgress.total > 0
      ? Math.round(
          (stats.writtenGradingProgress.completed /
            stats.writtenGradingProgress.total) *
            100
        )
      : 0;

  const interviewPct =
    stats.interviewGradingProgress.total > 0
      ? Math.round(
          (stats.interviewGradingProgress.completed /
            stats.interviewGradingProgress.total) *
            100
        )
      : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        Dashboard — {SEMESTER}
      </h1>

      {/* Stats Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Applications" value={stats.totalApplications} />
        <StatCard label="Pending" value={stats.pendingCount} />
        <StatCard label="Graders" value={stats.totalGraders} />
      </div>

      {/* Grading Progress */}
      <div className="mt-8 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Grading Progress
        </h2>

        <ProgressSection
          label="Written Response Grading"
          completed={stats.writtenGradingProgress.completed}
          total={stats.writtenGradingProgress.total}
          percentage={writtenPct}
        />

        <ProgressSection
          label="Interview Grading"
          completed={stats.interviewGradingProgress.completed}
          total={stats.interviewGradingProgress.total}
          percentage={interviewPct}
        />
      </div>
    </div>
  );
}

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg bg-white p-5 border border-gray-200">
    <p className="text-sm text-gray-500">{label}</p>
    <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
  </div>
);

const ProgressSection = ({
  label,
  completed,
  total,
  percentage,
}: {
  label: string;
  completed: number;
  total: number;
  percentage: number;
}) => (
  <div>
    <div className="flex justify-between text-sm mb-1">
      <span className="font-medium text-gray-700">{label}</span>
      <span className="text-gray-500">
        {total > 0 ? `${completed} / ${total} (${percentage}%)` : "Not started"}
      </span>
    </div>
    <div className="h-2.5 w-full rounded-full bg-gray-200">
      <div
        className="h-2.5 rounded-full bg-blue-600 transition-all"
        style={{ width: `${percentage}%` }}
      />
    </div>
  </div>
);
