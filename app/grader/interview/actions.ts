"use server";

import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAuth } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

// ============================================
// Types
// ============================================

export interface InterviewAssignmentCard {
  assignmentId: string;
  applicationId: string;
  anonymousId: string;
  section: 1 | 2;
  hasScore: boolean;
  notesCount: number;
  totalQuestions: number;
}

export interface InterviewGradingQuestion {
  questionNumber: number;
  questionText: string;
  rubricContent: string | null;
  noteId: string | null;
  notes: string | null;
}

export interface InterviewGradingPageData {
  assignment: {
    id: string;
    applicationId: string;
    anonymousId: string;
    section: 1 | 2;
  };
  questions: InterviewGradingQuestion[];
  score: number | null;
  gradeId: string | null;
}

// ============================================
// Get assigned interviews for current grader
// ============================================

export async function getInterviewAssignments(): Promise<
  InterviewAssignmentCard[]
> {
  const user = await requireAuth();
  const supabase = await createClient();

  // Get all interview_assignments for this grader
  const { data: assignments, error: assignError } = await supabase
    .from("interview_assignments")
    .select("id, application_id, section")
    .eq("grader_id", user.id)
    .order("created_at", { ascending: true });

  if (assignError) throw new Error(assignError.message);
  if (!assignments || assignments.length === 0) return [];

  // Get application anonymous IDs
  const appIds = [...new Set(assignments.map((a) => a.application_id))];
  const { data: apps, error: appsError } = await supabase
    .from("applications")
    .select("id, anonymous_id")
    .in("id", appIds);

  if (appsError) throw new Error(appsError.message);

  const appMap = new Map(apps?.map((a) => [a.id, a.anonymous_id]) ?? []);

  // Get all grades for these assignments (score per assignment)
  const assignmentIds = assignments.map((a) => a.id);
  const { data: grades } = await supabase
    .from("interview_grades")
    .select("assignment_id, score")
    .in("assignment_id", assignmentIds);

  const gradeMap = new Map(
    grades?.map((g) => [g.assignment_id, g.score]) ?? []
  );

  // Get all notes for these assignments
  const { data: notes } = await supabase
    .from("interview_notes")
    .select("assignment_id, notes")
    .in("assignment_id", assignmentIds);

  // Count notes with content >= 50 chars per assignment
  const notesCountMap = new Map<string, number>();
  if (notes) {
    for (const n of notes) {
      if (n.notes && n.notes.trim().length >= 50) {
        notesCountMap.set(
          n.assignment_id,
          (notesCountMap.get(n.assignment_id) ?? 0) + 1
        );
      }
    }
  }

  // Get total questions per section from rubrics
  const sections = [...new Set(assignments.map((a) => a.section))];
  const sectionQuestionCounts = new Map<number, number>();
  for (const section of sections) {
    const { count } = await supabase
      .from("rubrics")
      .select("*", { count: "exact", head: true })
      .eq("question_type", "interview")
      .eq("section", section);
    sectionQuestionCounts.set(section, count ?? 0);
  }

  return assignments.map((a) => ({
    assignmentId: a.id,
    applicationId: a.application_id,
    anonymousId: appMap.get(a.application_id) ?? "Unknown",
    section: a.section as 1 | 2,
    hasScore: gradeMap.get(a.id) != null,
    notesCount: notesCountMap.get(a.id) ?? 0,
    totalQuestions: sectionQuestionCounts.get(a.section) ?? 0,
  }));
}

// ============================================
// Get full grading data for a single assignment
// ============================================

export async function getInterviewGradingData(
  assignmentId: string
): Promise<ActionResult<{ data: InterviewGradingPageData }>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    // Verify this assignment belongs to this grader
    const { data: assignment, error: assignError } = await supabase
      .from("interview_assignments")
      .select("id, application_id, grader_id, section")
      .eq("id", assignmentId)
      .single();

    if (assignError || !assignment) {
      return { success: false, error: "Assignment not found" };
    }

    if (assignment.grader_id !== user.id) {
      return {
        success: false,
        error: "Not authorized to view this assignment",
      };
    }

    // Fetch application info
    const { data: app, error: appError } = await supabase
      .from("applications")
      .select("id, anonymous_id")
      .eq("id", assignment.application_id)
      .single();

    if (appError || !app) {
      return { success: false, error: "Application not found" };
    }

    // Fetch interview questions for this section
    const { data: rubrics, error: rubricError } = await supabaseAdmin
      .from("rubrics")
      .select("question_number, question_text, rubric_content")
      .eq("question_type", "interview")
      .eq("section", assignment.section)
      .order("question_number", { ascending: true });

    if (rubricError) return { success: false, error: rubricError.message };
    if (!rubrics || rubrics.length === 0) {
      return {
        success: false,
        error: "No interview questions found for this section",
      };
    }

    // Fetch existing notes for this assignment
    const { data: existingNotes } = await supabase
      .from("interview_notes")
      .select("id, question_number, notes")
      .eq("assignment_id", assignmentId);

    const noteMap = new Map(
      existingNotes?.map((n) => [
        n.question_number,
        { id: n.id, notes: n.notes },
      ]) ?? []
    );

    // Fetch existing grade (score) for this assignment
    const { data: existingGrade } = await supabase
      .from("interview_grades")
      .select("id, score")
      .eq("assignment_id", assignmentId)
      .single();

    // Build questions array
    const questions: InterviewGradingQuestion[] = rubrics.map((rubric) => {
      const note = noteMap.get(rubric.question_number);
      return {
        questionNumber: rubric.question_number,
        questionText: rubric.question_text,
        rubricContent: rubric.rubric_content,
        noteId: note?.id ?? null,
        notes: note?.notes ?? null,
      };
    });

    return {
      success: true,
      data: {
        assignment: {
          id: assignment.id,
          applicationId: assignment.application_id,
          anonymousId: app.anonymous_id,
          section: assignment.section as 1 | 2,
        },
        questions,
        score: existingGrade?.score ?? null,
        gradeId: existingGrade?.id ?? null,
      },
    };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

// ============================================
// Save interview note for a question (draft)
// ============================================

export async function saveInterviewNote(
  assignmentId: string,
  questionNumber: number,
  notes: string | null
): Promise<ActionResult> {
  try {
    const user = await requireAuth();

    // Verify ownership
    const { data: assignment, error: fetchError } = await supabaseAdmin
      .from("interview_assignments")
      .select("grader_id")
      .eq("id", assignmentId)
      .single();

    if (fetchError || !assignment) {
      return { success: false, error: "Assignment not found" };
    }
    if (assignment.grader_id !== user.id) {
      return {
        success: false,
        error: "Not authorized to modify this assignment",
      };
    }

    // Upsert the note
    const { error } = await supabaseAdmin
      .from("interview_notes")
      .upsert(
        {
          assignment_id: assignmentId,
          question_number: questionNumber,
          notes,
        },
        { onConflict: "assignment_id,question_number" }
      );

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

// ============================================
// Save interview score for assignment (draft)
// ============================================

export async function saveInterviewScore(
  assignmentId: string,
  score: number
): Promise<ActionResult> {
  try {
    const user = await requireAuth();

    // Validate score
    if (score < 1 || score > 5 || !Number.isInteger(score)) {
      return {
        success: false,
        error: "Score must be an integer between 1 and 5",
      };
    }

    // Verify ownership
    const { data: assignment, error: fetchError } = await supabaseAdmin
      .from("interview_assignments")
      .select("grader_id")
      .eq("id", assignmentId)
      .single();

    if (fetchError || !assignment) {
      return { success: false, error: "Assignment not found" };
    }
    if (assignment.grader_id !== user.id) {
      return {
        success: false,
        error: "Not authorized to modify this assignment",
      };
    }

    // Upsert the grade
    const { error } = await supabaseAdmin
      .from("interview_grades")
      .upsert(
        {
          assignment_id: assignmentId,
          score,
        },
        { onConflict: "assignment_id" }
      );

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

// ============================================
// Submit all interview grades for an assignment
// ============================================

export async function submitAllInterviewGrades(
  assignmentId: string
): Promise<ActionResult> {
  try {
    const user = await requireAuth();

    // Verify ownership
    const { data: assignment, error: assignError } = await supabaseAdmin
      .from("interview_assignments")
      .select("grader_id, section")
      .eq("id", assignmentId)
      .single();

    if (assignError || !assignment) {
      return { success: false, error: "Assignment not found" };
    }
    if (assignment.grader_id !== user.id) {
      return { success: false, error: "Not authorized" };
    }

    // Check score exists
    const { data: grade } = await supabaseAdmin
      .from("interview_grades")
      .select("score")
      .eq("assignment_id", assignmentId)
      .single();

    if (!grade || grade.score === null) {
      return {
        success: false,
        error: "Please provide a section score before submitting.",
      };
    }

    // Get total questions for this section
    const { count: totalQuestions } = await supabaseAdmin
      .from("rubrics")
      .select("*", { count: "exact", head: true })
      .eq("question_type", "interview")
      .eq("section", assignment.section);

    // Fetch all notes for this assignment
    const { data: notes, error: notesError } = await supabaseAdmin
      .from("interview_notes")
      .select("question_number, notes")
      .eq("assignment_id", assignmentId);

    if (notesError) return { success: false, error: notesError.message };

    // Validate all questions have notes
    if (!notes || notes.length < (totalQuestions ?? 0)) {
      return {
        success: false,
        error: `Please add notes for all ${totalQuestions} questions before submitting.`,
      };
    }

    // Validate notes minimum length
    const shortNotes = notes.filter(
      (n) => !n.notes || n.notes.trim().length < 50
    );
    if (shortNotes.length > 0) {
      const qNums = shortNotes.map((n) => n.question_number).join(", ");
      return {
        success: false,
        error: `Notes must be at least 50 characters for question(s): ${qNums}`,
      };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}
