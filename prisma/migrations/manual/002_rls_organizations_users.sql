-- =============================================================================
-- ClientPulse — RLS for organizations and users tables
-- =============================================================================
-- Apply via: Supabase Dashboard → SQL Editor
--
-- Why these were deferred from 001:
--   All reads of organizations/users in Week 1 go through Prisma (postgres
--   superuser) or the service-role key — both bypass RLS at the Postgres
--   level. The original reasoning was "no client-side queries touch these
--   tables, so RLS adds no value."
--
--   That reasoning is incomplete: the Supabase PostgREST REST API is always
--   reachable at /rest/v1/<table> with the anon or authenticated JWT. Without
--   RLS, any user who knows the anon key can enumerate all organizations and
--   all users across every tenant.
--
-- Why ENABLE but not FORCE:
--   FORCE ROW LEVEL SECURITY makes even the table owner (postgres superuser)
--   obey RLS. Prisma connects as postgres — forcing RLS would block every
--   server-side query without adding policies for that role. ENABLE is enough
--   because the exploitable path (PostgREST) runs as the anon/authenticated
--   role, which always respects RLS regardless of FORCE.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enable RLS (without FORCE — see rationale above)
-- ---------------------------------------------------------------------------

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- organizations — policies
-- ---------------------------------------------------------------------------
-- Authenticated users may only see the one organization they belong to.
-- No INSERT/UPDATE/DELETE: all org mutations go through the service-role key.

DROP POLICY IF EXISTS "organizations: members can read their own org" ON public.organizations;

CREATE POLICY "organizations: members can read their own org"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (id::text = public.requesting_org_id());

-- ---------------------------------------------------------------------------
-- users — policies
-- ---------------------------------------------------------------------------
-- Two SELECT policies:
--
-- 1. Authenticated users see only users within their org.
-- 2. supabase_auth_admin sees all rows — required so the
--    custom_access_token_hook (which runs as auth admin) can look up
--    organization_id when minting JWTs. Without this, the hook returns
--    org_id = NULL and every RLS policy silently denies all rows.
--
-- No INSERT/UPDATE/DELETE: all user mutations go through the service-role key
-- (signup action) or Prisma server actions with the postgres connection.

DROP POLICY IF EXISTS "users: members can read users in their own org"  ON public.users;
DROP POLICY IF EXISTS "users: supabase_auth_admin can read all users"   ON public.users;

CREATE POLICY "users: members can read users in their own org"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (organization_id::text = public.requesting_org_id());

CREATE POLICY "users: supabase_auth_admin can read all users"
  ON public.users
  FOR SELECT
  TO supabase_auth_admin
  USING (true);
  -- supabase_auth_admin already has GRANT SELECT (from 001_rls_policies.sql).
  -- This policy lifts the default-deny that RLS would otherwise impose on
  -- that role, while leaving the authenticated policy in place for JWT sessions.

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- V1 — Confirm RLS is now enabled on all five tables
-- Passing: 5 rows, rls_enabled = true for all.
-- Note: rls_forced will be false for organizations and users — that is correct.

SELECT
    c.relname             AS tablename,
    c.relrowsecurity      AS rls_enabled,
    c.relforcerowsecurity AS rls_forced
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public'
   AND c.relname IN ('clients', 'devices', 'audit_logs', 'organizations', 'users')
 ORDER BY c.relname;

-- V2 — List all policies (should now be 11 total)
-- clients    → 4, devices → 4, audit_logs → 1, organizations → 1, users → 2

SELECT
    tablename,
    policyname,
    cmd        AS command,
    roles
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename  IN ('clients', 'devices', 'audit_logs', 'organizations', 'users')
 ORDER BY tablename, policyname;
