-- =============================================================================
-- ClientPulse — Native ticket support (Goal 1)
-- =============================================================================
-- Extends the read-only PSA ticket model to also support natively-created
-- tickets (source IS NULL) and adds the ticket_comments table.
--
-- Apply via Supabase Dashboard -> SQL Editor AFTER running `pnpm db:generate`.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Make PSA-specific columns nullable (native tickets won't have them)
-- ---------------------------------------------------------------------------

ALTER TABLE public.tickets ALTER COLUMN source DROP NOT NULL;
ALTER TABLE public.tickets ALTER COLUMN external_id DROP NOT NULL;
ALTER TABLE public.tickets ALTER COLUMN external_created_at DROP NOT NULL;
ALTER TABLE public.tickets ALTER COLUMN synced_at DROP NOT NULL;

-- Change default priority from UNKNOWN to MEDIUM for new rows
ALTER TABLE public.tickets ALTER COLUMN priority SET DEFAULT 'MEDIUM'::"TicketPriority";

-- ---------------------------------------------------------------------------
-- 2. Add native-ticket columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS assignee_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS tickets_assignee_id_idx ON public.tickets(assignee_id);

-- ---------------------------------------------------------------------------
-- 3. Create ticket_comments table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id         TEXT        NOT NULL,
  ticket_id  TEXT        NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id    TEXT        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ticket_comments_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ticket_comments_ticket_id_idx ON public.ticket_comments(ticket_id);

-- ---------------------------------------------------------------------------
-- 4. RLS for ticket_comments
-- ---------------------------------------------------------------------------

ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket_comments: org members can read their own"
  ON public.ticket_comments;

CREATE POLICY "ticket_comments: org members can read their own"
  ON public.ticket_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id
        AND t.organization_id = public.requesting_org_id()
    )
  );

-- Allow org members to insert their own comments
DROP POLICY IF EXISTS "ticket_comments: org members can insert their own"
  ON public.ticket_comments;

CREATE POLICY "ticket_comments: org members can insert their own"
  ON public.ticket_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id
        AND t.organization_id = public.requesting_org_id()
    )
  );

-- Allow org members to write native tickets (source IS NULL)
DROP POLICY IF EXISTS "tickets: org members can write native tickets"
  ON public.tickets;

CREATE POLICY "tickets: org members can write native tickets"
  ON public.tickets
  FOR ALL
  TO authenticated
  USING (
    organization_id = public.requesting_org_id()
    AND source IS NULL
  )
  WITH CHECK (
    organization_id = public.requesting_org_id()
    AND source IS NULL
  );

-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT column_name, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'tickets'
   AND column_name IN ('source', 'external_id', 'external_created_at', 'assignee_id', 'due_date')
 ORDER BY column_name;

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'ticket_comments'
) AS ticket_comments_table_exists;
