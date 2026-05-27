import Link from "next/link";
import { GaugeIcon } from "lucide-react";

import { SignupForm } from "@/components/app/SignupForm";

export const metadata = {
  title: "Create account — ClientPulse",
};

export default function SignupPage() {
  return (
    <div className="min-h-svh bg-gray-50 text-gray-900 antialiased">
      <header className="sticky top-0 z-40 bg-gray-950 text-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <GaugeIcon className="h-5 w-5 text-indigo-400" />
            <span className="font-semibold tracking-tight">ClientPulse</span>
          </Link>
        </div>
      </header>

      <div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Create your account
            </h1>
            <p className="text-muted-foreground text-sm">
              Set up your MSP workspace in seconds
            </p>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
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
    </div>
  );
}
