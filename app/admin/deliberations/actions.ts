"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/auth";
import type {
  ActionResult,
  DeliberationApplicant,
  DeliberationDetail,
  WrittenResponseDetail,
  InterviewSectionDetail,
} from "@/lib/types";

const SEMESTER = process.env.NEXT_PUBLIC_CURRENT_SEMESTER!;

// ============================================
// Get all applicants for the sidebar list
// ============================================

export async function getDeliberationApplicants(): Promise<
  ActionResult<{ applicants: DeliberationApplicant[] }>
> {
  try {
    await requireAdmin();

    const { data: apps, error: appsError } = await supabaseAdmin
      .from("applications")
      .select("id, anonymous_id, first_name, last_name, status, total_score")
      .eq("semester", SEMESTER)
      .order("anonymous_id", { ascending: true });

    if (appsError) return { success: false, error: appsError.message };
    if (!apps || apps.length === 0) {
      return { success: true, applicants: [] };
    }

    // Check which applicants already have decisions
    const appIds = apps.map((a) => a.id);
    const { data: decisions } = await supabaseAdmin
      .from("deliberation_decisions")
      .select("application_id")
      .in("application_id", appIds);

    const decidedSet = new Set(decisions?.map((d) => d.application_id) ?? []);

    const applicants: DeliberationApplicant[] = apps.map((a) => ({
      id: a.id,
      anonymousId: a.anonymous_id,
      firstName: a.first_name,
      lastName: a.last_name,
      status: a.status,
      totalScore: a.total_score,
      hasDecision: decidedSet.has(a.id),
    }));

    return { success: true, applicants };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}

// ============================================
// Get full detail for a single applicant
// ============================================

export async function getApplicantDetail(
  applicationId: string
): Promise<ActionResult<{ detail: DeliberationDetail }>> {
  try {
    await requireAdmin();

    // 1. Fetch application
    const { data: app, error: appError } = await supabaseAdmin
      .from("applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (appError || !app) {
      return { success: false, error: "Application not found." };
    }

    // 2. Fetch written responses
    const { data: writtenResponses } = await supabaseAdmin
      .from("written_responses")
      .select("question_number, question_text, response_text")
      .eq("application_id", applicationId)
      .order("question_number", { ascending: true });

    // 3. Fetch written grades with grader names
    const { data: writtenGrades } = await supabaseAdmin
      .from("written_grades")
      .select("question_number, score, grader_id")
      .eq("application_id", applicationId)
      .not("score", "is", null);

    // Get grader names for written grades
    const writtenGraderIds = [
      ...new Set(writtenGrades?.map((g) => g.grader_id) ?? []),
    ];
    const { data: writtenGraders } =
      writtenGraderIds.length > 0
        ? await supabaseAdmin
            .from("users")
            .select("id, tc_name")
            .in("id", writtenGraderIds)
        : { data: [] };

    const graderNameMap = new Map(
      writtenGraders?.map((u) => [u.id, u.tc_name]) ?? []
    );

    // Build written response details
    const writtenResponseDetails: WrittenResponseDetail[] = (
      writtenResponses ?? []
    ).map((wr) => {
      const grades = (writtenGrades ?? []).filter(
        (g) => g.question_number === wr.question_number
      );
      const scores = grades.map((g) => g.score as number);
      const avgScore =
        scores.length > 0
          ? scores.reduce((sum, s) => sum + s, 0) / scores.length
          : null;

      return {
        questionNumber: wr.question_number,
        questionText: wr.question_text,
        responseText: wr.response_text,
        avgScore,
        graderDetails: grades.map((g) => ({
          graderName: graderNameMap.get(g.grader_id) ?? "Unknown",
          score: g.score as number,
        })),
      };
    });

    // Written average across all questions
    const allWrittenScores = (writtenGrades ?? [])
      .filter((g) => g.score !== null)
      .map((g) => g.score as number);
    const writtenAvg =
      allWrittenScores.length > 0
        ? allWrittenScores.reduce((sum, s) => sum + s, 0) /
          allWrittenScores.length
        : null;

    // 4. Fetch interview data
    const { data: assignments } = await supabaseAdmin
      .from("interview_assignments")
      .select("id, grader_id, section")
      .eq("application_id", applicationId)
      .order("section", { ascending: true });

    // Get interview grades (now with sub_section)
    const assignmentIds = assignments?.map((a) => a.id) ?? [];
    const { data: interviewGrades } =
      assignmentIds.length > 0
        ? await supabaseAdmin
            .from("interview_grades")
            .select("assignment_id, sub_section, score")
            .in("assignment_id", assignmentIds)
        : { data: [] };

    // Group grades by assignment_id → array of { sub_section, score }
    const gradesByAssignment = new Map<
      string,
      { sub_section: number; score: number }[]
    >();
    for (const g of interviewGrades ?? []) {
      if (g.score == null) continue;
      const list = gradesByAssignment.get(g.assignment_id) ?? [];
      list.push({ sub_section: g.sub_section, score: g.score });
      gradesByAssignment.set(g.assignment_id, list);
    }

    // Get interview notes
    const { data: interviewNotes } =
      assignmentIds.length > 0
        ? await supabaseAdmin
            .from("interview_notes")
            .select("assignment_id, question_number, notes")
            .in("assignment_id", assignmentIds)
            .order("question_number", { ascending: true })
        : { data: [] };

    // Get rubrics for interview question text
    const { data: interviewRubrics } = await supabaseAdmin
      .from("rubrics")
      .select("question_number, question_text, section")
      .eq("question_type", "interview")
      .order("question_number", { ascending: true });

    const rubricMap = new Map(
      interviewRubrics?.map((r) => [
        `${r.section}-${r.question_number}`,
        r.question_text,
      ]) ?? []
    );

    // Get grader names for interview
    const interviewGraderIds = [
      ...new Set(assignments?.map((a) => a.grader_id) ?? []),
    ];
    const { data: interviewGraders } =
      interviewGraderIds.length > 0
        ? await supabaseAdmin
            .from("users")
            .select("id, tc_name")
            .in("id", interviewGraderIds)
        : { data: [] };

    // Merge into graderNameMap
    for (const u of interviewGraders ?? []) {
      graderNameMap.set(u.id, u.tc_name);
    }

    // Group assignments by section
    const sectionMap = new Map<number, typeof assignments>();
    for (const a of assignments ?? []) {
      const list = sectionMap.get(a.section) ?? [];
      list.push(a);
      sectionMap.set(a.section, list);
    }

    const interviewSections: InterviewSectionDetail[] = [];
    let allInterviewScores: number[] = [];

    for (const [section, sectionAssignments] of sectionMap) {
      const sectionScores: number[] = [];
      const graderDetails = (sectionAssignments ?? []).map((a) => {
        const grades = gradesByAssignment.get(a.id) ?? [];
        const subScores = grades.map((g) => ({
          subSection: g.sub_section as 1 | 2,
          score: g.score,
        }));
        for (const g of grades) {
          sectionScores.push(g.score);
        }

        // Get notes for this assignment
        const assignmentNotes = (interviewNotes ?? [])
          .filter((n) => n.assignment_id === a.id)
          .map((n) => ({
            questionNumber: n.question_number,
            questionText:
              rubricMap.get(`${section}-${n.question_number}`) ??
              `Question ${n.question_number}`,
            notes: n.notes ?? "",
          }));

        return {
          graderName: graderNameMap.get(a.grader_id) ?? "Unknown",
          subScores,
          notes: assignmentNotes,
        };
      });

      allInterviewScores = [...allInterviewScores, ...sectionScores];

      interviewSections.push({
        section,
        avgScore:
          sectionScores.length > 0
            ? sectionScores.reduce((s, v) => s + v, 0) / sectionScores.length
            : null,
        graderDetails,
      });
    }

    const interviewAvg =
      allInterviewScores.length > 0
        ? allInterviewScores.reduce((s, v) => s + v, 0) /
          allInterviewScores.length
        : null;

    return {
      success: true,
      detail: {
        applicant: {
          id: app.id,
          anonymousId: app.anonymous_id,
          firstName: app.first_name,
          lastName: app.last_name,
          pronouns: app.pronouns ?? "",
          photoUrl: app.photo_url,
          major: app.major,
          graduationYear: app.graduation_year,
          gender: app.gender,
          spanishFluent: app.spanish_fluent,
          canAttendCamp: app.can_attend_camp,
          email: app.email,
          phoneNumber: app.phone_number,
          status: app.status,
          totalScore: app.total_score,
        },
        writtenAvg,
        interviewAvg,
        writtenResponses: writtenResponseDetails,
        interviewSections,
      },
    };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}

// ============================================
// Record a deliberation decision
// ============================================

export async function recordDecision(
  applicationId: string,
  decision: "accept" | "reject"
): Promise<ActionResult<{ updatedStatus: string }>> {
  try {
    const user = await requireAdmin();

    const newStatus = decision === "accept" ? "accepted" : "rejected";

    // Update application status
    const { error: updateError } = await supabaseAdmin
      .from("applications")
      .update({ status: newStatus })
      .eq("id", applicationId);

    if (updateError) return { success: false, error: updateError.message };

    // Insert decision record (upsert to allow re-decisions)
    const { error: decisionError } = await supabaseAdmin
      .from("deliberation_decisions")
      .upsert(
        {
          application_id: applicationId,
          decision,
          decided_by: user.id,
        },
        { onConflict: "application_id" }
      );

    // If upsert fails due to no unique constraint on application_id, fall back to insert
    if (decisionError) {
      // Just insert a new record
      const { error: insertError } = await supabaseAdmin
        .from("deliberation_decisions")
        .insert({
          application_id: applicationId,
          decision,
          decided_by: user.id,
        });

      if (insertError) return { success: false, error: insertError.message };
    }

    return { success: true, updatedStatus: newStatus };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}
