-- ============================================================
-- Migration: 20260601000007_erp_inventory_extended.sql
-- Purpose:   Add extended fields to inventory table for the
--            Comprehensive Inventory Management Module.
-- ============================================================

-- Add new columns to the public.inventory table
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS brand TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS model_number TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS hsn_code TEXT DEFAULT '',
  
  -- Stock & Location Info
  ADD COLUMN IF NOT EXISTS reserved_quantity NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS warehouse_location TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS rack_number TEXT DEFAULT '',
  
  -- Purchase Info
  ADD COLUMN IF NOT EXISTS selling_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplier_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS supplier_contact TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS supplier_email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS purchase_date TIMESTAMPTZ,
  
  -- Specifications
  ADD COLUMN IF NOT EXISTS capacity TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS warranty_period TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS technical_specs TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
  
  -- Document URLs
  ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS warranty_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS datasheet_url TEXT DEFAULT '';

-- Create a storage bucket for inventory documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('inventory', 'inventory', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for inventory bucket
CREATE POLICY "Public Access to inventory bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'inventory');

CREATE POLICY "Authenticated users can upload to inventory bucket"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'inventory' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update inventory bucket"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'inventory' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete from inventory bucket"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'inventory' AND auth.role() = 'authenticated');

-- Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
