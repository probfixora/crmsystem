-- Update existing profiles that might be using the old role names
UPDATE public.profiles
SET role = 'inventory'
WHERE role = 'store';

UPDATE public.profiles
SET role = 'field_installation'
WHERE role IN ('installation', 'electrical', 'engineer');

-- Drop the old CHECK constraint
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add the new strict CHECK constraint for the exact 7 roles
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('admin', 'sales', 'registration', 'banking', 'inventory', 'field_installation', 'subsidy'));
