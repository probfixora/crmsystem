-- ============================================================
-- MASTER MIGRATION: Full Probfixora CRM Workflow Fix
-- Run this ONCE in Supabase SQL Editor
-- Covers: Storage, Status Constraints, Workflow Stages,
--         Documents, and Full Pipeline Support
-- ============================================================

-- ─── STEP 1: Fix quotations_status_check constraint ─────────
-- Update any existing lowercase statuses to Title Case
UPDATE public.quotations SET status = 'Submitted'  WHERE status = 'submitted';
UPDATE public.quotations SET status = 'Processing'  WHERE status = 'processing';
UPDATE public.quotations SET status = 'Approved'    WHERE status = 'approved';
UPDATE public.quotations SET status = 'Rejected'    WHERE status = 'rejected';

-- Drop all old/broken constraint versions
ALTER TABLE public.quotations DROP CONSTRAINT IF EXISTS quotations_status_check;

-- Add the correct constraint
ALTER TABLE public.quotations
  ADD CONSTRAINT quotations_status_check
  CHECK (status IN (
    'draft',
    'Submitted',
    'Processing',
    'Registration Completed',
    'Approved',
    'Rejected'
  ));

-- ─── STEP 2: Fix current_department constraint ──────────────
ALTER TABLE public.quotations DROP CONSTRAINT IF EXISTS quotations_current_department_check;

ALTER TABLE public.quotations
  ADD CONSTRAINT quotations_current_department_check
  CHECK (current_department IN ('Sales','Registration','Banking','Store','Installation','Electrical','Subsidy','Accounts','Technical','Customer Service'));

-- ─── STEP 3: Ensure documents JSONB column exists ───────────
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS customer_occupation TEXT DEFAULT 'Job/Service';

-- ─── STEP 4: Fix Storage Bucket — 'documents' (lowercase) ───
-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop old policies if they exist and recreate cleanly
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public viewing" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;

-- Allow anyone to view documents
CREATE POLICY "documents_public_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');

-- Allow authenticated users to upload
CREATE POLICY "documents_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

-- Allow authenticated users to update/replace
CREATE POLICY "documents_auth_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

-- ─── STEP 5: Fix cases table workflow stages ─────────────────
-- Ensure the full pipeline workflow stages are valid in cases table
ALTER TABLE public.cases DROP CONSTRAINT IF EXISTS cases_status_check;
ALTER TABLE public.cases
  ADD CONSTRAINT cases_status_check
  CHECK (status IN ('In Progress','Completed','Delayed'));

-- Update current_stage constraint to allow all pipeline stages
ALTER TABLE public.cases DROP CONSTRAINT IF EXISTS cases_current_stage_check;
-- (No constraint on current_stage — it's a free-text field, stages are tracked in case_history)

-- ─── STEP 6: Add missing columns to cases table ─────────────
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS document_statuses JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS quotation_id TEXT DEFAULT '';
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS kw_capacity NUMERIC DEFAULT 0;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS panel_brand TEXT DEFAULT '';
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS inverter_brand TEXT DEFAULT '';
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS installation_type TEXT DEFAULT '';
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS meter_number TEXT DEFAULT '';
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS plant_activation_date DATE;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS qc_status TEXT DEFAULT '';
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS qc_notes TEXT DEFAULT '';
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS payment_amount NUMERIC;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS payment_verified_by TEXT DEFAULT '';
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS subsidy_amount NUMERIC;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS subsidy_status TEXT DEFAULT '';
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS subsidy_notes TEXT DEFAULT '';
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS project_completed_at TIMESTAMPTZ;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS completed_by TEXT DEFAULT '';
-- Critical columns used by the edge function (send_to_registration action)
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS customer_id TEXT DEFAULT '';
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS tracking_id TEXT DEFAULT '';
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS reference TEXT DEFAULT '';  -- stores quotation_id

-- ─── STEP 7: Ensure profiles role constraint covers all departments ─
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'admin',
    'sales',
    'registration',
    'banking',
    'store',
    'installation',
    'electrical',
    'technical',
    'accounts',
    'subsidy',
    'customer_service'
  ));

-- ─── STEP 8: Add missing audit / action types ────────────────
ALTER TABLE public.case_history ADD COLUMN IF NOT EXISTS action_type TEXT NOT NULL DEFAULT 'stage_update';
ALTER TABLE public.case_history ADD COLUMN IF NOT EXISTS department TEXT DEFAULT ''; -- used by edge function

-- ─── STEP 9: Ensure case_portal_tokens table exists ──────────
CREATE TABLE IF NOT EXISTS public.customer_portal_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token           UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  quotation_id    TEXT NOT NULL,
  customer_email  TEXT NOT NULL,
  customer_name   TEXT NOT NULL,
  created_by      TEXT DEFAULT 'Sales Team',
  case_id         TEXT,
  expires_at      TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  used_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Make case_id nullable (it's set after case creation)
ALTER TABLE public.customer_portal_tokens
  ALTER COLUMN case_id DROP NOT NULL;

-- ─── STEP 10: Add Indexes for performance ───────────────────
CREATE INDEX IF NOT EXISTS idx_cases_quotation_id     ON public.cases (quotation_id);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_team    ON public.cases (assigned_team);
CREATE INDEX IF NOT EXISTS idx_quotations_status      ON public.quotations (status);
CREATE INDEX IF NOT EXISTS idx_quotations_department  ON public.quotations (current_department);

-- ─── FINAL: Reload PostgREST schema cache ───────────────────
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- SUCCESS: All workflow constraints and storage policies fixed.
-- Your pipeline is now:
--   Sales → Registration → Banking → Store → Installation →
--   Electrical → Installation (Plant) → Technical (QC) →
--   Accounts → Subsidy → Completed → Customer Service
-- ============================================================
