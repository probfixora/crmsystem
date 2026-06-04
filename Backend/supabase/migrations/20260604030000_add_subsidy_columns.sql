-- Fix for Subsidy Department: Add missing columns and rename existing ones if necessary

-- 1. Add the missing reference number column
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS subsidy_ref_number TEXT DEFAULT '';

-- 2. Check if subsidy_note exists. If not, check if subsidy_notes exists.
-- If subsidy_notes exists, rename it to subsidy_note.
-- If neither exists, create subsidy_note.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'cases' AND column_name = 'subsidy_notes'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'cases' AND column_name = 'subsidy_note'
  ) THEN
    ALTER TABLE public.cases RENAME COLUMN subsidy_notes TO subsidy_note;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'cases' AND column_name = 'subsidy_note'
  ) THEN
    ALTER TABLE public.cases ADD COLUMN subsidy_note TEXT DEFAULT '';
  END IF;
END $$;

-- 3. Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
