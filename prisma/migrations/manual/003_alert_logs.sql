-- =============================================================================
-- ClientPulse — AlertLog table (Week 5)
-- =============================================================================
-- Run this AFTER applying 001_rls_policies.sql and 002_rls_organizations_users.sql.
-- Apply via: Supabase Dashboard → SQL Editor, or psql with DIRECT_URL.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.alert_logs (
  id              TEXT        NOT NULL,
  organization_id TEXT        NOT NULL,
  entity_type     TEXT        NOT NULL,  -- 'device' | 'client'
  entity_id       TEXT        NOT NULL,
  alert_type      TEXT        NOT NULL,  -- 'patch_age' | 'health_critical'
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT alert_logs_pkey PRIMARY KEY (id),
  CONSTRAINT alert_logs_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS alert_logs_org_idx
  ON public.alert_logs(organization_id);

CREATE INDEX IF NOT EXISTS alert_logs_entity_alert_idx
  ON public.alert_logs(entity_type, entity_id, alert_type, sent_at);

-- RLS
ALTER TABLE public.alert_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alert_logs: org members can read their own logs" ON public.alert_logs;

CREATE POLICY "alert_logs: org members can read their own logs"
  ON public.alert_logs
  FOR SELECT
  TO authenticated
  USING (organization_id::text = public.requesting_org_id());

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- Passing: one row, rls_enabled = true, rls_forced = true.
SELECT
    c.relname             AS tablename,
    c.relrowsecurity      AS rls_enabled,
    c.relforcerowsecurity AS rls_forced
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public'
   AND c.relname = 'alert_logs';
