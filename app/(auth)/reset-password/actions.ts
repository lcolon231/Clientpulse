"use server";

import { z } from "zod";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be under 72 characters"),
});

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export type ResetPasswordResult =
  | { success: true }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

/**
 * Sets a new password for the currently authenticated user.
 *
 * By the time this action is called, the user has already been authenticated
 * by /auth/callback (which exchanged their token_hash for a session). So
 * supabase.auth.getUser() returns a valid user and updateUser() works.
 *
 * After a successful update we redirect to /dashboard. The user is already
 * signed in — no additional sign-in step needed.
 *
 * Edge cases handled by the callback route (before this action is ever called):
 *   - Expired token → redirected to /login?error=link_expired
 *   - Already-used token → redirected to /login?error=invalid_link
 *   - Missing token → redirected to /login?error=invalid_link
 */
export async function resetPasswordAction(rawData: {
  password: string;
}): Promise<ResetPasswordResult> {
  const parsed = schema.safeParse(rawData);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid password.";
    return { success: false, error: message };
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    console.error("[resetPasswordAction] updateUser error", error);
    return {
      success: false,
      error:
        "Failed to update password. Your reset link may have expired — request a new one.",
    };
  }

  // Password updated — redirect to dashboard. The session is still valid.
  redirect("/dashboard");
}
