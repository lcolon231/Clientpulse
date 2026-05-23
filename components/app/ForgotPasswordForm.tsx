"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { getBaseUrl } from "@/lib/utils/get-base-url";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

type FormValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Why this calls the browser Supabase client directly (not a Server Action):
 *
 * Password reset uses Supabase's PKCE flow. PKCE works by having the initiating
 * client generate a random `code_verifier`, hash it into a `code_challenge`,
 * send the challenge to Supabase when requesting the email, then present the
 * original verifier when exchanging the code for a session.
 *
 * The `code_verifier` must be stored somewhere the SAME browser can retrieve it
 * later (when the user clicks the email link). The browser Supabase SDK stores
 * it in a cookie automatically. If we called resetPasswordForEmail from a Server
 * Action instead, the verifier would be written to next/headers cookies and might
 * not reliably persist to the browser's actual cookie store between the Server
 * Action POST and the later email-link GET — causing `exchangeCodeForSession` to
 * fail instantly with an invalid_link error.
 *
 * This is the same reason LoginForm calls signInWithPassword from the browser
 * client rather than a Server Action.
 */
export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    const supabase = createBrowserSupabaseClient();

    const redirectTo = `${getBaseUrl()}/auth/callback?next=/reset-password`;

    await supabase.auth.resetPasswordForEmail(values.email, { redirectTo });

    // Always show "sent" regardless of whether the email exists.
    // This is intentional: never tell the caller whether an email is registered.
    setSent(true);
  }

  if (sent) {
    return (
      <p className="text-center text-sm">
        If that email is registered you&apos;ll receive a reset link shortly.
        Check your inbox (and spam folder).
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-destructive text-xs">{errors.email.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
