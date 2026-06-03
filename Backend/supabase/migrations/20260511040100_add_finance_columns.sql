-- Add missing finance tracking fields to the cases table

ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS cash_amount NUMERIC,
ADD COLUMN IF NOT EXISTS payment_mode TEXT;
