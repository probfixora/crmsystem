-- ============================================================
-- Migration: 20260601000009_erp_procurement_b2b.sql
-- Purpose:   Add columns for separating B2B and B2C dispatches
--            in inventory transactions.
-- ============================================================

-- Add dispatch_type to transactions to distinguish B2B vs B2C
ALTER TABLE public.inventory_transactions
  ADD COLUMN IF NOT EXISTS dispatch_type TEXT DEFAULT 'b2c' CHECK (dispatch_type IN ('b2b', 'b2c', 'manual_adjustment')),
  ADD COLUMN IF NOT EXISTS b2b_client_name TEXT DEFAULT '';

-- Update the existing transactions if any exist to be 'b2c' by default
UPDATE public.inventory_transactions
SET dispatch_type = 'b2c'
WHERE transaction_type = 'stock_out' AND dispatch_type IS NULL;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
