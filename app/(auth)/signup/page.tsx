import Link from "next/link";

import { SignupForm } from "@/components/app/SignupForm";

export const metadata = {
  title: "Create account — ClientPulse",
};

export default function SignupPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1.5 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Create your account
          </h1>
          <p className="text-muted-foreground text-sm">
            Set up your MSP workspace in seconds
          </p>
        </div>

        <div className="rounded-xl border bg-background p-6 shadow-sm">
          <SignupForm />
        </div>

        <p className="text-muted-foreground text-center text-sm">
          Already have an account?{" "}
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
