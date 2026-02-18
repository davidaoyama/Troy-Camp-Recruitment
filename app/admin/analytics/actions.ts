"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/auth";
import type { ActionResult, AnalyticsData, ApplicationRow } from "@/lib/types";

const SEMESTER = process.env.NEXT_PUBLIC_CURRENT_SEMESTER!;

const MAX_CATEGORIES = 8;

/** Group a free-text field into counted buckets, collapsing rare values into "Other". */
function groupField(
  apps: ApplicationRow[],
  field: keyof ApplicationRow
): { name: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const app of apps) {
    const raw = String(app[field] ?? "").trim();
    const value = raw === "" ? "Not specified" : raw;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  // Sort descending, keep top N, merge rest into "Other"
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  if (sorted.length <= MAX_CATEGORIES) {
    return sorted.map(([name, count]) => ({ name, count }));
  }

  const top = sorted.slice(0, MAX_CATEGORIES - 1);
  const otherCount = sorted
    .slice(MAX_CATEGORIES - 1)
    .reduce((sum, [, c]) => sum + c, 0);

  return [
    ...top.map(([name, count]) => ({ name, count })),
    { name: "Other", count: otherCount },
  ];
}

export async function getAnalyticsData(): Promise<
  ActionResult<{ data: AnalyticsData }>
> {
  try {
    await requireAdmin();

    const { data: apps, error } = await supabaseAdmin
      .from("applications")
      .select("*")
      .eq("semester", SEMESTER);

    if (error) {
      return { success: false, error: "Failed to fetch applications." };
    }

    if (!apps || apps.length === 0) {
      return {
        success: true,
        data: {
          totalApplicants: 0,
          avgScore: null,
          statusBreakdown: [],
          genderBreakdown: [],
          majorBreakdown: [],
          gradYearBreakdown: [],
          spanishFluent: { yes: 0, no: 0 },
          canAttendCamp: { yes: 0, no: 0 },
          scoreDistribution: [],
        },
      };
    }

    const typedApps = apps as ApplicationRow[];

    // Status breakdown
    const statusCounts = new Map<string, number>();
    for (const app of typedApps) {
      statusCounts.set(app.status, (statusCounts.get(app.status) ?? 0) + 1);
    }
    const statusBreakdown = [...statusCounts.entries()].map(
      ([name, count]) => ({ name, count })
    );

    // Demographic breakdowns
    const genderBreakdown = groupField(typedApps, "gender");
    const majorBreakdown = groupField(typedApps, "major");
    const gradYearBreakdown = groupField(typedApps, "graduation_year");

    // Boolean fields
    const spanishFluent = {
      yes: typedApps.filter((a) => a.spanish_fluent).length,
      no: typedApps.filter((a) => !a.spanish_fluent).length,
    };
    const canAttendCamp = {
      yes: typedApps.filter((a) => a.can_attend_camp).length,
      no: typedApps.filter((a) => !a.can_attend_camp).length,
    };

    // Score distribution (0-1, 1-2, 2-3, 3-4, 4-5)
    const scoreBuckets = [0, 0, 0, 0, 0];
    let scoreSum = 0;
    let scoreCount = 0;

    for (const app of typedApps) {
      if (app.total_score != null) {
        scoreSum += app.total_score;
        scoreCount++;
        const bucket = Math.min(Math.floor(app.total_score), 4);
        scoreBuckets[bucket]++;
      }
    }

    const scoreDistribution = scoreBuckets.map((count, i) => ({
      range: `${i}-${i + 1}`,
      count,
    }));

    const avgScore =
      scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 100) / 100 : null;

    return {
      success: true,
      data: {
        totalApplicants: typedApps.length,
        avgScore,
        statusBreakdown,
        genderBreakdown,
        majorBreakdown,
        gradYearBreakdown,
        spanishFluent,
        canAttendCamp,
        scoreDistribution,
      },
    };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}
