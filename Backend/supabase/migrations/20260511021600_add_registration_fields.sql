-- Add missing fields for Case Registration (Reference, Consumer ID, Pin Code)
ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS reference TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS consumer_id TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS pin_code TEXT DEFAULT '';
