-- Drop the old constraint that only allowed strict statuses without draft
ALTER TABLE public.quotations 
  DROP CONSTRAINT IF EXISTS quotations_status_check;

-- Add the new constraint covering both strict statuses and 'draft' / lowercase versions
ALTER TABLE public.quotations 
  ADD CONSTRAINT quotations_status_check 
  CHECK (status IN ('Submitted', 'Processing', 'Registration Completed', 'Approved', 'Rejected', 'draft', 'submitted', 'processing', 'approved', 'rejected'));
