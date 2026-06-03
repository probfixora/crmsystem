-- ============================================================
-- Migration: 20260601000001_erp_new_roles.sql
-- Purpose:   Add new ERP department roles and bypass permissions.
--            Fully additive — existing users and roles are unaffected.
-- Rollback:  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
--            ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
--              CHECK (role IN ('admin','sales','registration','banking','inventory','field_installation','subsidy'));
--            ALTER TABLE public.profiles DROP COLUMN IF EXISTS bypass_permissions;
-- ============================================================

-- Step 1: Drop the existing strict role check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Step 2: Add updated constraint with all 11 ERP roles
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'admin',
    'sales',
    'registration',
    'banking',
    'inventory',
    'field_installation',
    'electrical',          -- NEW: Electricity Department
    'technical',           -- NEW: Technical Service / QA
    'accounts',            -- NEW: Accounts Department
    'customer_service',    -- NEW: Customer Service / CRM
    'subsidy'
  ));

-- Step 3: Add bypass_permissions JSONB column (stores granted bypass flags per user)
-- Example value: {"utility_status_bypass": true, "stage_skip": ["banking"]}
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bypass_permissions JSONB DEFAULT '{}'::jsonb;

-- Step 4: Add employee_id column if not already present
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS employee_id TEXT DEFAULT '';

-- Step 5: Create index for faster bypass permission lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

NOTIFY pgrst, 'reload schema';
