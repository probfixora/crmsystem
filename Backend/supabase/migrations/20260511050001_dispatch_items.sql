ALTER TABLE public.inventory_dispatches
ADD COLUMN IF NOT EXISTS dispatched_items JSONB DEFAULT '[]'::jsonb;

NOTIFY pgrst, 'reload schema';
