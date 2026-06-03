-- Add missing fields for Banking and Finance
ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS cash_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT '';
