-- Add system_specs and documents columns to the cases table
-- These might have been added to 001_schema.sql after it was already applied.

ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS system_specs JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '{}'::jsonb;

-- Force postgREST schema cache reload
NOTIFY pgrst, 'reload schema';
