import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Supabase auth email callback handler.
 *
 * Handles two different URL shapes that Supabase can produce depending on
 * which auth flow is active in your project settings:
 *
 * 1. PKCE flow (default with @supabase/ssr):
 *      ?code=<authorization_code>&next=<destination>
 *    Exchange: supabase.auth.exchangeCodeForSession(code)
 *
 * 2. Token hash flow (legacy / OTP-based):
 *      ?token_hash=<hash>&type=<recovery|invite>&next=<destination>
 *    Exchange: supabase.auth.verifyOtp({ token_hash, type })
 *
 * @supabase/ssr defaults to PKCE, so password-reset and invite emails will
 * carry `code=` rather than `token_hash=`. We support both so the handler
 * works regardless of project auth settings.
 *
 * Why a Route Handler and not a Server Action?
 *   Supabase emails link directly to a URL via GET. Server Actions require a
 *   POST from a form — they can't be the target of an email link.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  // Must have either a PKCE code or a token_hash+type pair.
  if (!code && (!token_hash || !type)) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_link", request.url),
    );
  }

  // Sanitise the redirect target — only allow relative paths to prevent
  // open-redirect attacks (e.g. ?next=https://evil.com).
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : null;

  // Derive the fallback destination from context clues when `next` is absent.
  const redirectTo =
    safeNext ??
    (type === "invite" || (code && !type) ? "/accept-invite" : "/dashboard");

  const supabase = await createServerSupabaseClient();
  let exchangeError: string | null = null;

  if (code) {
    // PKCE flow — exchange the short-lived authorization code for a session.
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) exchangeError = error.message;
  } else if (token_hash && type) {
    // Token hash flow (legacy).
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (error) exchangeError = error.message;
  }

  if (exchangeError) {
    const errorSlug = exchangeError.toLowerCase().includes("expired")
      ? "link_expired"
      : "invalid_link";
    return NextResponse.redirect(
      new URL(`/login?error=${errorSlug}`, request.url),
    );
  }

  // Session cookie is now set (exchangeCodeForSession / verifyOtp writes it
  // via the createServerSupabaseClient cookie hooks). The redirect carries it.
  return NextResponse.redirect(new URL(redirectTo, request.url));
}
