-- ============================================================
-- Migration: 20260601000010_erp_quotation_approval.sql
-- Purpose:   Make case_id nullable for customer_portal_tokens
-- ============================================================

ALTER TABLE public.customer_portal_tokens
  ALTER COLUMN case_id DROP NOT NULL;
