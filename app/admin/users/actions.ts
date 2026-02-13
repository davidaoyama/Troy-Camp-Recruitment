"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/auth";
import type { ActionResult, CreateUserInput, UserRow } from "@/lib/types";

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
