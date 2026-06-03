-- ============================================================
-- Migration: 20260601000011_erp_customer_portal_rls.sql
-- Purpose:   Allow public access to customer portal tables via token
-- ============================================================

-- Allow anonymous select on tokens (needed for validation)
CREATE POLICY "Public can view token by token string"
ON public.customer_portal_tokens
FOR SELECT
TO public, anon
USING (true);

-- Allow anonymous update on tokens (needed for marking used_at, approved_at)
CREATE POLICY "Public can update token"
ON public.customer_portal_tokens
FOR UPDATE
TO public, anon
USING (true);

-- Allow anonymous insert into customer_uploaded_docs
CREATE POLICY "Public can insert uploaded docs"
ON public.customer_uploaded_docs
FOR INSERT
TO public, anon
WITH CHECK (true);

-- Allow anonymous update on quotations (to update status if needed)
-- Note: quotation status is usually updated via Edge Function, but just in case
-- we leave it secure.

-- Need to reload schema cache
NOTIFY pgrst, 'reload schema';
