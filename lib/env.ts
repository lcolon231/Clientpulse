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
  /** Resend API key for transactional email (reports + alerts). Optional at build time. */
  RESEND_API_KEY: z.string().min(1).optional(),
  /** Bearer token that Vercel attaches to cron requests. */
  CRON_SECRET: z.string().min(1, "CRON_SECRET is required"),
  // Stripe — optional so the build succeeds before keys are provisioned.
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_PRICE_STARTER: z.string().min(1).optional(),
  STRIPE_PRICE_GROWTH: z.string().min(1).optional(),
  STRIPE_PRICE_ENTERPRISE: z.string().min(1).optional(),
  // PSA ticket sync. Optional so the app can deploy before integrations exist.
  PSA_SYNC_ORGANIZATION_ID: z.string().min(1).optional(),
  TICKET_SYNC_LOOKBACK_DAYS: z.coerce.number().int().positive().max(365).default(30),
  CONNECTWISE_BASE_URL: z.string().url().optional(),
  CONNECTWISE_COMPANY_ID: z.string().min(1).optional(),
  CONNECTWISE_PUBLIC_KEY: z.string().min(1).optional(),
  CONNECTWISE_PRIVATE_KEY: z.string().min(1).optional(),
  CONNECTWISE_CLIENT_ID: z.string().min(1).optional(),
  AUTOTASK_BASE_URL: z.string().url().optional(),
  AUTOTASK_USERNAME: z.string().min(1).optional(),
  AUTOTASK_SECRET: z.string().min(1).optional(),
  AUTOTASK_INTEGRATION_CODE: z.string().min(1).optional(),
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
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_STARTER: process.env.STRIPE_PRICE_STARTER,
    STRIPE_PRICE_GROWTH: process.env.STRIPE_PRICE_GROWTH,
    STRIPE_PRICE_ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE,
    PSA_SYNC_ORGANIZATION_ID: process.env.PSA_SYNC_ORGANIZATION_ID,
    TICKET_SYNC_LOOKBACK_DAYS: process.env.TICKET_SYNC_LOOKBACK_DAYS,
    CONNECTWISE_BASE_URL: process.env.CONNECTWISE_BASE_URL,
    CONNECTWISE_COMPANY_ID: process.env.CONNECTWISE_COMPANY_ID,
    CONNECTWISE_PUBLIC_KEY: process.env.CONNECTWISE_PUBLIC_KEY,
    CONNECTWISE_PRIVATE_KEY: process.env.CONNECTWISE_PRIVATE_KEY,
    CONNECTWISE_CLIENT_ID: process.env.CONNECTWISE_CLIENT_ID,
    AUTOTASK_BASE_URL: process.env.AUTOTASK_BASE_URL,
    AUTOTASK_USERNAME: process.env.AUTOTASK_USERNAME,
    AUTOTASK_SECRET: process.env.AUTOTASK_SECRET,
    AUTOTASK_INTEGRATION_CODE: process.env.AUTOTASK_INTEGRATION_CODE,
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
