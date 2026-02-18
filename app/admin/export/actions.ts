"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/auth";
import type {
  ActionResult,
  ExportApplicantRow,
  SemesterBackup,
} from "@/lib/types";

const SEMESTER = process.env.NEXT_PUBLIC_CURRENT_SEMESTER!;

// ============================================
// Build export rows with per-question averages
// ============================================

async function buildExportRows(
  statusFilter?: string[]
): Promise<ExportApplicantRow[]> {
  // 1. Fetch applications
  let query = supabaseAdmin
    .from("applications")
    .select("*")
    .eq("semester", SEMESTER)
    .order("anonymous_id", { ascending: true });

  if (statusFilter && statusFilter.length > 0) {
    query = query.in("status", statusFilter);
  }

  const { data: apps, error: appsError } = await query;
  if (appsError || !apps || apps.length === 0) return [];

  const appIds = apps.map((a) => a.id);

  // 2. Fetch all written grades
  const { data: allWrittenGrades } = await supabaseAdmin
    .from("written_grades")
    .select("application_id, question_number, score")
    .in("application_id", appIds)
    .not("score", "is", null);

  // 3. Fetch interview assignments + grades
  const { data: allAssignments } = await supabaseAdmin
    .from("interview_assignments")
    .select("id, application_id, section")
    .in("application_id", appIds);

  const assignmentIds = allAssignments?.map((a) => a.id) ?? [];

  const { data: allInterviewGrades } =
    assignmentIds.length > 0
      ? await supabaseAdmin
          .from("interview_grades")
          .select("assignment_id, sub_section, score")
          .in("assignment_id", assignmentIds)
          .not("score", "is", null)
      : { data: [] };

  // Map assignment_id → { application_id, section }
  const assignmentMap = new Map(
    allAssignments?.map((a) => [a.id, { appId: a.application_id, section: a.section }]) ?? []
  );

  // 4. Fetch deliberation decisions
  const { data: decisions } = await supabaseAdmin
    .from("deliberation_decisions")
    .select("application_id, decision")
    .in("application_id", appIds);

  const decisionMap = new Map(
    decisions?.map((d) => [d.application_id, d.decision as "accept" | "reject"]) ?? []
  );

  // 5. Build rows
  return apps.map((app) => {
    // Written per-question averages
    const writtenQAvgs: (number | null)[] = [];
    const allWrittenScores: number[] = [];

    for (let q = 1; q <= 5; q++) {
      const scores = (allWrittenGrades ?? [])
        .filter((g) => g.application_id === app.id && g.question_number === q)
        .map((g) => g.score as number);

      if (scores.length > 0) {
        const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
        writtenQAvgs.push(Math.round(avg * 100) / 100);
        allWrittenScores.push(...scores);
      } else {
        writtenQAvgs.push(null);
      }
    }

    const writtenAvg =
      allWrittenScores.length > 0
        ? Math.round(
            (allWrittenScores.reduce((s, v) => s + v, 0) / allWrittenScores.length) * 100
          ) / 100
        : null;

    // Interview per round+sub-section averages (4 columns)
    // Key: "round-subSection" e.g. "1-1", "1-2", "2-1", "2-2"
    const subSectionScores = new Map<string, number[]>();
    for (const ig of allInterviewGrades ?? []) {
      const info = assignmentMap.get(ig.assignment_id);
      if (!info || info.appId !== app.id) continue;
      const key = `${info.section}-${ig.sub_section}`;
      const list = subSectionScores.get(key) ?? [];
      list.push(ig.score as number);
      subSectionScores.set(key, list);
    }

    const avgOf = (scores: number[]): number | null =>
      scores.length > 0
        ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 100) / 100
        : null;

    const r1s1 = subSectionScores.get("1-1") ?? [];
    const r1s2 = subSectionScores.get("1-2") ?? [];
    const r2s1 = subSectionScores.get("2-1") ?? [];
    const r2s2 = subSectionScores.get("2-2") ?? [];

    const allIntScores = [...r1s1, ...r1s2, ...r2s1, ...r2s2];

    return {
      anonymousId: app.anonymous_id,
      firstName: app.first_name,
      lastName: app.last_name,
      pronouns: app.pronouns ?? "",
      email: app.email,
      phoneNumber: app.phone_number,
      major: app.major,
      graduationYear: app.graduation_year,
      gender: app.gender,
      spanishFluent: app.spanish_fluent,
      canAttendCamp: app.can_attend_camp,
      writtenQ1Avg: writtenQAvgs[0],
      writtenQ2Avg: writtenQAvgs[1],
      writtenQ3Avg: writtenQAvgs[2],
      writtenQ4Avg: writtenQAvgs[3],
      writtenQ5Avg: writtenQAvgs[4],
      writtenAvg,
      interviewR1Sub1Avg: avgOf(r1s1),
      interviewR1Sub2Avg: avgOf(r1s2),
      interviewR2Sub1Avg: avgOf(r2s1),
      interviewR2Sub2Avg: avgOf(r2s2),
      interviewAvg: avgOf(allIntScores),
      totalScore: app.total_score,
      status: app.status,
      decision: decisionMap.get(app.id) ?? null,
    };
  });
}

// ============================================
// Convert rows to CSV string
// ============================================

function rowsToCSV(rows: ExportApplicantRow[]): string {
  const headers = [
    "Anonymous ID",
    "First Name",
    "Last Name",
    "Email",
    "Phone",
    "Major",
    "Graduation Year",
    "Gender",
    "Spanish Fluent",
    "Can Attend Camp",
    "Written Q1 Avg",
    "Written Q2 Avg",
    "Written Q3 Avg",
    "Written Q4 Avg",
    "Written Q5 Avg",
    "Written Avg",
    "Interview R1 Sub1 Avg",
    "Interview R1 Sub2 Avg",
    "Interview R2 Sub1 Avg",
    "Interview R2 Sub2 Avg",
    "Interview Avg",
    "Total Score",
    "Status",
    "Decision",
  ];

  const escapeCSV = (val: string): string => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const lines = [headers.join(",")];

  for (const row of rows) {
    const values = [
      row.anonymousId,
      row.firstName,
      row.lastName,
      row.email,
      row.phoneNumber,
      row.major,
      String(row.graduationYear),
      row.gender,
      row.spanishFluent ? "Yes" : "No",
      row.canAttendCamp ? "Yes" : "No",
      row.writtenQ1Avg?.toFixed(2) ?? "",
      row.writtenQ2Avg?.toFixed(2) ?? "",
      row.writtenQ3Avg?.toFixed(2) ?? "",
      row.writtenQ4Avg?.toFixed(2) ?? "",
      row.writtenQ5Avg?.toFixed(2) ?? "",
      row.writtenAvg?.toFixed(2) ?? "",
      row.interviewR1Sub1Avg?.toFixed(2) ?? "",
      row.interviewR1Sub2Avg?.toFixed(2) ?? "",
      row.interviewR2Sub1Avg?.toFixed(2) ?? "",
      row.interviewR2Sub2Avg?.toFixed(2) ?? "",
      row.interviewAvg?.toFixed(2) ?? "",
      row.totalScore?.toFixed(2) ?? "",
      row.status,
      row.decision ?? "",
    ];

    lines.push(values.map(escapeCSV).join(","));
  }

  return lines.join("\n");
}

// ============================================
// Export all applicants as CSV
// ============================================

export async function exportAllCSV(): Promise<ActionResult<{ csv: string; count: number }>> {
  try {
    await requireAdmin();
    const rows = await buildExportRows();

    if (rows.length === 0) {
      return { success: false, error: "No applications found for this semester." };
    }

    return { success: true, csv: rowsToCSV(rows), count: rows.length };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}

// ============================================
// Export accepted applicants as CSV
// ============================================

export async function exportAcceptedCSV(): Promise<ActionResult<{ csv: string; count: number }>> {
  try {
    await requireAdmin();
    const rows = await buildExportRows(["accepted"]);

    if (rows.length === 0) {
      return { success: false, error: "No accepted applicants found." };
    }

    return { success: true, csv: rowsToCSV(rows), count: rows.length };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}

// ============================================
// Export full semester backup as JSON
// ============================================

export async function exportBackupJSON(): Promise<ActionResult<{ json: string }>> {
  try {
    await requireAdmin();

    // Fetch all applications for the semester
    const { data: applications } = await supabaseAdmin
      .from("applications")
      .select("*")
      .eq("semester", SEMESTER)
      .order("anonymous_id", { ascending: true });

    if (!applications || applications.length === 0) {
      return { success: false, error: "No applications found for this semester." };
    }

    const appIds = applications.map((a) => a.id);

    // Fetch all related data in parallel
    const [
      { data: writtenResponses },
      { data: writtenGrades },
      { data: interviewAssignments },
      { data: deliberationDecisions },
    ] = await Promise.all([
      supabaseAdmin
        .from("written_responses")
        .select("*")
        .in("application_id", appIds),
      supabaseAdmin
        .from("written_grades")
        .select("*")
        .in("application_id", appIds),
      supabaseAdmin
        .from("interview_assignments")
        .select("*")
        .in("application_id", appIds),
      supabaseAdmin
        .from("deliberation_decisions")
        .select("*")
        .in("application_id", appIds),
    ]);

    // Fetch interview grades and notes via assignment IDs
    const assignmentIds = interviewAssignments?.map((a) => a.id) ?? [];

    const [{ data: interviewGrades }, { data: interviewNotes }] =
      assignmentIds.length > 0
        ? await Promise.all([
            supabaseAdmin
              .from("interview_grades")
              .select("*")
              .in("assignment_id", assignmentIds),
            supabaseAdmin
              .from("interview_notes")
              .select("*")
              .in("assignment_id", assignmentIds),
          ])
        : [{ data: [] }, { data: [] }];

    const backup: SemesterBackup = {
      exportedAt: new Date().toISOString(),
      semester: SEMESTER,
      applications: applications ?? [],
      writtenResponses: writtenResponses ?? [],
      writtenGrades: writtenGrades ?? [],
      interviewAssignments: interviewAssignments ?? [],
      interviewGrades: interviewGrades ?? [],
      interviewNotes: interviewNotes ?? [],
      deliberationDecisions: deliberationDecisions ?? [],
    };

    return { success: true, json: JSON.stringify(backup, null, 2) };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}
