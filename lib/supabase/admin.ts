import "server-only";

import { createClient } from "@supabase/supabase-js";

import { clientEnv, serverEnv } from "@/lib/env";

/**
 * Supabase admin client — uses the service-role key, which bypasses RLS.
 *
 * Use ONLY for privileged server-side operations:
 *   - Creating Auth users during sign-up (so we control the UUID before writing
 *     the DB row, and can set email_confirm without sending a confirmation email)
 *   - Deleting orphaned Auth users when a sign-up transaction rolls back
 *   - Future: admin user management, bulk operations
 *
 * Never expose this client to client components or return its output directly
 * to the browser. The `server-only` import at the top enforces this at build time.
 *
 * Singleton: one client per server process. The admin client has no session
 * state to manage — every call uses the service-role JWT directly, so sharing
 * the instance across requests is safe.
 */

let adminClient: ReturnType<typeof createClient> | undefined;

export function createAdminSupabaseClient() {
  if (adminClient) return adminClient;

  adminClient = createClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        // No token refresh or local session storage needed — the service-role
        // JWT is long-lived and doesn't expire like user access tokens.
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  return adminClient;
}
