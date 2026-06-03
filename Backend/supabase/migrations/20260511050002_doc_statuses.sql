ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS document_statuses JSONB DEFAULT '{}'::jsonb;

NOTIFY pgrst, 'reload schema';
