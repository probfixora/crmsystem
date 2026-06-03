-- ============================================================
-- Migration: 20260524000002_enable_realtime.sql
-- Purpose:   Enable Supabase Realtime publication on case_history
--            so the frontend can subscribe to live insert events.
--            Fully additive — no data or schema changes.
-- Rollback:  ALTER PUBLICATION supabase_realtime DROP TABLE public.case_history;
--            DROP POLICY IF EXISTS "Authenticated users can view case history" ON public.case_history;
-- ============================================================

-- Enable Realtime publication for case_history (INSERT events only needed)
-- Using a DO block to safely handle already-added case.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'case_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.case_history;
  END IF;
END;
$$;

-- Also enable RLS SELECT policy for authenticated users on case_history
-- so Realtime channel delivers events to the frontend client.
-- NOTE: CREATE POLICY IF NOT EXISTS is NOT valid PostgreSQL syntax.
--       Use a DO block with a policy existence check instead.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'case_history'
      AND policyname = 'Authenticated users can view case history'
  ) THEN
    EXECUTE '
      CREATE POLICY "Authenticated users can view case history"
        ON public.case_history FOR SELECT
        USING (auth.role() = ''authenticated'')
    ';
  END IF;
END;
$$;
