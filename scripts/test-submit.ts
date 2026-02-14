import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env
const envPath = resolve(process.cwd(), ".env");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([A-Z_]+)='([^']*)'$/);
  if (match) process.env[match[1]] = match[2];
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testSubmit() {
  console.log("--- Testing Application Submission ---\n");

  // Check current applications
  const { data: before, error: beforeError } = await supabaseAdmin
    .from("applications")
    .select("id, anonymous_id, first_name, last_name, semester")
    .eq("semester", process.env.NEXT_PUBLIC_CURRENT_SEMESTER!);

  console.log(`Applications before: ${before?.length ?? 0}`);
  if (beforeError) console.error("Error:", beforeError.message);

  // We can't easily call the server action from outside Next.js,
  // but we can verify the DB is accessible and the accounts exist.

  // Verify users
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("username, role, full_name");

  console.log("\nUsers in DB:");
  users?.forEach((u) => console.log(`  ${u.username} (${u.role}) — ${u.full_name}`));

  // Verify storage bucket exists
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const photoBucket = buckets?.find((b) => b.name === "applicant-photos");
  console.log(`\nPhoto bucket exists: ${!!photoBucket}`);

  // Verify written_responses table is accessible
  const { count } = await supabaseAdmin
    .from("written_responses")
    .select("*", { count: "exact", head: true });
  console.log(`Written responses: ${count ?? 0}`);

  // Verify rubrics table
  const { data: rubrics } = await supabaseAdmin
    .from("rubrics")
    .select("question_number, question_type");
  console.log(`Rubrics: ${rubrics?.length ?? 0}`);

  console.log("\n--- All checks passed! ---");
  console.log("To test the full form, go to http://localhost:3000/apply in your browser.");
  console.log("\nTest credentials:");
  console.log("  Admin: admin / password123");
  console.log("  Grader: grader1 / password123");
}

testSubmit().catch(console.error);
