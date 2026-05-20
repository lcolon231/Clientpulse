"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { signUpAction } from "@/app/(auth)/signup/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const signUpSchema = z
  .object({
    orgName: z
      .string()
      .min(2, "Organization name must be at least 2 characters")
      .max(100, "Organization name must be under 100 characters"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignUpFields = z.infer<typeof signUpSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SignupForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFields>({
    resolver: zodResolver(signUpSchema),
  });

  async function onSubmit(values: SignUpFields) {
    setServerError(null);

    const result = await signUpAction({
      email: values.email,
      password: values.password,
      orgName: values.orgName,
    });

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    // Session cookie was set server-side during the action. refresh() causes
    // Next.js to re-fetch the server components with the new cookie so
    // getAuthUser() returns the newly signed-in user on /dashboard.
    router.refresh();
    router.replace("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="orgName">Organization name</Label>
        <Input
          id="orgName"
          type="text"
          autoComplete="organization"
          placeholder="NodeLink Technologies"
          aria-invalid={!!errors.orgName}
          {...register("orgName")}
        />
        {errors.orgName && (
          <p className="text-destructive text-sm">{errors.orgName.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-destructive text-sm">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-destructive text-sm">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          aria-invalid={!!errors.confirmPassword}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-destructive text-sm">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {serverError && (
        <p role="alert" className="text-destructive text-sm">
          {serverError}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
