-- =============================================================================
-- ClientPulse — Stripe billing columns on organizations (Week 6)
-- =============================================================================
-- Adds plan, stripe_customer_id, and stripe_subscription_id to organizations.
-- Apply via: Supabase Dashboard → SQL Editor, or psql with DIRECT_URL.
-- Safe to run multiple times (IF NOT EXISTS / IF column exists guards).
-- =============================================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS plan                  TEXT NOT NULL DEFAULT 'STARTER',
  ADD COLUMN IF NOT EXISTS stripe_customer_id    TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- Passing: three rows returned, one per new column.
SELECT column_name, data_type, column_default, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name   = 'organizations'
   AND column_name  IN ('plan', 'stripe_customer_id', 'stripe_subscription_id')
 ORDER BY column_name;
