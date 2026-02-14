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

const USERS = [
  {
    username: "admin",
    password: "password123",
    fullName: "Admin User",
    tcName: "TC Admin",
    role: "admin" as const,
  },
  {
    username: "grader1",
    password: "password123",
    fullName: "Test Grader",
    tcName: "TC Grader",
    role: "grader" as const,
  },
];

async function seed() {
  for (const user of USERS) {
    const email = `${user.username}@internal.app`;

    // Create auth user
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: user.password,
        email_confirm: true,
      });

    if (authError) {
      console.error(`Failed to create ${user.username}:`, authError.message);
      continue;
    }

    // Create profile row
    const { error: profileError } = await supabaseAdmin.from("users").insert({
      id: authUser.user.id,
      username: user.username,
      role: user.role,
      full_name: user.fullName,
      tc_name: user.tcName,
      email,
    });

    if (profileError) {
      console.error(`Profile insert failed for ${user.username}:`, profileError.message);
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      continue;
    }

    console.log(`Created ${user.role}: ${user.username} / ${user.password}`);
  }
}

seed().catch(console.error);
