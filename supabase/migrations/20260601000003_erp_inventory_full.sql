-- ============================================================
-- Migration: 20260601000003_erp_inventory_full.sql
-- Purpose:   Full inventory management system — transactions,
--            reservations, and admin wattage mapping table.
--            Fully additive.
-- ============================================================

-- ── Add initial_stock tracking to existing inventory table ────────────────────
-- initial_stock stores the stock level at the time of first entry
-- Used to calculate % remaining for low-stock alerts (30% threshold)
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS initial_stock    NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_audit_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes            TEXT DEFAULT '';

-- Backfill: set initial_stock = current stock for all existing rows
UPDATE public.inventory
SET initial_stock = stock
WHERE initial_stock = 0 AND stock > 0;

-- ── Inventory Transactions Ledger ─────────────────────────────────────────────
-- Complete audit trail of every stock movement
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id     UUID REFERENCES public.inventory(id) ON DELETE CASCADE,
  inventory_name   TEXT DEFAULT '',
  case_id          TEXT DEFAULT '',
  transaction_type TEXT NOT NULL
                     CHECK (transaction_type IN (
                       'stock_in',      -- new stock received
                       'stock_out',     -- stock dispatched/consumed
                       'adjustment',    -- manual correction
                       'reservation',   -- stock reserved for a case
                       'release',       -- reservation released
                       'audit'          -- audit reconciliation
                     )),
  quantity         NUMERIC NOT NULL,   -- positive = in, negative = out
  stock_before     NUMERIC DEFAULT 0,  -- stock level before this transaction
  stock_after      NUMERIC DEFAULT 0,  -- stock level after this transaction
  notes            TEXT DEFAULT '',
  created_by       TEXT DEFAULT '',
  created_by_role  TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_tx_inventory_id
  ON public.inventory_transactions (inventory_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_tx_case_id
  ON public.inventory_transactions (case_id)
  WHERE case_id != '';
CREATE INDEX IF NOT EXISTS idx_inv_tx_type
  ON public.inventory_transactions (transaction_type, created_at DESC);

-- ── Inventory Reservations ────────────────────────────────────────────────────
-- Tracks stock reserved per case — prevents double-dispatch
CREATE TABLE IF NOT EXISTS public.inventory_reservations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         TEXT NOT NULL,
  inventory_id    UUID REFERENCES public.inventory(id) ON DELETE CASCADE,
  inventory_name  TEXT DEFAULT '',
  quantity        NUMERIC NOT NULL,
  status          TEXT NOT NULL DEFAULT 'reserved'
                    CHECK (status IN ('reserved','consumed','released')),
  reserved_at     TIMESTAMPTZ DEFAULT NOW(),
  consumed_at     TIMESTAMPTZ,
  released_at     TIMESTAMPTZ,
  created_by      TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_inv_res_case_id
  ON public.inventory_reservations (case_id, status);
CREATE INDEX IF NOT EXISTS idx_inv_res_status
  ON public.inventory_reservations (status);

-- ── Admin Wattage Mapping Table ───────────────────────────────────────────────
-- Allows admins to define kW → Watt conversion rules globally.
-- All generation reports and panel wattage calculations use these mappings.
CREATE TABLE IF NOT EXISTS public.wattage_mappings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kw_value     NUMERIC NOT NULL,
  watt_value   NUMERIC NOT NULL,
  label        TEXT DEFAULT '',     -- optional display label e.g. "3kW Standard"
  is_active    BOOLEAN DEFAULT TRUE,
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wattage_mappings_kw
  ON public.wattage_mappings (kw_value)
  WHERE is_active = TRUE;

-- Auto-update updated_at
CREATE TRIGGER wattage_mappings_updated_at
  BEFORE UPDATE ON public.wattage_mappings
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ── Seed default wattage mappings ─────────────────────────────────────────────
INSERT INTO public.wattage_mappings (kw_value, watt_value, label, is_active)
VALUES
  (1,  1100,  '1kW System',  TRUE),
  (2,  2200,  '2kW System',  TRUE),
  (3,  3300,  '3kW System',  TRUE),
  (4,  4400,  '4kW System',  TRUE),
  (5,  5500,  '5kW System',  TRUE),
  (6,  6600,  '6kW System',  TRUE),
  (7,  7700,  '7kW System',  TRUE),
  (8,  8800,  '8kW System',  TRUE),
  (10, 11000, '10kW System', TRUE),
  (15, 16500, '15kW System', TRUE),
  (20, 22000, '20kW System', TRUE),
  (25, 27500, '25kW System', TRUE),
  (50, 55000, '50kW System', TRUE)
ON CONFLICT DO NOTHING;

-- ── RLS for new tables ────────────────────────────────────────────────────────
ALTER TABLE public.inventory_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_reservations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wattage_mappings        ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read wattage mappings (needed by forms)
CREATE POLICY "Authenticated can read wattage mappings"
  ON public.wattage_mappings FOR SELECT
  USING (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
