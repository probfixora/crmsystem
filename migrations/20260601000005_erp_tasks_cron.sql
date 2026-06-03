-- ============================================================
-- Migration: 20260601000005_erp_tasks_cron.sql
-- Purpose:   ERP task management table + cron automation for
--            subsidy 30-day follow-up and 90-day CRM health checks.
-- ============================================================

-- ── ERP Tasks Table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.erp_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         TEXT NOT NULL,
  customer_name   TEXT DEFAULT '',
  task_type       TEXT NOT NULL DEFAULT 'general'
                    CHECK (task_type IN (
                      'subsidy_followup',   -- 30-day subsidy status check
                      'crm_health_check',   -- 90-day CRM maintenance call
                      'qa_review',          -- Technical QA review
                      'payment_collection', -- Accounts payment follow-up
                      'general'             -- Manually created task
                    )),
  title           TEXT NOT NULL,
  description     TEXT DEFAULT '',
  priority        TEXT DEFAULT 'normal'
                    CHECK (priority IN ('low','normal','high','urgent')),
  assigned_role   TEXT DEFAULT '',           -- which department owns this task
  assigned_to     TEXT DEFAULT '',           -- specific user name (optional)
  due_at          TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','in_progress','completed','cancelled')),
  notes           TEXT DEFAULT '',           -- completion notes
  completed_by    TEXT DEFAULT '',
  completed_at    TIMESTAMPTZ,
  created_by_role TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER erp_tasks_updated_at
  BEFORE UPDATE ON public.erp_tasks
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_erp_tasks_case_id
  ON public.erp_tasks (case_id, status);
CREATE INDEX IF NOT EXISTS idx_erp_tasks_role
  ON public.erp_tasks (assigned_role, status, due_at);
CREATE INDEX IF NOT EXISTS idx_erp_tasks_type
  ON public.erp_tasks (task_type, status);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.erp_tasks ENABLE ROW LEVEL SECURITY;

-- ── Cron Job 1: 30-Day Subsidy Follow-Up ─────────────────────────────────────
-- Runs daily at 06:00 UTC
-- Finds cases where subsidy was submitted 30+ days ago but no follow-up task created
SELECT cron.schedule(
  'erp_subsidy_followup_30d',
  '0 6 * * *',
  $$
    INSERT INTO public.erp_tasks (
      case_id, customer_name, task_type, title, description,
      priority, assigned_role, due_at, status
    )
    SELECT
      c.case_id,
      c.customer_name,
      'subsidy_followup',
      'Check Subsidy Status — ' || c.customer_name,
      'It has been 30 days since subsidy application was submitted. Please contact the customer to confirm subsidy has been received and record the details.',
      'high',
      'subsidy',
      NOW() + INTERVAL '2 days',
      'pending'
    FROM public.cases c
    WHERE c.subsidy_submitted_at IS NOT NULL
      AND c.subsidy_submitted_at <= NOW() - INTERVAL '30 days'
      AND c.subsidy_followup_task_created = FALSE
      AND c.status != 'Completed';

    -- Mark flag so we don't create duplicate tasks
    UPDATE public.cases
    SET subsidy_followup_task_created = TRUE
    WHERE subsidy_submitted_at IS NOT NULL
      AND subsidy_submitted_at <= NOW() - INTERVAL '30 days'
      AND subsidy_followup_task_created = FALSE
      AND status != 'Completed';
  $$
);

-- ── Cron Job 2: 90-Day CRM Health Check ──────────────────────────────────────
-- Runs daily at 06:30 UTC
-- Finds completed cases where no health check was done in 90+ days
SELECT cron.schedule(
  'erp_crm_health_check_90d',
  '30 6 * * *',
  $$
    INSERT INTO public.erp_tasks (
      case_id, customer_name, task_type, title, description,
      priority, assigned_role, due_at, status
    )
    SELECT
      c.case_id,
      c.customer_name,
      'crm_health_check',
      'Periodic Health Check-In — ' || c.customer_name,
      'Execute periodic solar system health check-in. Contact customer, review solar performance, record notes, and save service history.',
      'normal',
      'customer_service',
      NOW() + INTERVAL '3 days',
      'pending'
    FROM public.cases c
    WHERE c.current_stage = 'Completed'
      AND (
        c.crm_last_health_check_at IS NULL
        OR c.crm_last_health_check_at <= NOW() - INTERVAL '90 days'
      )
      -- Don't create if there's already a pending health check for this case
      AND NOT EXISTS (
        SELECT 1 FROM public.erp_tasks t
        WHERE t.case_id = c.case_id
          AND t.task_type = 'crm_health_check'
          AND t.status IN ('pending', 'in_progress')
      );
  $$
);

NOTIFY pgrst, 'reload schema';
