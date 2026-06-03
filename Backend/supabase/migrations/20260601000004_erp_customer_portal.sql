-- ============================================================
-- Migration: 20260601000004_erp_customer_portal.sql
-- Purpose:   Customer portal token system and uploaded documents.
--            Fully additive — no existing tables modified.
-- ============================================================

-- ── Customer Portal Tokens ────────────────────────────────────────────────────
-- Secure, time-limited tokens for customer approval links
CREATE TABLE IF NOT EXISTS public.customer_portal_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         TEXT NOT NULL,
  quotation_id    TEXT DEFAULT '',
  token           TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  used_at         TIMESTAMPTZ,              -- NULL = unused, set when customer opens portal
  approved_at     TIMESTAMPTZ,             -- NULL = not yet approved
  declined_at     TIMESTAMPTZ,             -- NULL = not yet declined
  customer_email  TEXT NOT NULL DEFAULT '',
  customer_name   TEXT DEFAULT '',
  created_by      TEXT DEFAULT '',         -- Sales person who sent the link
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_tokens_token
  ON public.customer_portal_tokens (token);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_case_id
  ON public.customer_portal_tokens (case_id);

-- ── Customer Uploaded Documents ───────────────────────────────────────────────
-- Documents uploaded by the customer through their portal
CREATE TABLE IF NOT EXISTS public.customer_uploaded_docs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         TEXT NOT NULL,
  portal_token    TEXT DEFAULT '',         -- which token session uploaded this
  doc_name        TEXT NOT NULL,           -- document label e.g. "Electricity Bill"
  doc_url         TEXT NOT NULL,           -- Supabase Storage public URL
  doc_type        TEXT DEFAULT 'residential',
                                           -- 'residential' | 'commercial' | 'industrial' | 'compliance'
  uploaded_at     TIMESTAMPTZ DEFAULT NOW(),
  verified        BOOLEAN DEFAULT FALSE,
  verified_by     TEXT DEFAULT '',
  verified_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_customer_docs_case_id
  ON public.customer_uploaded_docs (case_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.customer_portal_tokens  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_uploaded_docs  ENABLE ROW LEVEL SECURITY;

-- Customer portal tokens are validated by Edge Functions using service_role
-- No direct client access needed

-- Storage bucket for customer portal uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-docs', 'customer-docs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read customer docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'customer-docs');

CREATE POLICY "Public can upload customer docs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'customer-docs');

NOTIFY pgrst, 'reload schema';
