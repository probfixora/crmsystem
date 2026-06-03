-- ============================================================
-- Migration: 20260601000012_erp_customer_portal_cases_rls.sql
-- Purpose:   Allow public access to specific rows in cases/quotations via token
-- ============================================================

-- Allow anonymous select on cases if there is a portal token
CREATE POLICY "Public can view cases with token"
ON public.cases
FOR SELECT
TO public, anon
USING (
  EXISTS (
    SELECT 1 FROM public.customer_portal_tokens cpt 
    WHERE cpt.case_id = cases.case_id
  )
);

-- Allow anonymous select on quotations if there is a portal token
CREATE POLICY "Public can view quotations with token"
ON public.quotations
FOR SELECT
TO public, anon
USING (
  EXISTS (
    SELECT 1 FROM public.customer_portal_tokens cpt 
    WHERE cpt.quotation_id = quotations.quotation_id
  )
);

-- Allow anonymous insert into case_history (for document upload logs)
CREATE POLICY "Public can insert case history"
ON public.case_history
FOR INSERT
TO public, anon
WITH CHECK (true);

-- Reload schema
NOTIFY pgrst, 'reload schema';
