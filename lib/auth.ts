import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import type { UserRow } from "@/lib/types";

/**
 * Get the current authenticated user with their profile from the users table.
 * Returns null if not authenticated or profile not found.
 */
export async function getUser(): Promise<UserRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return data as UserRow | null;
}

/**
 * Require the current user to be an admin.
 * Redirects to /login if not authenticated, or /grader if not admin.
 */
export async function requireAdmin(): Promise<UserRow> {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "admin") {
    redirect("/grader");
  }

  return user;
}

/**
 * Require the current user to be authenticated (any role).
 * Redirects to /login if not authenticated.
 */
export async function requireAuth(): Promise<UserRow> {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
