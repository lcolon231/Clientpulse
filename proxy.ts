import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Route classification
// ---------------------------------------------------------------------------

/** Paths that are always public — no auth required. */
const PUBLIC_PATHS = ["/login", "/signup"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
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
          // Request cookies carry only name+value — security attributes
          // (httpOnly, secure, sameSite) belong on the response Set-Cookie
          // header, not the incoming request.
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
  if (user && isPublicPath(pathname)) {
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
     * Run on every path EXCEPT:
     *   - _next/static  — compiled JS/CSS bundles
     *   - _next/image   — Next.js image optimisation
     *   - favicon.ico   — browser icon request
     *   - common static extensions (svg, png, jpg, etc.)
     *
     * The negative lookahead keeps the middleware off of purely static assets
     * where session checking is both unnecessary and wasteful.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
