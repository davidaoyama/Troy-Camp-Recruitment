"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/auth";
import type { ActionResult, ApplicantScore, CategorizationResult } from "@/lib/types";

const SEMESTER = process.env.NEXT_PUBLIC_CURRENT_SEMESTER!;

/**
 * Recalculate total_score for all applicants in the current semester.
 * Written avg = AVG(written_grades.score), Interview avg = AVG(interview_grades.score via assignments),
 * Total = (writtenAvg + interviewAvg) / 2. Handles partial data gracefully.
 */
export async function recalculateAllScores(): Promise<
  ActionResult<{ calculatedCount: number; incompleteCount: number; scores: ApplicantScore[] }>
> {
  try {
    await requireAdmin();

    // Get all applications for this semester
    const { data: apps, error: appsError } = await supabaseAdmin
      .from("applications")
      .select("id, anonymous_id")
      .eq("semester", SEMESTER)
      .order("anonymous_id", { ascending: true });

    if (appsError) {
      return { success: false, error: appsError.message };
    }

    if (!apps || apps.length === 0) {
      return { success: false, error: "No applications found for this semester." };
    }

    const appIds = apps.map((a) => a.id);

    // Fetch all written grades for these apps in one query
    const { data: allWrittenGrades } = await supabaseAdmin
      .from("written_grades")
      .select("application_id, score")
      .in("application_id", appIds);

    // Fetch all interview grades via interview_assignments join
    const { data: allInterviewAssignments } = await supabaseAdmin
      .from("interview_assignments")
      .select("id, application_id")
      .in("application_id", appIds);

    const assignmentIds = allInterviewAssignments?.map((a) => a.id) ?? [];

    const { data: allInterviewGrades } = assignmentIds.length > 0
      ? await supabaseAdmin
          .from("interview_grades")
          .select("assignment_id, score")
          .in("assignment_id", assignmentIds)
      : { data: [] };

    // Build a map: assignment_id -> application_id
    const assignmentToApp = new Map<string, string>();
    for (const a of allInterviewAssignments ?? []) {
      assignmentToApp.set(a.id, a.application_id);
    }

    // Calculate scores per applicant
    const scores: ApplicantScore[] = [];
    let incompleteCount = 0;

    for (const app of apps) {
      // Written grades for this app
      const writtenScores = (allWrittenGrades ?? [])
        .filter((g) => g.application_id === app.id && g.score !== null)
        .map((g) => g.score as number);

      const writtenAvg =
        writtenScores.length > 0
          ? writtenScores.reduce((sum, s) => sum + s, 0) / writtenScores.length
          : null;

      // Interview grades for this app
      const interviewScores = (allInterviewGrades ?? [])
        .filter((g) => assignmentToApp.get(g.assignment_id) === app.id && g.score !== null)
        .map((g) => g.score as number);

      const interviewAvg =
        interviewScores.length > 0
          ? interviewScores.reduce((sum, s) => sum + s, 0) / interviewScores.length
          : null;

      // Total score
      let totalScore: number | null = null;
      if (writtenAvg !== null && interviewAvg !== null) {
        totalScore = (writtenAvg + interviewAvg) / 2;
      } else if (writtenAvg !== null) {
        totalScore = writtenAvg;
      } else if (interviewAvg !== null) {
        totalScore = interviewAvg;
      }

      // Round to 2 decimal places for DECIMAL(4,2)
      const roundedScore = totalScore !== null ? Math.round(totalScore * 100) / 100 : null;

      const isComplete = writtenScores.length === 15 && interviewScores.length === 4;
      if (!isComplete) incompleteCount++;

      scores.push({
        applicationId: app.id,
        anonymousId: app.anonymous_id,
        writtenAvg,
        interviewAvg,
        totalScore: roundedScore,
        writtenGradeCount: writtenScores.length,
        interviewGradeCount: interviewScores.length,
        isComplete,
      });

      // Update total_score in DB
      await supabaseAdmin
        .from("applications")
        .update({ total_score: roundedScore })
        .eq("id", app.id);
    }

    return {
      success: true,
      calculatedCount: apps.length,
      incompleteCount,
      scores,
    };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}

/**
 * Auto-categorize applicants: top 25% → auto_accept, bottom 25% → auto_reject, middle 50% → discuss.
 * Only affects apps with a calculated total_score. Preserves accepted/rejected statuses.
 */
export async function categorizeApplicants(): Promise<ActionResult<CategorizationResult>> {
  try {
    await requireAdmin();

    // Get all apps for this semester
    const { data: allApps, error: allAppsError } = await supabaseAdmin
      .from("applications")
      .select("id, total_score, status")
      .eq("semester", SEMESTER);

    if (allAppsError) {
      return { success: false, error: allAppsError.message };
    }

    if (!allApps || allApps.length === 0) {
      return { success: false, error: "No applications found for this semester." };
    }

    // Separate: apps with scores that can be categorized vs. those that can't
    const finalStatuses = ["accepted", "rejected"];
    const categorizable = allApps.filter(
      (a) => a.total_score !== null && !finalStatuses.includes(a.status)
    );
    const skippedCount =
      allApps.filter((a) => a.total_score === null && !finalStatuses.includes(a.status)).length;

    if (categorizable.length === 0) {
      return {
        success: false,
        error: "No applicants with calculated scores to categorize. Run score recalculation first.",
      };
    }

    // Sort by total_score descending
    categorizable.sort((a, b) => (b.total_score as number) - (a.total_score as number));

    const total = categorizable.length;
    const top25Index = Math.ceil(total * 0.25);
    const bottom25Start = total - Math.ceil(total * 0.25);

    const autoAcceptIds = categorizable.slice(0, top25Index).map((a) => a.id);
    const discussIds = categorizable.slice(top25Index, bottom25Start).map((a) => a.id);
    const autoRejectIds = categorizable.slice(bottom25Start).map((a) => a.id);

    // Batch update statuses
    if (autoAcceptIds.length > 0) {
      const { error } = await supabaseAdmin
        .from("applications")
        .update({ status: "auto_accept" })
        .in("id", autoAcceptIds);
      if (error) return { success: false, error: error.message };
    }

    if (discussIds.length > 0) {
      const { error } = await supabaseAdmin
        .from("applications")
        .update({ status: "discuss" })
        .in("id", discussIds);
      if (error) return { success: false, error: error.message };
    }

    if (autoRejectIds.length > 0) {
      const { error } = await supabaseAdmin
        .from("applications")
        .update({ status: "auto_reject" })
        .in("id", autoRejectIds);
      if (error) return { success: false, error: error.message };
    }

    return {
      success: true,
      autoAcceptCount: autoAcceptIds.length,
      discussCount: discussIds.length,
      autoRejectCount: autoRejectIds.length,
      skippedCount,
    };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}
