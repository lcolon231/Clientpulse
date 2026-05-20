import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { clientEnv } from "@/lib/env";

/**
 * Returns a Supabase client for use in Server Components, Server Actions,
 * Route Handlers, and middleware.
 *
 * Must be called as `await createServerSupabaseClient()` because Next.js 15+
 * makes the cookies() API async — the cookie store isn't available
 * synchronously in the server runtime.
 *
 * The try/catch in setAll is intentional: when this client is used inside a
 * Server Component (not a Server Action or Route Handler), the response has
 * already started streaming and cookie mutation throws. We suppress that error
 * because the middleware is responsible for refreshing the session cookie on
 * every request — the Server Component read-path doesn't need to write.
 *
 * Do NOT import this file into any 'use client' module. The `server-only`
 * import at the top of this file causes Next.js to throw a build error if you
 * do, which is the intended safety net.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Suppress: called from a Server Component during streaming.
            // Middleware handles session refresh instead.
          }
        },
      },
    },
  );
}
