-- ============================================================
-- Migration: 20260601000002_erp_workflow_stages.sql
-- Purpose:   Add new ERP workflow columns to the cases table.
--            All columns use IF NOT EXISTS / safe defaults.
--            No existing data is modified.
-- ============================================================

-- ── Customer Portal / Approval ────────────────────────────────────────────────
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS approval_token          TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS approval_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_approved_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_declined_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_portal_stage   TEXT DEFAULT '';

-- ── Quotation Amount (shown prominently in Registration) ──────────────────────
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS quotation_amount        NUMERIC DEFAULT 0;

-- ── Wire Specifications (replaces free-text wiring field) ────────────────────
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS wire_core_material      TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS wire_armouring          TEXT DEFAULT '';

-- ── Custom System Capacity ───────────────────────────────────────────────────
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS custom_capacity_kw      NUMERIC;

-- ── Technical QA (Stage 7) ───────────────────────────────────────────────────
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS technical_qa_notes      TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS technical_qa_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS technical_qa_by         TEXT DEFAULT '';

-- ── Accounts Clearance (Stage 8) ────────────────────────────────────────────
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS accounts_clearance_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accounts_cleared_by     TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_fully_cleared   BOOLEAN DEFAULT FALSE;

-- ── Subsidy Processing (Stage 9) ─────────────────────────────────────────────
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS subsidy_submitted_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subsidy_followup_task_created BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS subsidy_govt_certificate_url  TEXT DEFAULT '';

-- ── Customer Service CRM (Stage 10) ─────────────────────────────────────────
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS crm_last_health_check_at TIMESTAMPTZ;

-- ── Bypass / Override Tracking ───────────────────────────────────────────────
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS bypass_log              JSONB DEFAULT '[]'::jsonb;

-- ── Index for approval token lookups ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cases_approval_token
  ON public.cases (approval_token)
  WHERE approval_token IS NOT NULL AND approval_token != '';

CREATE INDEX IF NOT EXISTS idx_cases_subsidy_submitted_at
  ON public.cases (subsidy_submitted_at)
  WHERE subsidy_submitted_at IS NOT NULL;

NOTIFY pgrst, 'reload schema';
