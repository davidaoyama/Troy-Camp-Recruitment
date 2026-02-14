"use server";

import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

// ============================================
// Types
// ============================================

export interface GraderAssignment {
  applicationId: string;
  anonymousId: string;
  gradedCount: number;
  totalQuestions: number; // always 5
}

export interface GradingQuestion {
  questionNumber: number;
  questionText: string;
  responseText: string;
  rubricContent: string | null;
  gradeId: string;
  score: number | null;
}

export interface GradingPageData {
  application: { id: string; anonymousId: string };
  questions: GradingQuestion[];
}

// ============================================
// Get assigned applications for current grader
// ============================================

export async function getGraderAssignments(): Promise<GraderAssignment[]> {
  const user = await requireAuth();
  const supabase = await createClient();

  // Get all written_grades for this grader
  const { data: grades, error: gradesError } = await supabase
    .from("written_grades")
    .select("application_id, score")
    .eq("grader_id", user.id);

  if (gradesError) throw new Error(gradesError.message);
  if (!grades || grades.length === 0) return [];

  // Get unique application IDs and compute graded counts
  const appMap = new Map<string, { gradedCount: number }>();
  for (const grade of grades) {
    const entry = appMap.get(grade.application_id) ?? { gradedCount: 0 };
    if (grade.score !== null) {
      entry.gradedCount++;
    }
    appMap.set(grade.application_id, entry);
  }

  // Fetch application anonymous IDs
  const appIds = Array.from(appMap.keys());
  const { data: apps, error: appsError } = await supabase
    .from("applications")
    .select("id, anonymous_id")
    .in("id", appIds)
    .order("anonymous_id", { ascending: true });

  if (appsError) throw new Error(appsError.message);
  if (!apps) return [];

  return apps.map((app) => ({
    applicationId: app.id,
    anonymousId: app.anonymous_id,
    gradedCount: appMap.get(app.id)?.gradedCount ?? 0,
    totalQuestions: 5,
  }));
}

// ============================================
// Get full grading data for a single application
// ============================================

export async function getGradingData(
  applicationId: string
): Promise<ActionResult<{ data: GradingPageData }>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    // Verify this grader is assigned to this application
    const { data: grades, error: gradesError } = await supabase
      .from("written_grades")
      .select("id, question_number, score")
      .eq("application_id", applicationId)
      .eq("grader_id", user.id)
      .order("question_number", { ascending: true });

    if (gradesError) return { success: false, error: gradesError.message };
    if (!grades || grades.length === 0) {
      return { success: false, error: "Application not found or not assigned to you" };
    }

    // Fetch application info
    const { data: app, error: appError } = await supabase
      .from("applications")
      .select("id, anonymous_id")
      .eq("id", applicationId)
      .single();

    if (appError || !app) {
      return { success: false, error: "Application not found" };
    }

    // Fetch written responses
    const { data: responses, error: respError } = await supabase
      .from("written_responses")
      .select("question_number, question_text, response_text")
      .eq("application_id", applicationId)
      .order("question_number", { ascending: true });

    if (respError) return { success: false, error: respError.message };

    // Fetch rubrics for written questions
    const { data: rubrics } = await supabaseAdmin
      .from("rubrics")
      .select("question_number, rubric_content")
      .eq("question_type", "written");

    // Build rubric lookup
    const rubricMap = new Map<number, string | null>();
    if (rubrics) {
      for (const r of rubrics) {
        rubricMap.set(r.question_number, r.rubric_content);
      }
    }

    // Build response lookup
    const responseMap = new Map<number, { questionText: string; responseText: string }>();
    if (responses) {
      for (const r of responses) {
        responseMap.set(r.question_number, {
          questionText: r.question_text,
          responseText: r.response_text,
        });
      }
    }

    // Combine into questions array
    const questions: GradingQuestion[] = grades.map((grade) => {
      const resp = responseMap.get(grade.question_number);
      return {
        questionNumber: grade.question_number,
        questionText: resp?.questionText ?? `Question ${grade.question_number}`,
        responseText: resp?.responseText ?? "",
        rubricContent: rubricMap.get(grade.question_number) ?? null,
        gradeId: grade.id,
        score: grade.score,
      };
    });

    return {
      success: true,
      data: {
        application: { id: app.id, anonymousId: app.anonymous_id },
        questions,
      },
    };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

// ============================================
// Save a single grade (draft save)
// ============================================

export async function saveGrade(
  gradeId: string,
  score: number
): Promise<ActionResult> {
  try {
    const user = await requireAuth();

    // Validate score
    if (score < 1 || score > 5 || !Number.isInteger(score)) {
      return { success: false, error: "Score must be an integer between 1 and 5" };
    }

    // Verify ownership: the grade belongs to this grader
    const { data: grade, error: fetchError } = await supabaseAdmin
      .from("written_grades")
      .select("grader_id")
      .eq("id", gradeId)
      .single();

    if (fetchError || !grade) {
      return { success: false, error: "Grade not found" };
    }
    if (grade.grader_id !== user.id) {
      return { success: false, error: "Not authorized to modify this grade" };
    }

    const { error } = await supabaseAdmin
      .from("written_grades")
      .update({ score })
      .eq("id", gradeId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

// ============================================
// Submit all grades for an application
// ============================================

export async function submitAllGrades(
  applicationId: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth();

    // Fetch all grades for this grader + application
    const { data: grades, error: fetchError } = await supabaseAdmin
      .from("written_grades")
      .select("id, score")
      .eq("application_id", applicationId)
      .eq("grader_id", user.id);

    if (fetchError) return { success: false, error: fetchError.message };
    if (!grades || grades.length === 0) {
      return { success: false, error: "No grades found for this application" };
    }

    // Validate all 5 questions are scored
    const unscored = grades.filter((g) => g.score === null);
    if (unscored.length > 0) {
      return {
        success: false,
        error: `Please score all questions before submitting. ${unscored.length} question(s) remaining.`,
      };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}
