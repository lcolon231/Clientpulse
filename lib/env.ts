/**
 * Typed, Zod-validated environment variables.
 *
 * `import "server-only"` at the top means Next.js will throw a build error if
 * any 'use client' module (directly or transitively) imports this file.
 * That prevents service-role keys and DB URLs from ever reaching the browser.
 *
 * Usage:
 *   Server Components / Server Actions / Route Handlers → import { serverEnv } from "@/lib/env"
 *   Client Components → use process.env.NEXT_PUBLIC_* directly (values are
 *                        statically inlined by Next.js at build time)
 */
import "server-only";

import { z } from "zod";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /** Supabase Postgres — transaction-mode pooler. Used by Prisma at runtime. */
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  /** Supabase Postgres — direct connection. Used by Prisma for migrations only. */
  DIRECT_URL: z.string().url("DIRECT_URL must be a valid URL"),
  /** Supabase service-role key. Bypasses RLS — never expose to the browser. */
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
});

const clientSchema = z.object({
  /** Supabase project URL — safe for the browser. */
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  /** Supabase anon key — safe for the browser; RLS enforces isolation. */
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  /**
   * Full origin of the deployed app — used to construct absolute redirect URLs
   * in Supabase auth emails (password reset, invite).
   * Dev: http://localhost:3000   Prod: https://your-app.vercel.app
   */
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url("NEXT_PUBLIC_SITE_URL must be a valid URL"),
});

// ---------------------------------------------------------------------------
// Parse and export
// ---------------------------------------------------------------------------

function parseEnv<T extends z.ZodTypeAny>(
  schema: T,
  values: Record<string, string | undefined>,
  label: string
): z.infer<T> {
  const result = schema.safeParse(values);
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`[env] Missing or invalid ${label} variables:\n${formatted}`);
  }
  return result.data;
}

export const serverEnv = parseEnv(
  serverSchema,
  {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  "server"
);

export const clientEnv = parseEnv(
  clientSchema,
  {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  "client"
);
