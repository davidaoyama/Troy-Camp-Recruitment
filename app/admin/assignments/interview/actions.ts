"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/auth";
import type { ActionResult, UserRow } from "@/lib/types";

const SEMESTER = process.env.NEXT_PUBLIC_CURRENT_SEMESTER!;

export interface InterviewAssignmentView {
  applicationId: string;
  anonymousId: string;
  section1: { graderId: string; graderName: string }[];
  section2: { graderId: string; graderName: string }[];
}

export async function getInterviewAssignments(): Promise<InterviewAssignmentView[]> {
  await requireAdmin();

  const { data: apps } = await supabaseAdmin
    .from("applications")
    .select("id, anonymous_id")
    .eq("semester", SEMESTER)
    .order("anonymous_id", { ascending: true });

  if (!apps || apps.length === 0) return [];

  const { data: assignments } = await supabaseAdmin
    .from("interview_assignments")
    .select("application_id, grader_id, section, users(id, full_name)")
    .in(
      "application_id",
      apps.map((a) => a.id)
    );

  // Build map
  const appMap = new Map<
    string,
    {
      section1: { graderId: string; graderName: string }[];
      section2: { graderId: string; graderName: string }[];
    }
  >();

  for (const a of assignments ?? []) {
    const entry = appMap.get(a.application_id) ?? {
      section1: [],
      section2: [],
    };

    const user = a.users as unknown as { id: string; full_name: string } | null;
    const graderEntry = {
      graderId: a.grader_id,
      graderName: user?.full_name ?? "Unknown",
    };

    if (a.section === 1) {
      entry.section1.push(graderEntry);
    } else {
      entry.section2.push(graderEntry);
    }

    appMap.set(a.application_id, entry);
  }

  return apps.map((app) => ({
    applicationId: app.id,
    anonymousId: app.anonymous_id,
    section1: appMap.get(app.id)?.section1 ?? [],
    section2: appMap.get(app.id)?.section2 ?? [],
  }));
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

export async function saveInterviewAssignment(
  applicationId: string,
  section: 1 | 2,
  grader1Id: string,
  grader2Id: string
): Promise<ActionResult> {
  try {
    await requireAdmin();

    if (grader1Id === grader2Id) {
      return {
        success: false,
        error: "Must select two different graders",
      };
    }

    if (!grader1Id || !grader2Id) {
      return {
        success: false,
        error: "Both graders must be selected",
      };
    }

    // Delete existing assignments for this app + section
    await supabaseAdmin
      .from("interview_assignments")
      .delete()
      .eq("application_id", applicationId)
      .eq("section", section);

    // Insert new assignments
    const { error } = await supabaseAdmin
      .from("interview_assignments")
      .insert([
        { application_id: applicationId, grader_id: grader1Id, section },
        { application_id: applicationId, grader_id: grader2Id, section },
      ]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}
