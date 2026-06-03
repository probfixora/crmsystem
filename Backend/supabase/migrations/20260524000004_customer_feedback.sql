-- ============================================================
-- Migration: 20260524000004_customer_feedback.sql
-- Purpose:   Create new customer_feedback table. New table only,
--            no existing tables modified.
-- Rollback:  DROP TABLE IF EXISTS public.customer_feedback;
-- ============================================================

CREATE TABLE IF NOT EXISTS public.customer_feedback (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                TEXT        NOT NULL,                         -- matches cases.case_id (CASE-XXXX format)
  customer_name          TEXT        NOT NULL DEFAULT '',
  rating                 INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback_text          TEXT        NOT NULL DEFAULT '',
  installation_quality   INTEGER     CHECK (installation_quality BETWEEN 1 AND 5),
  team_behavior          INTEGER     CHECK (team_behavior BETWEEN 1 AND 5),
  timeline_satisfaction  INTEGER     CHECK (timeline_satisfaction BETWEEN 1 AND 5),
  submitted_by           TEXT        NOT NULL DEFAULT 'admin',         -- 'admin' or 'customer'
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS (all access via Edge Functions using service role)
ALTER TABLE public.customer_feedback ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (Edge Functions use service role key)
-- NOTE: CREATE POLICY IF NOT EXISTS is invalid PostgreSQL syntax.
--       Wrap in a DO block with pg_policies existence check.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'customer_feedback'
      AND policyname = 'Service role has full access to customer_feedback'
  ) THEN
    EXECUTE '
      CREATE POLICY "Service role has full access to customer_feedback"
        ON public.customer_feedback
        USING (true)
        WITH CHECK (true)
    ';
  END IF;
END;
$$;

-- Index for case lookup (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_feedback_case_id
  ON public.customer_feedback (case_id, created_at DESC);
