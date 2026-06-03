-- ============================================================
-- Migration: 20260524000005_escalation_system.sql
-- Purpose:   Add escalation_level column to cases table and
--            a pg_cron job that auto-escalates stale cases.
--            Fully additive — no existing data is modified.
-- Rollback:  ALTER TABLE public.cases DROP COLUMN IF EXISTS escalation_level;
--            ALTER TABLE public.cases DROP COLUMN IF EXISTS stage_entered_at;
--            SELECT cron.unschedule('escalate-stale-cases');
--            DROP INDEX IF EXISTS idx_cases_escalation_level;
-- ============================================================

-- Add escalation_level to cases (0=normal, 1=watch, 2=urgent, 3=critical)
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS escalation_level INTEGER NOT NULL DEFAULT 0;

-- Add stage_entered_at so we can calculate how long a case has been at its current stage
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS stage_entered_at TIMESTAMPTZ;

-- Back-fill stage_entered_at for existing cases from their latest case_history entry
-- FIX: case_history.case_id is TEXT, but cases.id is UUID — cast c.id to TEXT for comparison
UPDATE public.cases c
SET stage_entered_at = (
  SELECT MAX(h.timestamp)
  FROM public.case_history h
  WHERE h.case_id = c.id::text
)
WHERE c.stage_entered_at IS NULL;

-- For cases with no history at all, fall back to created_at
UPDATE public.cases
SET stage_entered_at = created_at
WHERE stage_entered_at IS NULL;

-- Constraint: safe idempotent pattern using information_schema
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'cases' AND constraint_name = 'cases_escalation_level_check'
  ) THEN
    ALTER TABLE public.cases
      ADD CONSTRAINT cases_escalation_level_check
      CHECK (escalation_level IN (0, 1, 2, 3));
  END IF;
END;
$$;

-- Index for dashboard queries filtering by escalation
CREATE INDEX IF NOT EXISTS idx_cases_escalation_level
  ON public.cases (escalation_level, status)
  WHERE escalation_level > 0;

-- ── pg_cron job: auto-escalate stale active cases ────────────────────────────
-- Runs every 6 hours. Updates escalation_level based on days stuck at stage:
--   0-1 days  → level 0 (normal)
--   2-3 days  → level 1 (watch)
--   4-6 days  → level 2 (urgent)
--   7+ days   → level 3 (critical)
-- Only affects In Progress and Delayed cases (not Completed).
-- NOTE: pg_cron must be enabled in Supabase → Database → Extensions.
--       If pg_cron is not enabled, comment out or remove this block.
SELECT cron.schedule(
  'escalate-stale-cases',
  '0 */6 * * *',
  $$
    UPDATE public.cases
    SET escalation_level = CASE
      WHEN EXTRACT(EPOCH FROM (NOW() - stage_entered_at)) / 86400 >= 7 THEN 3
      WHEN EXTRACT(EPOCH FROM (NOW() - stage_entered_at)) / 86400 >= 4 THEN 2
      WHEN EXTRACT(EPOCH FROM (NOW() - stage_entered_at)) / 86400 >= 2 THEN 1
      ELSE 0
    END
    WHERE status IN ('In Progress', 'Delayed')
      AND stage_entered_at IS NOT NULL;
  $$
);
