-- Drop existing foreign key constraints
ALTER TABLE public.cases DROP CONSTRAINT IF EXISTS cases_created_by_fkey;
ALTER TABLE public.quotations DROP CONSTRAINT IF EXISTS quotations_created_by_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_recipient_id_fkey;

-- Add new foreign key constraints with ON DELETE rules
ALTER TABLE public.cases 
  ADD CONSTRAINT cases_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.quotations 
  ADD CONSTRAINT quotations_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.notifications 
  ADD CONSTRAINT notifications_recipient_id_fkey 
  FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE;
