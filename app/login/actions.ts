"use server";

import { createClient } from "@/lib/supabase-server";
import type { ActionResult } from "@/lib/types";

export async function loginUser(
  username: string,
  password: string
): Promise<ActionResult<{ redirectTo: string }>> {
  try {
    if (!username.trim() || !password) {
      return { success: false, error: "Username and password are required" };
    }

    const supabase = await createClient();
    const email = `${username.trim().toLowerCase()}@internal.app`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: "Invalid username or password" };
    }

    // Fetch user role to determine redirect
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (!userData) {
      return { success: false, error: "User profile not found" };
    }

    const redirectTo = userData.role === "admin" ? "/admin" : "/grader";
    return { success: true, redirectTo };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function logoutUser(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
