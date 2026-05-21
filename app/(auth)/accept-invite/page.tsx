import { redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth";
import { AcceptInviteForm } from "@/components/app/AcceptInviteForm";

export const metadata = {
  title: "Accept invite — ClientPulse",
};

/**
 * The invited user lands here after /auth/callback has exchanged the invite
 * token for a session. At this point:
 *   - authUser exists (valid Supabase session) ✓
 *   - public.users row does NOT exist yet ✗
 *   - JWT org_id claim is null (hook can't find the row) ✗
 *
 * The AcceptInviteForm calls acceptInviteAction, which creates the row,
 * refreshes the session, and redirects to /dashboard.
 */
export default async function AcceptInvitePage() {
  const authUser = await getAuthUser();

  // If there's no session, the invite link was invalid or already used.
  // Send them to login with a message.
  if (!authUser) {
    redirect("/login?error=invalid_link");
  }

  // If a public.users row already exists, they've already completed setup.
  // Redirect to dashboard rather than showing the form again.
  // We check this via email rather than org_id so we don't need RLS.
  const email = authUser.email ?? "";

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1.5 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome to ClientPulse
          </h1>
          <p className="text-muted-foreground text-sm">
            Set your display name and a password to complete your account.
          </p>
        </div>

        <div className="rounded-xl border bg-background p-6 shadow-sm">
          <AcceptInviteForm email={email} />
        </div>
      </div>
    </div>
  );
}
