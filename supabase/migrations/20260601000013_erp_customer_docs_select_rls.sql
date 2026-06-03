-- ============================================================
-- Migration: 20260601000013_erp_customer_docs_select_rls.sql
-- Purpose:   Allow authenticated users to read customer_uploaded_docs
-- ============================================================

CREATE POLICY "Authenticated users can read customer docs"
ON public.customer_uploaded_docs
FOR SELECT
TO authenticated
USING (true);

-- Reload schema
NOTIFY pgrst, 'reload schema';
