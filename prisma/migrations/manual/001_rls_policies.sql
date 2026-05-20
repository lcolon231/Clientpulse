-- =============================================================================
-- ClientPulse — Row-Level Security Policies
-- =============================================================================
-- Run this AFTER `prisma db push` (or your first Prisma migration) has created
-- the tables. Apply via: Supabase Dashboard → SQL Editor, or psql with DIRECT_URL.
--
-- Tables covered: clients, devices, audit_logs
-- Tables NOT covered: organizations, users
--   organizations — tenants never query each other's org rows directly;
--                   all joins go through the org's own data. RLS here adds
--                   complexity for no security gain given the access patterns.
--   users         — user rows are fetched server-side using the service-role
--                   key, never through the anon/user key in client code.
--                   If you add a self-service profile page later, add RLS then.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- How the JWT claim works
-- ---------------------------------------------------------------------------
-- When a user signs in, Supabase Auth issues a JWT. By default that JWT
-- contains the user's `sub` (their auth.users.id UUID) and standard claims.
--
-- We need a CUSTOM claim — `org_id` — so that Postgres RLS policies can call
--   auth.jwt() ->> 'org_id'
-- and compare it against the `organization_id` column without an extra DB
-- round-trip.
--
-- The mechanism: a Postgres FUNCTION that fires as a Supabase Auth Hook
-- ("Custom Access Token Hook"). Supabase calls this function every time it
-- mints a JWT, and we return extra claims to embed in the token.
--
-- Step-by-step to wire up the hook (one-time, in Supabase Dashboard):
--   1. Run the function below in SQL Editor.
--   2. Go to Authentication → Hooks → Custom Access Token.
--   3. Select the function `public.custom_access_token_hook`.
--   4. Save. Every new login/refresh will now include `org_id` in the JWT.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE  -- reads DB but never writes; Postgres can cache per transaction
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_org_id text;
  v_claims jsonb;
BEGIN
  -- Look up the organization_id for this Supabase Auth user.
  -- event->>'user_id' is the auth.users.id UUID (same as JWT `sub`).
  SELECT organization_id::text
    INTO v_org_id
    FROM public.users
   WHERE supabase_user_id = (event->>'user_id')
   LIMIT 1;

  -- Merge our custom claim into the existing claims object.
  -- If the user has no org yet (edge case during signup), org_id is NULL —
  -- the RLS policies will simply deny all rows, which is correct.
  v_claims := coalesce(event->'claims', '{}'::jsonb);
  v_claims := jsonb_set(v_claims, '{org_id}', to_jsonb(v_org_id));

  RETURN jsonb_set(event, '{claims}', v_claims);
END;
$$;

-- Grant execute to the supabase_auth_admin role that Supabase uses internally.
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
-- The function reads public.users, so ensure auth admin can select it.
GRANT SELECT ON TABLE public.users TO supabase_auth_admin;

-- ---------------------------------------------------------------------------
-- Enable RLS on the three tenant-scoped tables
-- ---------------------------------------------------------------------------
-- `FORCE ROW LEVEL SECURITY` means even the table owner (postgres superuser)
-- obeys RLS. Without FORCE, the owner bypasses policies — dangerous if any
-- query ever runs as the owner role.

ALTER TABLE public.clients    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients    FORCE ROW LEVEL SECURITY;

ALTER TABLE public.devices    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices    FORCE ROW LEVEL SECURITY;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Helper: a stable function to extract org_id from the current JWT
-- ---------------------------------------------------------------------------
-- We wrap the claim extraction in a function so:
--   a) policies stay readable (one place to update if the claim name changes)
--   b) Postgres can mark it STABLE and avoid re-evaluating per row
--
-- auth.jwt() returns the decoded JWT payload as jsonb.
-- `->>` extracts a value as text (NULL if the key is missing).

CREATE OR REPLACE FUNCTION public.requesting_org_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER  -- runs as the calling role, not the definer — least privilege
AS $$
  SELECT auth.jwt() ->> 'org_id';
$$;

-- ---------------------------------------------------------------------------
-- clients — policies
-- ---------------------------------------------------------------------------

-- DROP existing policies first so this script is re-runnable.
DROP POLICY IF EXISTS "clients: org members can read their own clients"   ON public.clients;
DROP POLICY IF EXISTS "clients: org members can insert their own clients"  ON public.clients;
DROP POLICY IF EXISTS "clients: org members can update their own clients"  ON public.clients;
DROP POLICY IF EXISTS "clients: org members can delete their own clients"  ON public.clients;

-- READ: any authenticated user whose JWT org_id matches the row's organization_id.
CREATE POLICY "clients: org members can read their own clients"
  ON public.clients
  FOR SELECT
  TO authenticated          -- only applies to sessions with a valid JWT
  USING (
    organization_id::text = public.requesting_org_id()
    --   ^^^^^^^^^^^^^^^^^   ^^^^^^^^^^^^^^^^^^^^^^^^^^
    --   the row's column    the claim extracted from the JWT
    --
    -- Postgres evaluates USING for every candidate row. Rows that return
    -- false are silently filtered out (the caller sees zero rows, not an error).
    -- This means a mistaken cross-tenant query returns empty, not a 403.
  );

-- INSERT: the new row's organization_id must match the JWT claim.
-- WITH CHECK runs on the *new* row values (not the existing row).
CREATE POLICY "clients: org members can insert their own clients"
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id::text = public.requesting_org_id()
  );

-- UPDATE: USING filters which rows can be targeted; WITH CHECK validates
-- that the updated row still belongs to the same org (prevents row
-- "re-assignment" to a different org by changing organization_id).
CREATE POLICY "clients: org members can update their own clients"
  ON public.clients
  FOR UPDATE
  TO authenticated
  USING (
    organization_id::text = public.requesting_org_id()
  )
  WITH CHECK (
    organization_id::text = public.requesting_org_id()
  );

-- DELETE: only the row's own org can delete it.
CREATE POLICY "clients: org members can delete their own clients"
  ON public.clients
  FOR DELETE
  TO authenticated
  USING (
    organization_id::text = public.requesting_org_id()
  );

-- ---------------------------------------------------------------------------
-- devices — policies
-- ---------------------------------------------------------------------------
-- Devices don't have organization_id directly; they belong to clients, which
-- do. We join through to enforce the same isolation.
--
-- NOTE: This makes the USING clause a subquery. Postgres evaluates it per row.
-- For large Device tables, the index on clients.organization_id and the
-- index on devices.client_id keep this fast.

DROP POLICY IF EXISTS "devices: org members can read their own devices"   ON public.devices;
DROP POLICY IF EXISTS "devices: org members can insert their own devices"  ON public.devices;
DROP POLICY IF EXISTS "devices: org members can update their own devices"  ON public.devices;
DROP POLICY IF EXISTS "devices: org members can delete their own devices"  ON public.devices;

CREATE POLICY "devices: org members can read their own devices"
  ON public.devices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.clients c
       WHERE c.id             = devices.client_id
         AND c.organization_id::text = public.requesting_org_id()
    )
    -- EXISTS short-circuits on the first matching row, so it's efficient
    -- even without a materialised organization_id on the devices table.
  );

CREATE POLICY "devices: org members can insert their own devices"
  ON public.devices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM public.clients c
       WHERE c.id             = devices.client_id
         AND c.organization_id::text = public.requesting_org_id()
    )
  );

CREATE POLICY "devices: org members can update their own devices"
  ON public.devices
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
       WHERE c.id = devices.client_id
         AND c.organization_id::text = public.requesting_org_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
       WHERE c.id = devices.client_id
         AND c.organization_id::text = public.requesting_org_id()
    )
  );

CREATE POLICY "devices: org members can delete their own devices"
  ON public.devices
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
       WHERE c.id = devices.client_id
         AND c.organization_id::text = public.requesting_org_id()
    )
  );

-- ---------------------------------------------------------------------------
-- audit_logs — policies
-- ---------------------------------------------------------------------------
-- AuditLogs are append-only. In Week 1 they are written server-side via the
-- service-role key (which bypasses RLS), so INSERT/UPDATE/DELETE policies are
-- intentionally omitted here — no user-facing code writes audit rows directly.
--
-- When you add a log-viewer UI (Week N), you'll want to add an INSERT policy
-- or, better, keep all writes through a server action with the service-role key
-- so the log is tamper-proof from the client side.

DROP POLICY IF EXISTS "audit_logs: org members can read their own logs" ON public.audit_logs;

CREATE POLICY "audit_logs: org members can read their own logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    organization_id::text = public.requesting_org_id()
  );

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
-- After applying:
--   1. Configure the Custom Access Token Hook in Supabase Dashboard:
--      Authentication → Hooks → Custom Access Token →
--      select public.custom_access_token_hook → Save.
--   2. Run the verification queries below to confirm everything is wired up.
-- =============================================================================


-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- The queries below are NOT part of the migration.
-- Run them in Supabase SQL Editor (or psql) after applying the migration to
-- confirm that RLS, policies, and helper functions are all in place.
-- Each query includes a comment describing what a passing result looks like.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- V1 — Confirm RLS is enabled and forced on the three tenant-scoped tables
-- ---------------------------------------------------------------------------
-- Passing: three rows, one per table, both rowsecurity and forcerlspolicy = true.
-- Failing: any row missing, or either column showing false.

SELECT
    tablename,
    rowsecurity      AS rls_enabled,
    forcerlspolicy   AS rls_forced
  FROM pg_tables
 WHERE schemaname = 'public'
   AND tablename  IN ('clients', 'devices', 'audit_logs')
 ORDER BY tablename;

-- ---------------------------------------------------------------------------
-- V2 — List all RLS policies on the three tables
-- ---------------------------------------------------------------------------
-- Passing: 9 policies total —
--   clients    → 4 (SELECT, INSERT, UPDATE, DELETE)
--   devices    → 4 (SELECT, INSERT, UPDATE, DELETE)
--   audit_logs → 1 (SELECT only — writes go through service-role key)
-- Failing: fewer than 9 rows, or a policy on the wrong table/command.

SELECT
    tablename,
    policyname,
    cmd          AS command,
    roles,
    qual         AS using_expr,
    with_check   AS with_check_expr
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename  IN ('clients', 'devices', 'audit_logs')
 ORDER BY tablename, policyname;

-- ---------------------------------------------------------------------------
-- V3 — Confirm public.requesting_org_id() exists and is marked STABLE
-- ---------------------------------------------------------------------------
-- Passing: exactly one row, provolatile = 's' (s = stable).
-- Failing: zero rows means the function wasn't created; 'v' means volatile
--          (won't be cached per-row — fix by recreating with STABLE).

SELECT
    proname      AS function_name,
    provolatile  AS volatility,   -- 's' = stable, 'i' = immutable, 'v' = volatile
    prosecdef    AS security_definer
  FROM pg_proc
  JOIN pg_namespace ns ON ns.oid = pg_proc.pronamespace
 WHERE ns.nspname = 'public'
   AND proname    = 'requesting_org_id';

-- ---------------------------------------------------------------------------
-- V4 — Confirm public.custom_access_token_hook() exists
-- ---------------------------------------------------------------------------
-- Passing: exactly one row.
-- Failing: zero rows — the JWT hook function wasn't created. Re-run the
--          CREATE OR REPLACE FUNCTION block at the top of this migration.

SELECT
    proname      AS function_name,
    provolatile  AS volatility,
    prosecdef    AS security_definer
  FROM pg_proc
  JOIN pg_namespace ns ON ns.oid = pg_proc.pronamespace
 WHERE ns.nspname = 'public'
   AND proname    = 'custom_access_token_hook';

-- ---------------------------------------------------------------------------
-- ⚠️  IMPORTANT: SQL alone is not enough for the JWT claim to work.
-- ---------------------------------------------------------------------------
-- The custom_access_token_hook function must also be SELECTED as the active
-- hook in Supabase Dashboard:
--   Authentication → Hooks → Custom Access Token
--   → choose "public.custom_access_token_hook" from the dropdown → Save.
--
-- Without this step, Supabase will NOT call the function when minting JWTs,
-- the org_id claim will be absent from every token, and ALL RLS policies
-- will silently deny every row (users will see empty tables with no error).
-- =============================================================================
