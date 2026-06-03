-- ============================================================
-- Migration: 20260601000006_erp_audit_extended.sql
-- Purpose:   Extend audit logging on case_history with new
--            ERP-specific action types and richer metadata columns.
--            Fully additive — existing data is unaffected.
-- ============================================================

-- ── Drop and re-add constraint to include new ERP action types ────────────────
DO $$
BEGIN
  -- Remove old constraint (safe — existing rows all have valid values)
  ALTER TABLE public.case_history
    DROP CONSTRAINT IF EXISTS case_history_action_type_check;

  -- Add updated constraint with all ERP action types
  ALTER TABLE public.case_history
    ADD CONSTRAINT case_history_action_type_check
    CHECK (action_type IN (
      -- Existing types
      'stage_update',
      'case_created',
      'case_deleted',
      'finance_update',
      'document_verified',
      'delay_flagged',
      'delay_cleared',
      'dispatch',
      'assignment_changed',
      'priority_changed',
      'subsidy_update',
      'comment_added',
      'system_auto',
      'details_updated',
      -- New ERP types
      'customer_approved',       -- Customer clicked Approve in portal
      'customer_declined',       -- Customer clicked Decline in portal
      'stage_bypassed',          -- Department bypassed a stage (e.g. Electricity bypass)
      'inventory_reserved',      -- Stock reserved for a case automatically
      'inventory_deducted',      -- Stock deducted from live inventory
      'payment_cleared',         -- Accounts confirmed 100% payment
      'technical_approved',      -- Technical QA approved installation
      'task_created',            -- ERP task auto-created (30d/90d)
      'task_completed',          -- ERP task marked complete by agent
      'email_sent',              -- Automated email dispatched
      'customer_portal_opened',  -- Customer opened portal link
      'approval_link_sent',      -- Sales sent approval link to customer
      'wattage_mapping_updated'  -- Admin updated kW→Watt mapping
    ));
END;
$$;

-- ── Add richer audit columns ──────────────────────────────────────────────────
ALTER TABLE public.case_history
  ADD COLUMN IF NOT EXISTS department     TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS previous_stage TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS new_stage      TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS previous_status TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS new_status     TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS attachments    JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS override_action BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS override_reason TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS ip_address     TEXT DEFAULT '';

-- ── Indexes for richer audit queries ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_case_history_department
  ON public.case_history (department, timestamp DESC)
  WHERE department != '';

CREATE INDEX IF NOT EXISTS idx_case_history_override
  ON public.case_history (override_action, timestamp DESC)
  WHERE override_action = TRUE;

NOTIFY pgrst, 'reload schema';
