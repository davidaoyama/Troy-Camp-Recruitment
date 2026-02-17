"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/auth";
import type { ActionResult, UserRow } from "@/lib/types";

const SEMESTER = process.env.NEXT_PUBLIC_CURRENT_SEMESTER!;
const GRADERS_PER_APP = 3;
const QUESTIONS_PER_APP = 5;

export interface WrittenAssignmentView {
  applicationId: string;
  anonymousId: string;
  graders: { id: string; fullName: string }[];
  gradedCount: number; // how many of 15 grades have non-null scores
}

export async function getWrittenAssignments(): Promise<WrittenAssignmentView[]> {
  await requireAdmin();

  // Get all applications for this semester
  const { data: apps } = await supabaseAdmin
    .from("applications")
    .select("id, anonymous_id")
    .eq("semester", SEMESTER)
    .order("anonymous_id", { ascending: true });

  if (!apps || apps.length === 0) return [];

  // Get all written grades with grader info
  const { data: grades } = await supabaseAdmin
    .from("written_grades")
    .select("application_id, grader_id, question_number, score, users(id, full_name)")
    .in(
      "application_id",
      apps.map((a) => a.id)
    );

  if (!grades) return [];

  // Group by application
  const appMap = new Map<
    string,
    {
      graders: Map<string, string>; // grader_id -> full_name
      gradedCount: number;
    }
  >();

  for (const grade of grades) {
    const entry = appMap.get(grade.application_id) ?? {
      graders: new Map(),
      gradedCount: 0,
    };

    const user = grade.users as unknown as { id: string; full_name: string } | null;
    if (user) {
      entry.graders.set(user.id, user.full_name);
    }
    if (grade.score !== null) {
      entry.gradedCount++;
    }

    appMap.set(grade.application_id, entry);
  }

  return apps.map((app) => {
    const entry = appMap.get(app.id);
    return {
      applicationId: app.id,
      anonymousId: app.anonymous_id,
      graders: entry
        ? Array.from(entry.graders.entries()).map(([id, fullName]) => ({
            id,
            fullName,
          }))
        : [],
      gradedCount: entry?.gradedCount ?? 0,
    };
  });
}

export async function autoFillWrittenGrading(): Promise<
  ActionResult<{ filledCount: number }>
> {
  try {
    await requireAdmin();

    // 1. Get all applications for semester
    const { data: applications } = await supabaseAdmin
      .from("applications")
      .select("id")
      .eq("semester", SEMESTER)
      .order("anonymous_id", { ascending: true });

    if (!applications || applications.length === 0) {
      return { success: false, error: "No applications found for this semester" };
    }

    // 2. Get all graders
    const { data: graders } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("role", "grader");

    if (!graders || graders.length < GRADERS_PER_APP) {
      return {
        success: false,
        error: `Need at least ${GRADERS_PER_APP} graders. Currently have ${graders?.length ?? 0}.`,
      };
    }

    // 3. Get existing assignments to find who already has graders
    const { data: existingGrades } = await supabaseAdmin
      .from("written_grades")
      .select("application_id, grader_id")
      .in(
        "application_id",
        applications.map((a) => a.id)
      );

    // Build map: application_id -> Set of assigned grader IDs
    const assignedMap = new Map<string, Set<string>>();
    for (const g of existingGrades ?? []) {
      const set = assignedMap.get(g.application_id) ?? new Set();
      set.add(g.grader_id);
      assignedMap.set(g.application_id, set);
    }

    // 4. Compute current grader workload from existing assignments
    const graderWorkload = new Map<string, number>();
    graders.forEach((g) => graderWorkload.set(g.id, 0));
    for (const graderSet of assignedMap.values()) {
      for (const graderId of graderSet) {
        if (graderWorkload.has(graderId)) {
          graderWorkload.set(graderId, (graderWorkload.get(graderId) ?? 0) + 1);
        }
      }
    }

    // 5. Only assign to apps with < 3 graders
    const rows: {
      application_id: string;
      grader_id: string;
      question_number: number;
      score: null;
    }[] = [];

    let filledCount = 0;

    for (const app of applications) {
      const existingGraders = assignedMap.get(app.id) ?? new Set();
      const needed = GRADERS_PER_APP - existingGraders.size;
      if (needed <= 0) continue;

      // Pick graders not already assigned to this app, sorted by lowest workload
      const available = graders.filter((g) => !existingGraders.has(g.id));
      const sorted = [...available].sort(
        (a, b) =>
          (graderWorkload.get(a.id) ?? 0) - (graderWorkload.get(b.id) ?? 0)
      );
      const assigned = sorted.slice(0, needed);

      for (const grader of assigned) {
        for (let q = 1; q <= QUESTIONS_PER_APP; q++) {
          rows.push({
            application_id: app.id,
            grader_id: grader.id,
            question_number: q,
            score: null,
          });
        }
        graderWorkload.set(
          grader.id,
          (graderWorkload.get(grader.id) ?? 0) + 1
        );
      }

      filledCount++;
    }

    if (rows.length === 0) {
      return {
        success: false,
        error: "All applicants already have 3 graders assigned.",
      };
    }

    // 6. Batch insert
    const BATCH_SIZE = 500;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabaseAdmin
        .from("written_grades")
        .insert(batch);

      if (insertError) {
        return {
          success: false,
          error: `Insert failed at batch ${Math.floor(i / BATCH_SIZE) + 1}: ${insertError.message}`,
        };
      }
    }

    return { success: true, filledCount };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getGraders(): Promise<
  Pick<UserRow, "id" | "full_name">[]
> {
  await requireAdmin();

  const { data } = await supabaseAdmin
    .from("users")
    .select("id, full_name")
    .eq("role", "grader")
    .order("full_name", { ascending: true });

  return (data ?? []) as Pick<UserRow, "id" | "full_name">[];
}

export async function saveWrittenAssignment(
  applicationId: string,
  graderIds: [string, string, string]
): Promise<ActionResult> {
  try {
    await requireAdmin();

    // Validate all 3 graders are different
    const unique = new Set(graderIds);
    if (unique.size !== 3) {
      return { success: false, error: "All 3 graders must be different" };
    }

    if (graderIds.some((id) => !id)) {
      return { success: false, error: "All 3 graders must be selected" };
    }

    // Delete existing ungraded written_grades for this application
    await supabaseAdmin
      .from("written_grades")
      .delete()
      .eq("application_id", applicationId)
      .is("score", null);

    // Insert new rows: 3 graders × 5 questions = 15 rows
    const rows: {
      application_id: string;
      grader_id: string;
      question_number: number;
      score: null;
    }[] = [];

    for (const graderId of graderIds) {
      for (let q = 1; q <= QUESTIONS_PER_APP; q++) {
        rows.push({
          application_id: applicationId,
          grader_id: graderId,
          question_number: q,
          score: null,
        });
      }
    }

    const { error } = await supabaseAdmin
      .from("written_grades")
      .insert(rows);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function clearWrittenAssignments(): Promise<ActionResult> {
  try {
    await requireAdmin();

    // Only clear ungraded assignments (score IS NULL) for safety
    const { data: apps } = await supabaseAdmin
      .from("applications")
      .select("id")
      .eq("semester", SEMESTER);

    if (!apps || apps.length === 0) {
      return { success: true };
    }

    const { error } = await supabaseAdmin
      .from("written_grades")
      .delete()
      .in(
        "application_id",
        apps.map((a) => a.id)
      )
      .is("score", null);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}
