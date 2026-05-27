"use server";

import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { rateLimitByIp } from "@/lib/ratelimit";

// ---------------------------------------------------------------------------
// Schema — server-side validation (never trust the client)
// ---------------------------------------------------------------------------

const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  orgName: z
    .string()
    .min(2, "Organization name must be at least 2 characters")
    .max(100, "Organization name must be under 100 characters")
    .trim(),
});

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export type SignUpResult =
  | { success: true }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

/**
 * Creates a Supabase Auth user and, in a single Prisma transaction, an
 * Organization and User row. If the DB transaction fails, the Auth user is
 * deleted so no orphaned auth.users record is left behind.
 *
 * Atomicity guarantee:
 *   - Organization + User are created inside prisma.$transaction — either both
 *     are committed or neither is (Postgres rolls back on any throw).
 *   - The Supabase Auth user is created BEFORE the transaction so we have its
 *     UUID to write into the users table. The Auth creation is NOT inside the
 *     Prisma transaction (it's an HTTP call to Supabase, not a DB operation).
 *     Cleanup on failure is handled explicitly in the catch block.
 *
 * Why admin.createUser instead of auth.signUp:
 *   - admin.createUser with email_confirm: true bypasses the confirmation email
 *     and makes the user immediately active. This is appropriate for a
 *     self-hosted MSP tool where account creation is an intentional admin act.
 *   - It also runs server-side, keeping the password off the browser network tab.
 *
 * After the transaction, we sign the new user in from the server so their
 * session cookie is set before the client redirects to /dashboard.
 */
export async function signUpAction(rawData: {
  email: string;
  password: string;
  orgName: string;
}): Promise<SignUpResult> {
  // 0. Rate limit by IP — 10 sign-up attempts per 10 seconds.
  const rl = await rateLimitByIp();
  if (!rl.success) {
    return { success: false, error: "Too many requests. Please try again later." };
  }

  // 1. Validate input server-side — the client schema is a UX aid, not a gate.
  const parsed = signUpSchema.safeParse(rawData);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join(". ");
    return { success: false, error: message };
  }
  const { email, password, orgName } = parsed.data;

  const admin = createAdminSupabaseClient();

  // 2. Create the Supabase Auth user. We do this first because we need the
  //    UUID to write into public.users.supabase_user_id.
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip confirmation email — user is active immediately
    });

  if (authError || !authData.user) {
    // Common causes: duplicate email, weak password rejected by Supabase policy.
    return {
      success: false,
      error: authError?.message ?? "Failed to create account. Please try again.",
    };
  }

  const authUserId = authData.user.id;

  // 3. Atomic DB transaction: Organisation + User, or neither.
  try {
    await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: orgName },
      });

      await tx.user.create({
        data: {
          supabaseUserId: authUserId,
          email,
          role: "OWNER",
          organizationId: organization.id,
        },
      });
    });
  } catch (txError) {
    // Transaction rolled back — clean up the Auth user so the email can be
    // reused and no ghost account exists in auth.users.
    await admin.auth.admin.deleteUser(authUserId).catch((cleanupErr) => {
      logger.error(
        { authUserId, cleanupErr },
        "[signUpAction] Auth user cleanup failed after TX rollback",
      );
    });

    logger.error({ txError }, "[signUpAction] DB transaction failed");
    return {
      success: false,
      error: "Account setup failed. Please try again.",
    };
  }

  // 4. Sign the new user in from the server so the session cookie is set
  //    before the client redirects. createServerSupabaseClient writes the
  //    cookie via its setAll callback, which next/headers propagates as
  //    Set-Cookie headers in the Server Action response.
  const supabase = await createServerSupabaseClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    // The account was created successfully but auto-sign-in failed.
    // This is an edge case (e.g. Supabase transient error). The user can
    // sign in manually at /login — their account and org row exist.
    logger.error({ signInError }, "[signUpAction] Auto sign-in failed after signup");
  }

  return { success: true };
}
