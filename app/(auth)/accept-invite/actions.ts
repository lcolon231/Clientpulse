"use server";

import { z } from "zod";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/lib/audit";
import { getAuthUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z.object({
  name: z
    .string()
    .min(1, "Display name is required")
    .max(100, "Display name must be under 100 characters")
    .trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be under 72 characters"),
});

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export type AcceptInviteResult =
  | { success: true }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

/**
 * Completes the invite acceptance flow:
 *   1. Verify the caller is authenticated (the /auth/callback route already
 *      exchanged the invite token for a session before we get here).
 *   2. Read org_id from the user's Supabase metadata (set by the inviter).
 *   3. Create the public.users row via Prisma (bypasses RLS — the user's JWT
 *      has org_id = null at this point because the row doesn't exist yet).
 *   4. Set the user's display name in auth.users.raw_user_meta_data (via admin
 *      updateUserById) so Supabase Auth stays in sync with our DB.
 *   5. Set the user's password (via supabase.auth.updateUser).
 *   6. Refresh the session — this triggers custom_access_token_hook to re-read
 *      public.users, embedding org_id into the new JWT. After this call, the
 *      user's session has a valid org_id and RLS will work normally.
 *   7. Write an audit log row.
 *   8. Redirect to /dashboard.
 *
 * Why we use Prisma (not admin.from('users').insert):
 *   Prisma connects as the postgres superuser (via DIRECT_URL), which bypasses
 *   RLS. This is correct here because the user's JWT lacks org_id at step 3 —
 *   they are authenticated but their public.users row doesn't exist yet. If we
 *   used the authenticated Supabase client for the insert, RLS would deny it.
 *
 * Why refreshSession matters:
 *   The user's current JWT was minted before the public.users row existed.
 *   custom_access_token_hook therefore returned org_id = null. After creating
 *   the row we call refreshSession(), which forces Supabase to mint a new JWT
 *   by calling the hook again — this time finding the row and embedding org_id.
 *   Without this step the user would reach /dashboard with a null org_id claim
 *   and every RLS policy would silently deny all rows.
 */
export async function acceptInviteAction(rawData: {
  name: string;
  password: string;
}): Promise<AcceptInviteResult> {
  // 1. Confirm the caller has a valid session (set by /auth/callback).
  const authUser = await getAuthUser();

  if (!authUser) {
    return {
      success: false,
      error: "Your invite link has expired. Please ask for a new invite.",
    };
  }

  // 2. Read org_id from the metadata the inviter stored.
  const orgId = authUser.user_metadata?.org_id as string | undefined;

  if (!orgId) {
    logger.error({ userId: authUser.id }, "[acceptInviteAction] No org_id in user_metadata");
    return {
      success: false,
      error: "Invite is missing organization data. Please request a new invite.",
    };
  }

  // 3. Validate user input.
  const parsed = schema.safeParse(rawData);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input.";
    return { success: false, error: message };
  }

  const { name, password } = parsed.data;

  // 4. Create public.users row via Prisma (postgres superuser, bypasses RLS).
  //    This is atomic with a try/catch — if creation fails (e.g. a duplicate
  //    supabase_user_id from a double-submit), we return an error without
  //    leaving partial state.
  let dbUserId: string;

  try {
    const dbUser = await prisma.user.create({
      data: {
        supabaseUserId: authUser.id,
        email: authUser.email!,
        name,
        role: "TECHNICIAN", // invitees are always technicians
        organizationId: orgId,
      },
    });
    dbUserId = dbUser.id;
  } catch (err) {
    logger.error({ err }, "[acceptInviteAction] Failed to create user row");
    return {
      success: false,
      error: "Account setup failed. You may have already accepted this invite — try signing in.",
    };
  }

  // 5. Push the display name to auth.users.raw_user_meta_data so Supabase Auth
  //    stays in sync. We use the admin client because updateUserById can set
  //    metadata server-side without needing the user's own session to be
  //    fully established yet.
  const admin = createAdminSupabaseClient();

  await admin.auth.admin.updateUserById(authUser.id, {
    user_metadata: { ...authUser.user_metadata, full_name: name },
  });

  // 6. Set the user's password.
  const supabase = await createServerSupabaseClient();

  const { error: passwordError } = await supabase.auth.updateUser({ password });

  if (passwordError) {
    logger.error({ passwordError }, "[acceptInviteAction] updateUser (password) error");
    // The public.users row was created — the user can still sign in via a new
    // invite if they contact the owner. Log and surface a message.
    return {
      success: false,
      error: "Failed to set password. Please contact your administrator.",
    };
  }

  // 7. Refresh the session to get a new JWT that includes org_id.
  //    After this call, the user's cookie will contain a token that passes RLS.
  const { error: refreshError } = await supabase.auth.refreshSession();

  if (refreshError) {
    // Non-fatal: the user is still authenticated. They may see empty data until
    // their token naturally refreshes. Log but proceed.
    logger.error({ refreshError }, "[acceptInviteAction] refreshSession error");
  }

  // 8. Audit log — record the acceptance.
  await logAudit({
    action: "invite_accepted",
    entityType: "user",
    entityId: dbUserId,
    organizationId: orgId,
    userId: dbUserId,
  });

  redirect("/dashboard");
}
