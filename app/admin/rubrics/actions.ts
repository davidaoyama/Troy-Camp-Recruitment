"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/auth";
import type { ActionResult, RubricRow } from "@/lib/types";

export async function getRubrics(): Promise<RubricRow[]> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("rubrics")
    .select("*")
    .order("question_type", { ascending: true })
    .order("section", { ascending: true, nullsFirst: true })
    .order("question_number", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as RubricRow[];
}

export async function saveRubric(input: {
  id?: string;
  questionNumber: number;
  questionType: "written" | "interview";
  questionText: string;
  rubricContent: string;
  section: number | null;
}): Promise<ActionResult<{ rubricId: string }>> {
  try {
    await requireAdmin();

    if (!input.questionText.trim()) {
      return { success: false, error: "Question text is required" };
    }
    if (input.questionNumber < 1) {
      return { success: false, error: "Question number must be at least 1" };
    }
    if (input.questionType === "interview" && input.section === null) {
      return { success: false, error: "Interview rubrics require a section (1 or 2)" };
    }

    const row = {
      question_number: input.questionNumber,
      question_type: input.questionType,
      question_text: input.questionText.trim(),
      rubric_content: input.rubricContent.trim() || null,
      section: input.questionType === "written" ? null : input.section,
    };

    if (input.id) {
      // Update
      const { error } = await supabaseAdmin
        .from("rubrics")
        .update(row)
        .eq("id", input.id);

      if (error) return { success: false, error: error.message };
      return { success: true, rubricId: input.id };
    } else {
      // Insert
      const { data, error } = await supabaseAdmin
        .from("rubrics")
        .insert(row)
        .select("id")
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, rubricId: data.id };
    }
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function deleteRubric(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    const { error } = await supabaseAdmin
      .from("rubrics")
      .delete()
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}
