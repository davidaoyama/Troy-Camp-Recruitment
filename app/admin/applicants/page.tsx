import { supabaseAdmin } from "@/lib/supabase-admin";
import type { ApplicationRow } from "@/lib/types";
import { ApplicantTable } from "./ApplicantTable";

const SEMESTER = process.env.NEXT_PUBLIC_CURRENT_SEMESTER!;

async function getApplicants(): Promise<ApplicationRow[]> {
  const { data, error } = await supabaseAdmin
    .from("applications")
    .select("*")
    .eq("semester", SEMESTER)
    .order("anonymous_id", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ApplicationRow[];
}

export default async function ApplicantsPage() {
  const applicants = await getApplicants();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        Applicants — {SEMESTER}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        {applicants.length} application{applicants.length !== 1 ? "s" : ""}{" "}
        submitted
      </p>

      <ApplicantTable applicants={applicants} />
    </div>
  );
}
