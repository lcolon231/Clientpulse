import Link from "next/link";
import { GaugeIcon } from "lucide-react";

import { LoginForm } from "@/components/app/LoginForm";

interface LoginPageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

const errorMessages: Record<string, string> = {
  link_expired:
    "Your reset link has expired. Request a new one below.",
  invalid_link:
    "That link is invalid or has already been used. Request a new one below.",
};

export const metadata = {
  title: "Sign in — ClientPulse",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, error } = await searchParams;

  // Sanitise the redirect target: only allow relative paths so an attacker
  // can't craft /login?next=https://evil.com and phish credentials.
  const redirectTo =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  const errorMessage = error ? (errorMessages[error] ?? null) : null;

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
              Sign in to ClientPulse
            </h1>
            <p className="text-muted-foreground text-sm">
              Enter your email and password below
            </p>
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <LoginForm next={redirectTo} />
          </div>

          <p className="text-muted-foreground text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-foreground font-medium underline-offset-4 hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
