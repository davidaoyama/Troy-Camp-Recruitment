import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env manually
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

const GRADERS = [
  { username: "grader2", fullName: "Grader Two", tcName: "TC Grader2" },
  { username: "grader3", fullName: "Grader Three", tcName: "TC Grader3" },
  { username: "grader4", fullName: "Grader Four", tcName: "TC Grader4" },
  { username: "grader5", fullName: "Grader Five", tcName: "TC Grader5" },
  { username: "grader6", fullName: "Grader Six", tcName: "TC Grader6" },
];

async function seed() {
  for (const grader of GRADERS) {
    const email = `${grader.username}@internal.app`;

    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: "password123",
        email_confirm: true,
      });

    if (authError) {
      console.error(`Failed to create ${grader.username}:`, authError.message);
      continue;
    }

    const { error: profileError } = await supabaseAdmin.from("users").insert({
      id: authUser.user.id,
      username: grader.username,
      role: "grader",
      full_name: grader.fullName,
      tc_name: grader.tcName,
      email,
    });

    if (profileError) {
      console.error(`Profile insert failed for ${grader.username}:`, profileError.message);
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      continue;
    }

    console.log(`Created grader: ${grader.username} / password123`);
  }
}

seed().catch(console.error);
