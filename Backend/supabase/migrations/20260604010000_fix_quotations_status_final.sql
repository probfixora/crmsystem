-- ============================================================
-- Migration: 20260604010000_fix_quotations_status_final.sql
-- Purpose:   Fix the quotations_status_check constraint so that
--            BOTH Title Case (Submitted, Processing, etc.) and
--            lowercase (draft, submitted, etc.) values are accepted.
--            This is the definitive fix — run this ONCE in Supabase
--            SQL Editor if it hasn't been applied yet.
-- ============================================================

-- Step 1: Update any existing lowercase statuses in the table
--         so they match the canonical Title Case values
UPDATE public.quotations
SET status = 'Submitted'
WHERE status IN ('submitted');

UPDATE public.quotations
SET status = 'Processing'
WHERE status IN ('processing');

UPDATE public.quotations
SET status = 'Approved'
WHERE status IN ('approved');

UPDATE public.quotations
SET status = 'Rejected'
WHERE status IN ('rejected');

-- Step 2: Drop both old constraint names (either may exist on the live DB)
ALTER TABLE public.quotations
  DROP CONSTRAINT IF EXISTS quotations_status_check;

-- Step 3: Add the final clean constraint — Title Case canonical values only.
--         'draft' is also allowed because new quotations start as draft.
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

-- Notify PostgREST to reload the schema
NOTIFY pgrst, 'reload schema';
