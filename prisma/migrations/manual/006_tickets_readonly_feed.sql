-- =============================================================================
-- ClientPulse — Ticket integration foundation (read-only PSA feed)
-- =============================================================================
-- Adds normalized ticket tables/enums for future ConnectWise and Autotask syncs.
-- Apply via Supabase Dashboard -> SQL Editor after `pnpm db:push`.
--
-- App users read tenant-scoped tickets. Writes are intentionally omitted from
-- authenticated RLS policies because ticket rows are synced server-side by
-- integration jobs using privileged server credentials.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TicketSource') THEN
    CREATE TYPE public."TicketSource" AS ENUM ('CONNECTWISE', 'AUTOTASK');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TicketStatus') THEN
    CREATE TYPE public."TicketStatus" AS ENUM (
      'NEW',
      'OPEN',
      'IN_PROGRESS',
      'WAITING',
      'RESOLVED',
      'CLOSED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TicketPriority') THEN
    CREATE TYPE public."TicketPriority" AS ENUM (
      'UNKNOWN',
      'LOW',
      'MEDIUM',
      'HIGH',
      'URGENT'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.tickets (
  id                  TEXT                    NOT NULL,
  organization_id     TEXT                    NOT NULL,
  client_id           TEXT,
  source              public."TicketSource"   NOT NULL,
  external_id         TEXT                    NOT NULL,
  external_company_id TEXT,
  external_company_name TEXT,
  number              TEXT,
  title               TEXT                    NOT NULL,
  description         TEXT,
  status              public."TicketStatus"   NOT NULL DEFAULT 'OPEN',
  priority            public."TicketPriority" NOT NULL DEFAULT 'UNKNOWN',
  assignee            TEXT,
  url                 TEXT,
  external_created_at TIMESTAMPTZ             NOT NULL,
  external_updated_at TIMESTAMPTZ,
  resolved_at         TIMESTAMPTZ,
  synced_at           TIMESTAMPTZ             NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ             NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ             NOT NULL DEFAULT now(),

  CONSTRAINT tickets_pkey PRIMARY KEY (id),
  CONSTRAINT tickets_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations(id)
    ON DELETE CASCADE,
  CONSTRAINT tickets_client_id_fkey
    FOREIGN KEY (client_id)
    REFERENCES public.clients(id)
    ON DELETE SET NULL,
  CONSTRAINT tickets_organization_source_external_unique
    UNIQUE (organization_id, source, external_id)
);

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS external_company_id TEXT,
  ADD COLUMN IF NOT EXISTS external_company_name TEXT;

CREATE INDEX IF NOT EXISTS tickets_organization_id_idx
  ON public.tickets(organization_id);

CREATE INDEX IF NOT EXISTS tickets_client_id_idx
  ON public.tickets(client_id);

CREATE INDEX IF NOT EXISTS tickets_status_idx
  ON public.tickets(status);

CREATE INDEX IF NOT EXISTS tickets_priority_idx
  ON public.tickets(priority);

CREATE INDEX IF NOT EXISTS tickets_external_created_at_idx
  ON public.tickets(external_created_at);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets: org members can read their own tickets"
  ON public.tickets;

CREATE POLICY "tickets: org members can read their own tickets"
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (organization_id = public.requesting_org_id());

-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT EXISTS (
  SELECT 1
    FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name = 'tickets'
) AS tickets_table_exists;

SELECT relrowsecurity
  FROM pg_class
 WHERE oid = 'public.tickets'::regclass;

SELECT policyname
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename = 'tickets'
 ORDER BY policyname;
