import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Route classification
// ---------------------------------------------------------------------------

/**
 * Paths that don't require authentication (unauthenticated users may visit).
 */
const PUBLIC_PATHS = [
  "/",              // landing page — no auth required
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/accept-invite",
  "/auth/callback", // token exchange for reset + invite emails
  "/api/cron",      // cron endpoints authenticate via CRON_SECRET header, not session
];

/**
 * Subset of public paths where an already-authenticated user has no business.
 * Visiting /reset-password with a valid session is intentional (the PKCE reset
 * flow authenticates the user first, then lets them set a new password), so it
 * is deliberately excluded from this list.
 */
const REDIRECT_AUTHED_AWAY = [
  "/login",
  "/signup",
  "/forgot-password",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

function shouldRedirectAuthedUser(pathname: string): boolean {
  return REDIRECT_AUTHED_AWAY.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function proxy(request: NextRequest) {
  /**
   * Why we build the Supabase client here instead of importing createServerSupabaseClient:
   *
   * Middleware runs on the Edge Runtime. `lib/supabase/server.ts` imports
   * `server-only` and uses `cookies()` from `next/headers`, both of which are
   * Node.js-only APIs unavailable on the edge. Middleware must wire Supabase
   * directly to NextRequest.cookies (reads) and NextResponse.cookies (writes).
   *
   * The setAll implementation below is deliberately more involved than the
   * Server Component version: it must propagate updated cookies onto BOTH the
   * mutated request (so subsequent middleware/server code sees them) AND onto
   * supabaseResponse (so the browser receives the Set-Cookie headers).
   * Supabase refreshes expired access tokens during getUser() — setAll is
   * what moves those refreshed tokens from the Supabase client back into the
   * response headers.
   */
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Step 1: write onto the mutated request so server code in this
          // request cycle sees the refreshed token.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          // Step 2: rebuild supabaseResponse from the mutated request so the
          // updated cookies propagate as Set-Cookie headers to the browser.
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  /**
   * IMPORTANT: Do not add any logic between createServerClient and getUser().
   * The Supabase client may need to refresh an expired access token during
   * this call, and any early return before that refresh completes will leave
   * the browser with a stale cookie, causing a random-logout loop.
   */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // If the user is signed in and tries to visit a public auth page,
  // send them to the dashboard — no point showing a login form to someone
  // who is already authenticated.
  if (user && shouldRedirectAuthedUser(pathname)) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  // If the user is NOT signed in and is trying to reach a protected path,
  // redirect to /login with a `next` param so the login page can send them
  // back after a successful sign-in.
  if (!user && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    // Preserve the original path + query so we can redirect back after login.
    loginUrl.searchParams.set(
      "next",
      pathname + request.nextUrl.search,
    );
    return NextResponse.redirect(loginUrl);
  }

  /**
   * IMPORTANT: Return supabaseResponse, not NextResponse.next().
   *
   * supabaseResponse has the refreshed session cookies baked in (via setAll).
   * Returning a plain NextResponse.next() here would silently discard those
   * cookie updates, and the browser would keep the old (possibly expired)
   * token — causing intermittent auth failures that are very hard to debug.
   */
  return supabaseResponse;
}

// ---------------------------------------------------------------------------
// Matcher
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    /*
     * Only run on routes that need session-awareness:
     *   1. Protected app routes — /dashboard, /clients, /coming-soon (require auth)
     *   2. Auth routes — /login, /signup, etc. (redirect to dashboard if already authed)
     *   3. Auth callback — /auth/callback (token exchange)
     *
     * Intentionally NOT matched (so middleware never runs on them):
     *   - /                  marketing landing page — always public
     *   - /sitemap.xml       SEO — must be crawlable without auth
     *   - /robots.txt        SEO — must be crawlable without auth
     *   - /api/*             route handlers carry their own auth/verification
     *   - /_next/*           Next.js internals
     *   - /favicon.ico       static asset
     *   - any unknown path   falls through to Next.js router → renders not-found.tsx
     *
     * This approach (positive match of known routes) is safer than a negative
     * lookahead: new protected routes must be added here explicitly, which
     * makes the security boundary visible and auditable.
     */
    "/(dashboard|clients|coming-soon)(.*)",
    "/(login|signup|forgot-password|reset-password|accept-invite)(.*)",
    "/auth/callback(.*)",
  ],
};
