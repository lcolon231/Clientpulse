import { createBrowserClient } from "@supabase/ssr";

/**
 * Returns a Supabase client safe for use in Client Components and browser code.
 *
 * @supabase/ssr's createBrowserClient is singleton-safe internally — calling
 * this function multiple times returns the same underlying instance, so there
 * is no risk of spawning duplicate GoTrue auth listeners per component mount.
 *
 * Why process.env directly instead of lib/env.ts:
 * lib/env.ts imports `server-only`, which causes a build error if any client
 * bundle (transitively) imports it. NEXT_PUBLIC_ vars are inlined by Next.js
 * at build time and are safe to reference directly in client-facing code.
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
