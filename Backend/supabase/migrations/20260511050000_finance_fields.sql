-- Add new tracking fields to the cases table for the Finance Department Module
ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS bank_visited_date DATE,
ADD COLUMN IF NOT EXISTS finance_form_status TEXT,
ADD COLUMN IF NOT EXISTS finance_final_status TEXT,
ADD COLUMN IF NOT EXISTS disbursement_details TEXT;

-- Notify PostgREST to reload the schema cache so the new columns are immediately available
NOTIFY pgrst, 'reload schema';
