import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth";
import { ResetPasswordForm } from "@/components/app/ResetPasswordForm";

export const metadata = {
  title: "Set new password — ClientPulse",
};

interface ResetPasswordPageProps {
  searchParams: Promise<{ code?: string }>;
}

/**
 * Two ways a user can arrive here:
 *
 * 1. Normal PKCE flow — /auth/callback already exchanged the code and set a
 *    session cookie. We just check getAuthUser() and show the form.
 *
 * 2. Code lands here directly (e.g. Supabase dashboard Site URL is set
 *    instead of /auth/callback, or a bookmarked link). We relay the code to
 *    /auth/callback so the exchange happens in a Route Handler (the only place
 *    that can write a session cookie from a GET request).
 *
 * If neither a code nor a valid session is present the link is missing,
 * expired, or already used — show a clear error with a path back to
 * /forgot-password.
 */
export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { code } = await searchParams;

  // Relay code to the callback handler — it can write the session cookie.
  if (code) {
    redirect(`/auth/callback?code=${encodeURIComponent(code)}&next=/reset-password`);
  }

  const authUser = await getAuthUser();

  if (!authUser) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted/40 px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              Link expired
            </h1>
            <p className="text-muted-foreground text-sm">
              This password reset link has expired or has already been used.
              Reset links are single-use and valid for one hour.
            </p>
          </div>
          <Link
            href="/forgot-password"
            className="inline-block text-sm font-medium underline underline-offset-4"
          >
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1.5 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Set a new password
          </h1>
          <p className="text-muted-foreground text-sm">
            Choose a strong password for your account.
          </p>
        </div>

        <div className="rounded-xl border bg-background p-6 shadow-sm">
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
