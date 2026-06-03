-- ============================================================
-- Migration: 20260601000008_erp_inventory_rls.sql
-- Purpose:   Add RLS policies for inventory tables to allow inserts
-- ============================================================

-- Enable RLS just in case it's not enabled
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts (optional, but good for idempotency)
DROP POLICY IF EXISTS "Enable read access for all" ON public.inventory;
DROP POLICY IF EXISTS "Enable insert for all" ON public.inventory;
DROP POLICY IF EXISTS "Enable update for all" ON public.inventory;
DROP POLICY IF EXISTS "Enable delete for all" ON public.inventory;

DROP POLICY IF EXISTS "Enable read access for all transactions" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Enable insert for all transactions" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Enable update for all transactions" ON public.inventory_transactions;

DROP POLICY IF EXISTS "Enable read access for all reservations" ON public.inventory_reservations;
DROP POLICY IF EXISTS "Enable insert for all reservations" ON public.inventory_reservations;
DROP POLICY IF EXISTS "Enable update for all reservations" ON public.inventory_reservations;
DROP POLICY IF EXISTS "Enable delete for all reservations" ON public.inventory_reservations;

-- Inventory policies
CREATE POLICY "Enable read access for all" ON public.inventory FOR SELECT USING (true);
CREATE POLICY "Enable insert for all" ON public.inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all" ON public.inventory FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all" ON public.inventory FOR DELETE USING (true);

-- Transactions policies
CREATE POLICY "Enable read access for all transactions" ON public.inventory_transactions FOR SELECT USING (true);
CREATE POLICY "Enable insert for all transactions" ON public.inventory_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all transactions" ON public.inventory_transactions FOR UPDATE USING (true);

-- Reservations policies
CREATE POLICY "Enable read access for all reservations" ON public.inventory_reservations FOR SELECT USING (true);
CREATE POLICY "Enable insert for all reservations" ON public.inventory_reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all reservations" ON public.inventory_reservations FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all reservations" ON public.inventory_reservations FOR DELETE USING (true);

NOTIFY pgrst, 'reload schema';
