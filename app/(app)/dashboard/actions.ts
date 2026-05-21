"use server";

import { z } from "zod";

import { requireOwner } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { clientEnv } from "@/lib/env";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export type InviteResult =
  | { success: true }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

/**
 * Sends a Supabase invite email to a new technician.
 *
 * Security model:
 *   - requireOwner() verifies the caller is authenticated AND has role OWNER.
 *     This is the server-side gate — the UI hides the button for non-owners,
 *     but this action would throw 403 even if the button were unhidden by an
 *     attacker via DevTools.
 *
 * How the new user gets linked to the right org:
 *   - We pass { data: { org_id } } to inviteUserByEmail(). Supabase stores
 *     this in auth.users.raw_user_meta_data on the invited user's auth record.
 *   - When the invited user accepts (/auth/accept-invite), we read
 *     authUser.user_metadata.org_id and create their public.users row with
 *     that organization_id.
 *   - This is the only safe way to pass the org through the email link:
 *     we can't trust a ?org_id= query param in the email (anyone could forge it),
 *     but raw_user_meta_data is written server-side and only readable by an
 *     authenticated session for that specific user.
 *
 * The redirectTo URL tells Supabase where to send the user after they click
 * the invite link. Supabase appends ?token_hash=...&type=invite to it.
 * Our /auth/callback route handles the token exchange, then redirects to
 * /auth/accept-invite where they set their name and password.
 */
export async function inviteUserAction(rawData: {
  email: string;
}): Promise<InviteResult> {
  // 1. Auth + role check — throws 403 if not OWNER.
  const { dbUser } = await requireOwner();

  // 2. Validate input.
  const parsed = inviteSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: "Invalid email address." };
  }

  const { email } = parsed.data;
  const admin = createAdminSupabaseClient();

  const redirectTo = `${clientEnv.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/accept-invite`;

  // 3. Send the invite.
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      // Stored in raw_user_meta_data — read on /auth/accept-invite to link the
      // new user to this org. Using the string ID (not the Prisma cuid) because
      // Supabase metadata is JSON and we compare as strings throughout.
      org_id: dbUser.organizationId,
    },
  });

  if (error) {
    console.error("[inviteUserAction] inviteUserByEmail error", error);

    if (error.message.toLowerCase().includes("already")) {
      return {
        success: false,
        error: "That email address already has an account.",
      };
    }

    // Supabase free tier limits to ~3 auth emails per hour.
    // code: 'over_email_send_rate_limit', status: 429
    if (
      error.status === 429 ||
      error.message.toLowerCase().includes("rate limit")
    ) {
      return {
        success: false,
        error:
          "Email rate limit reached. Wait a few minutes and try again, or configure a custom SMTP provider in your Supabase project settings.",
      };
    }

    return {
      success: false,
      error: "Failed to send invite. Please try again.",
    };
  }

  // 4. Audit log — record who invited whom from which org.
  await logAudit({
    action: "invite_sent",
    entityType: "user",
    entityId: dbUser.organizationId, // best entity we have before the new user exists
    organizationId: dbUser.organizationId,
    userId: dbUser.id,
    metadata: { invited_email: email },
  });

  return { success: true };
}
