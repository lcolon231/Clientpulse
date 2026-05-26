-- =============================================================================
-- ClientPulse — Week 7 schema additions
-- =============================================================================
-- Adds onboarding_complete, timezone, logo_url to organizations.
-- Adds the notifications table.
-- Apply via: Supabase Dashboard → SQL Editor, or psql with DIRECT_URL.
-- =============================================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS timezone             TEXT    NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS logo_url             TEXT;

CREATE TABLE IF NOT EXISTS public.notifications (
  id              TEXT        NOT NULL,
  organization_id TEXT        NOT NULL,
  user_id         TEXT,
  title           TEXT        NOT NULL,
  body            TEXT        NOT NULL,
  read            BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  link_href       TEXT,

  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS notifications_org_idx ON public.notifications(organization_id);

-- =============================================================================
-- VERIFICATION
-- =============================================================================
SELECT column_name, data_type, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name   = 'organizations'
   AND column_name  IN ('onboarding_complete', 'timezone', 'logo_url')
 ORDER BY column_name;

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name = 'notifications'
) AS notifications_table_exists;
