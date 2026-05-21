import "server-only";

import { redirect } from "next/navigation";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Organization, User } from "@prisma/client";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Our DB User row joined with its Organization — the shape most of the app needs. */
export type DbUserWithOrg = User & { organization: Organization };

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/**
 * Returns the verified Supabase Auth user for the current request, or null.
 *
 * Uses `auth.getUser()` (not `auth.getSession()`). The distinction matters:
 *   - getSession() decodes the JWT from the cookie without re-validating it
 *     against Supabase's servers. It's fast, but the user object is unverified —
 *     a deleted or suspended user could still pass.
 *   - getUser() makes a lightweight call to Supabase Auth to confirm the token
 *     is still valid. Use this whenever you're making an auth decision.
 */
export async function getAuthUser(): Promise<SupabaseUser | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * Fetches the DB User + Organization for the given Supabase Auth UUID.
 * Returns null if no matching row exists (e.g. a signup that partially failed).
 */
export async function getDbUser(
  supabaseUserId: string,
): Promise<DbUserWithOrg | null> {
  return prisma.user.findUnique({
    where: { supabaseUserId },
    include: { organization: true },
  });
}

// ---------------------------------------------------------------------------
// Guard
// ---------------------------------------------------------------------------

/**
 * Server-side auth guard for Server Components, Server Actions, and Route Handlers.
 *
 * Flow:
 *   1. Verify the Supabase Auth session is valid (getUser — server-validated).
 *   2. Look up the DB User + Organization.
 *   3. If either is missing, sign out (to clear a stale cookie) and redirect.
 *
 * After this function returns you are guaranteed both authUser and dbUser are
 * present. TypeScript knows this because both redirect() calls return `never`.
 *
 * Usage in a Server Component:
 *   const { authUser, dbUser } = await requireAuth();
 *
 * Note: middleware already redirects unauthenticated page requests to
 * /login?next=..., so requireAuth() hitting the redirect branch in a Server
 * Component is an edge case (e.g. a race between cookie expiry and request).
 * It's a correct and safe fallback regardless.
 */
export async function requireAuth(): Promise<{
  authUser: SupabaseUser;
  dbUser: DbUserWithOrg;
}> {
  const authUser = await getAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  const dbUser = await getDbUser(authUser.id);

  if (!dbUser) {
    // Auth record exists but DB record is missing — a partially-failed signup.
    // Sign out so the user starts fresh rather than seeing a broken state.
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return { authUser, dbUser };
}

// ---------------------------------------------------------------------------
// Role guard
// ---------------------------------------------------------------------------

/**
 * Like requireAuth(), but also enforces that the current user is an OWNER.
 *
 * Usage in Server Actions:
 *   const { dbUser } = await requireOwner();
 *
 * Throws a 403 Response if the user is authenticated but not an owner.
 * This is the server-side gate that protects privileged actions (e.g. invite).
 * It is distinct from the UI-level visibility check (hiding the button in JSX)
 * because UI checks can be bypassed by crafting a direct fetch to the action URL.
 *
 * Why Response instead of redirect? A 403 is semantically correct for a
 * permission failure. redirect() is for authentication failures (no session).
 * Server Actions surfacing a 403 Response will be caught by error boundaries
 * or returned to the client as an error state.
 */
export async function requireOwner(): Promise<{
  authUser: SupabaseUser;
  dbUser: DbUserWithOrg;
}> {
  const result = await requireAuth();

  if (result.dbUser.role !== "OWNER") {
    throw new Response("Forbidden", { status: 403 });
  }

  return result;
}
