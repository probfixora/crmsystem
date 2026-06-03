-- ============================================================
-- Migration: 20260601000014_erp_customer_docs_upload_status.sql
-- Purpose:   Add documents_uploaded_at to tokens table
-- ============================================================

ALTER TABLE public.customer_portal_tokens
ADD COLUMN IF NOT EXISTS documents_uploaded_at TIMESTAMPTZ;

-- Reload schema
NOTIFY pgrst, 'reload schema';
