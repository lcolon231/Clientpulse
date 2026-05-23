-- =============================================================================
-- ClientPulse — RLS for health_snapshots table
-- =============================================================================
-- Apply via: Supabase Dashboard → SQL Editor
-- Run AFTER `prisma db push` has created the health_snapshots table.
--
-- health_snapshots has organizationId directly (same pattern as clients), so
-- RLS uses the same requesting_org_id() helper defined in 001_rls_policies.sql.
--
-- Writes come exclusively from the Vercel Cron job via the service-role key,
-- which bypasses RLS at the Postgres level — so no INSERT/UPDATE policies are
-- needed for the authenticated role.
-- =============================================================================

ALTER TABLE public.health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_snapshots FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "health_snapshots: org members can read their own snapshots"
  ON public.health_snapshots;

-- READ: any authenticated user whose JWT org_id matches the row's organization_id.
CREATE POLICY "health_snapshots: org members can read their own snapshots"
  ON public.health_snapshots
  FOR SELECT
  TO authenticated
  USING (
    organization_id::text = public.requesting_org_id()
  );

-- No INSERT/UPDATE/DELETE policies for the authenticated role.
-- All writes are performed by the cron job using the service-role key,
-- which runs as the postgres superuser and bypasses RLS intentionally.

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- Run these queries in Supabase SQL Editor after applying the migration.
-- =============================================================================

-- V1 — Confirm RLS is enabled and forced on health_snapshots
-- Passing: one row, both rls_enabled and rls_forced = true.
SELECT
    c.relname             AS tablename,
    c.relrowsecurity      AS rls_enabled,
    c.relforcerowsecurity AS rls_forced
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public'
   AND c.relname = 'health_snapshots';

-- V2 — List policies on health_snapshots
-- Passing: exactly 1 policy (SELECT only).
SELECT
    tablename,
    policyname,
    cmd AS command,
    roles
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename  = 'health_snapshots';
