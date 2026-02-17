"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/auth";
import type {
  ActionResult,
  CreateUserInput,
  UserRow,
  UserDetail,
  UserWrittenAssignment,
  UserInterviewAssignment,
} from "@/lib/types";

export async function getUsers(): Promise<UserRow[]> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as UserRow[];
}

export async function createUser(
  input: CreateUserInput
): Promise<ActionResult<{ userId: string }>> {
  try {
    await requireAdmin();

    // Validate input
    const username = input.username.trim().toLowerCase();
    if (!username || username.length < 3) {
      return { success: false, error: "Username must be at least 3 characters" };
    }
    if (!input.password || input.password.length < 8) {
      return { success: false, error: "Password must be at least 8 characters" };
    }
    if (!input.fullName.trim()) {
      return { success: false, error: "Full name is required" };
    }
    if (!input.tcName.trim()) {
      return { success: false, error: "TC name is required" };
    }

    const email = `${username}@internal.app`;

    // Create auth user (auto-confirms email)
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: input.password,
        email_confirm: true,
      });

    if (authError) {
      if (authError.message.includes("already been registered")) {
        return { success: false, error: "Username already taken" };
      }
      return { success: false, error: `Auth error: ${authError.message}` };
    }

    // Create profile in public.users table
    const { error: profileError } = await supabaseAdmin.from("users").insert({
      id: authUser.user.id,
      username,
      role: input.role,
      full_name: input.fullName.trim(),
      tc_name: input.tcName.trim(),
      email,
    });

    if (profileError) {
      // Rollback: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return { success: false, error: `Profile error: ${profileError.message}` };
    }

    return { success: true, userId: authUser.user.id };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

// ============================================
// Get user detail (assignments, grades, notes)
// ============================================

export async function getUserDetail(
  userId: string
): Promise<ActionResult<{ detail: UserDetail }>> {
  try {
    await requireAdmin();

    // 1. Fetch user
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return { success: false, error: "User not found." };
    }

    // 2. Fetch written grades for this grader
    const { data: writtenGrades } = await supabaseAdmin
      .from("written_grades")
      .select("application_id, question_number, score")
      .eq("grader_id", userId)
      .order("question_number", { ascending: true });

    // Get unique application IDs from written grades
    const writtenAppIds = [
      ...new Set(writtenGrades?.map((g) => g.application_id) ?? []),
    ];

    // Fetch application info for written assignments
    const { data: writtenApps } =
      writtenAppIds.length > 0
        ? await supabaseAdmin
            .from("applications")
            .select("id, anonymous_id, first_name, last_name")
            .in("id", writtenAppIds)
        : { data: [] };

    const writtenAppMap = new Map(
      writtenApps?.map((a) => [a.id, a]) ?? []
    );

    // Fetch question texts from written_responses for these apps
    const { data: writtenResponses } =
      writtenAppIds.length > 0
        ? await supabaseAdmin
            .from("written_responses")
            .select("application_id, question_number, question_text")
            .in("application_id", writtenAppIds)
        : { data: [] };

    const questionTextMap = new Map(
      writtenResponses?.map((wr) => [
        `${wr.application_id}-${wr.question_number}`,
        wr.question_text,
      ]) ?? []
    );

    // Group written grades by application
    const writtenByApp = new Map<string, typeof writtenGrades>();
    for (const g of writtenGrades ?? []) {
      const list = writtenByApp.get(g.application_id) ?? [];
      list.push(g);
      writtenByApp.set(g.application_id, list);
    }

    const writtenAssignments: UserWrittenAssignment[] = writtenAppIds.map(
      (appId) => {
        const app = writtenAppMap.get(appId);
        const grades = writtenByApp.get(appId) ?? [];
        return {
          applicationId: appId,
          anonymousId: app?.anonymous_id ?? "Unknown",
          firstName: app?.first_name ?? "",
          lastName: app?.last_name ?? "",
          grades: grades.map((g) => ({
            questionNumber: g.question_number,
            questionText:
              questionTextMap.get(`${appId}-${g.question_number}`) ??
              `Question ${g.question_number}`,
            score: g.score,
          })),
        };
      }
    );

    // 3. Fetch interview assignments for this grader
    const { data: assignments } = await supabaseAdmin
      .from("interview_assignments")
      .select("id, application_id, section")
      .eq("grader_id", userId)
      .order("section", { ascending: true });

    const interviewAppIds = [
      ...new Set(assignments?.map((a) => a.application_id) ?? []),
    ];

    // Fetch application info for interview assignments
    const { data: interviewApps } =
      interviewAppIds.length > 0
        ? await supabaseAdmin
            .from("applications")
            .select("id, anonymous_id, first_name, last_name")
            .in("id", interviewAppIds)
        : { data: [] };

    const interviewAppMap = new Map(
      interviewApps?.map((a) => [a.id, a]) ?? []
    );

    // Fetch interview grades
    const assignmentIds = assignments?.map((a) => a.id) ?? [];
    const { data: interviewGrades } =
      assignmentIds.length > 0
        ? await supabaseAdmin
            .from("interview_grades")
            .select("assignment_id, score")
            .in("assignment_id", assignmentIds)
        : { data: [] };

    const gradeByAssignment = new Map(
      interviewGrades?.map((g) => [g.assignment_id, g.score]) ?? []
    );

    // Fetch interview notes
    const { data: interviewNotes } =
      assignmentIds.length > 0
        ? await supabaseAdmin
            .from("interview_notes")
            .select("assignment_id, question_number, notes")
            .in("assignment_id", assignmentIds)
            .order("question_number", { ascending: true })
        : { data: [] };

    // Fetch interview rubrics for question text
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

    const interviewAssignments: UserInterviewAssignment[] = (
      assignments ?? []
    ).map((a) => {
      const app = interviewAppMap.get(a.application_id);
      const notes = (interviewNotes ?? [])
        .filter((n) => n.assignment_id === a.id)
        .map((n) => ({
          questionNumber: n.question_number,
          questionText:
            rubricMap.get(`${a.section}-${n.question_number}`) ??
            `Question ${n.question_number}`,
          notes: n.notes ?? "",
        }));

      return {
        applicationId: a.application_id,
        anonymousId: app?.anonymous_id ?? "Unknown",
        firstName: app?.first_name ?? "",
        lastName: app?.last_name ?? "",
        section: a.section,
        score: gradeByAssignment.get(a.id) ?? null,
        notes,
      };
    });

    return {
      success: true,
      detail: {
        user: user as UserRow,
        writtenAssignments,
        interviewAssignments,
      },
    };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function deleteUser(
  userId: string
): Promise<ActionResult> {
  try {
    await requireAdmin();

    // Delete from auth (cascades to public.users via FK)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}
