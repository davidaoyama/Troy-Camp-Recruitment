import { supabaseAdmin } from "./supabase-admin";

/**
 * Generate the next anonymous ID for a given semester.
 * Format: "TC 001", "TC 002", etc.
 *
 * Uses supabaseAdmin (service role) to bypass RLS since this runs
 * during public form submission where there's no authenticated user.
 */
export async function generateAnonymousId(semester: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("applications")
    .select("anonymous_id")
    .eq("semester", semester)
    .order("anonymous_id", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Failed to query anonymous IDs: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return "TC 001";
  }

  // Extract number from "TC 042" → 42
  const lastId = data[0].anonymous_id;
  const lastNumber = parseInt(lastId.split(" ")[1], 10);

  if (isNaN(lastNumber)) {
    throw new Error(`Invalid anonymous_id format in DB: "${lastId}"`);
  }

  const nextNumber = lastNumber + 1;
  return `TC ${nextNumber.toString().padStart(3, "0")}`;
}
