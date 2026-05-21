import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { ResetPasswordForm } from "@/components/app/ResetPasswordForm";

export const metadata = {
  title: "Set new password — ClientPulse",
};

/**
 * The user lands here after /auth/callback has exchanged their token_hash for
 * a valid session. If they navigate here without a session (e.g. by typing the
 * URL directly), we redirect them to request a fresh reset link.
 */
export default async function ResetPasswordPage() {
  const authUser = await getAuthUser();

  if (!authUser) {
    redirect("/forgot-password"); // /forgot-password is the URL (route group doesn't prefix)
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
