import Link from "next/link";

import { ForgotPasswordForm } from "@/components/app/ForgotPasswordForm";

export const metadata = {
  title: "Reset password — ClientPulse",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1.5 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Forgot your password?
          </h1>
          <p className="text-muted-foreground text-sm">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <div className="rounded-xl border bg-background p-6 shadow-sm">
          <ForgotPasswordForm />
        </div>

        <p className="text-muted-foreground text-center text-sm">
          Remember it?{" "}
          <Link
            href="/login"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
