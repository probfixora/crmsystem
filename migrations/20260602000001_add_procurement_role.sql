-- ============================================================
-- Migration: 20260602000001_add_procurement_role.sql
-- Purpose:   Add 'procurement' department role to profiles check constraint.
--            Fully additive — existing users and roles are unaffected.
-- Rollback:  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
--            ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
--              CHECK (role IN ('admin','sales','registration','banking','inventory',
--                              'field_installation','electrical','technical',
--                              'accounts','customer_service','subsidy'));
-- ============================================================

-- Step 1: Drop the existing role check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Step 2: Re-add constraint including 'procurement'
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'admin',
    'sales',
    'registration',
    'banking',
    'inventory',
    'procurement',         -- NEW: Procurement Department
    'field_installation',
    'electrical',
    'technical',
    'accounts',
    'customer_service',
    'subsidy'
  ));

NOTIFY pgrst, 'reload schema';
