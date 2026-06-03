-- ============================================================
-- Migration: 20260524000001_add_audit_improvements.sql
-- Purpose:   Add action_type column to case_history for structured
--            audit logging. Fully additive — no existing data or
--            logic is modified.
-- Rollback:  ALTER TABLE public.case_history DROP COLUMN IF EXISTS action_type;
--            DROP INDEX IF EXISTS idx_case_history_action_type;
--            DROP INDEX IF EXISTS idx_case_history_timestamp;
-- ============================================================

-- Add action_type to case_history for structured audit logging
-- DEFAULT 'stage_update' ensures all existing rows remain valid
ALTER TABLE public.case_history
  ADD COLUMN IF NOT EXISTS action_type TEXT NOT NULL DEFAULT 'stage_update';

-- Add constraint separately so it can be re-run safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'case_history' AND constraint_name = 'case_history_action_type_check'
  ) THEN
    ALTER TABLE public.case_history
      ADD CONSTRAINT case_history_action_type_check
      CHECK (action_type IN (
        'stage_update',       -- workflow stage transition
        'case_created',       -- new case registered
        'case_deleted',       -- case removed
        'finance_update',     -- banking/finance fields changed
        'document_verified',  -- document status changed
        'delay_flagged',      -- marked as delayed
        'delay_cleared',      -- delay flag removed
        'dispatch',           -- inventory dispatched
        'assignment_changed', -- assigned_to changed
        'priority_changed',   -- priority toggled
        'subsidy_update',     -- subsidy details updated
        'comment_added',      -- internal comment posted
        'system_auto',        -- automated system action
        'details_updated'     -- generic field update
      ));
  END IF;
END;
$$;

-- Index for faster audit queries by type
CREATE INDEX IF NOT EXISTS idx_case_history_action_type
  ON public.case_history (action_type, timestamp DESC);

-- Index for chronological activity feeds
CREATE INDEX IF NOT EXISTS idx_case_history_timestamp
  ON public.case_history (timestamp DESC);
