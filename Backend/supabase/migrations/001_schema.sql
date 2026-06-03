-- ============================================================
-- RBSC Solar CRM — Full Supabase PostgreSQL Schema
-- Run this in your Supabase project's SQL Editor
-- ============================================================

-- ─── Profiles (mirrors auth.users, stores role/status) ────
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name            TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'sales'
                    CHECK (role IN ('admin','sales','registration','banking','store','installation','electrical','subsidy')),
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','inactive')),
  is_first_login  BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ─── Cases ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cases (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id               TEXT UNIQUE,
  customer_name         TEXT NOT NULL,
  phone                 TEXT NOT NULL,
  alternate_phone       TEXT DEFAULT '',
  email                 TEXT DEFAULT '',
  address               TEXT NOT NULL,
  site_address          TEXT DEFAULT '',
  aadhaar               TEXT DEFAULT '',
  pan                   TEXT DEFAULT '',
  connection_type       TEXT DEFAULT '',
  existing_load         NUMERIC DEFAULT 0,
  load_required         NUMERIC NOT NULL,
  payment_type          TEXT NOT NULL CHECK (payment_type IN ('loan','cash')),
  sales_person          TEXT DEFAULT '',
  current_stage         TEXT NOT NULL DEFAULT 'Registration Done',
  status                TEXT NOT NULL DEFAULT 'In Progress'
                          CHECK (status IN ('In Progress','Completed','Delayed')),
  priority              TEXT DEFAULT 'normal' CHECK (priority IN ('normal','urgent')),
  delay_reason          TEXT DEFAULT '',
  marked_delayed_by     TEXT DEFAULT '',
  marked_delayed_at     TIMESTAMPTZ,
  created_by            UUID REFERENCES auth.users(id),
  assigned_team         TEXT DEFAULT 'Sales',
  assigned_to           TEXT DEFAULT '',
  stage_start_time      TIMESTAMPTZ DEFAULT NOW(),
  handoff_note          TEXT DEFAULT '',
  loan_amount           NUMERIC,
  bank_name             TEXT DEFAULT '',
  emi_amount            NUMERIC,
  down_payment          NUMERIC,
  finance_notes         TEXT DEFAULT '',
  banking_status        TEXT DEFAULT '',
  electrical_status     TEXT DEFAULT '',
  site_visit_date       DATE,
  installation_note     TEXT DEFAULT '',
  installation_status   TEXT DEFAULT '',
  subsidy_ref_number    TEXT DEFAULT '',
  subsidy_phase1_amount NUMERIC,
  subsidy_phase1_date   DATE,
  subsidy_phase2_amount NUMERIC,
  subsidy_phase2_date   DATE,
  subsidy_note          TEXT DEFAULT '',
  subsidy_status        TEXT DEFAULT '',
  system_specs          JSONB DEFAULT '{}'::jsonb,
  documents             JSONB DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Auto-generate case_id like CASE-0001
CREATE SEQUENCE IF NOT EXISTS case_id_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_case_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.case_id IS NULL THEN
    NEW.case_id := 'CASE-' || LPAD(nextval('case_id_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cases_generate_id
  BEFORE INSERT ON public.cases
  FOR EACH ROW EXECUTE PROCEDURE public.generate_case_id();

-- ─── Case History (Audit Log) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.case_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     TEXT NOT NULL,
  stage       TEXT NOT NULL,
  updated_by  TEXT NOT NULL,
  remarks     TEXT,
  timestamp   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Case Comments ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.case_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id    TEXT NOT NULL,
  text       TEXT NOT NULL,
  author     TEXT NOT NULL,
  role       TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Quotations ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quotations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id        TEXT UNIQUE,
  -- Customer
  customer_name       TEXT NOT NULL,
  customer_mobile     TEXT NOT NULL,
  customer_email      TEXT NOT NULL,
  customer_address    TEXT NOT NULL,
  customer_occupation TEXT DEFAULT 'Salaried',
  documents           JSONB DEFAULT '{}'::jsonb,
  -- Electrical
  electrical_division TEXT NOT NULL,
  electrical_number   TEXT NOT NULL,
  electrical_load     TEXT NOT NULL,
  -- Product / Panels
  product_category    TEXT NOT NULL,
  product_brand       TEXT NOT NULL,
  product_name        TEXT,
  panel_unit          TEXT NOT NULL,
  panel_count         INT NOT NULL,
  total_watt          NUMERIC NOT NULL,
  product_price       NUMERIC NOT NULL,
  panel_warranty      TEXT NOT NULL,
  -- Inverter
  inverter_brand      TEXT NOT NULL,
  inverter_kw         TEXT NOT NULL,
  inverter_warranty   TEXT NOT NULL,
  -- Battery (optional)
  battery_brand       TEXT,
  battery_count       INT DEFAULT 0,
  battery_warranty    TEXT,
  battery_capacity    NUMERIC DEFAULT 0,
  battery_price       NUMERIC DEFAULT 0,
  -- Other
  structure           TEXT NOT NULL,
  bos                 TEXT NOT NULL,
  -- Employee
  employee_id         TEXT NOT NULL,
  employee_name       TEXT NOT NULL,
  employee_email      TEXT NOT NULL,
  -- Workflow
  status              TEXT DEFAULT 'Submitted'
                        CHECK (status IN ('Submitted','Processing','Registration Completed','Approved','Rejected')),
  current_department  TEXT DEFAULT 'Registration'
                        CHECK (current_department IN ('Sales','Registration')),
  pdf_url             TEXT,
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER quotations_updated_at
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Auto-generate quotation_id like QT-0001
CREATE SEQUENCE IF NOT EXISTS quotation_id_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_quotation_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quotation_id IS NULL THEN
    NEW.quotation_id := 'QT-' || LPAD(nextval('quotation_id_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quotations_generate_id
  BEFORE INSERT ON public.quotations
  FOR EACH ROW EXECUTE PROCEDURE public.generate_quotation_id();

-- ─── Notifications ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_role     TEXT DEFAULT 'all',
  recipient_id       UUID REFERENCES auth.users(id),
  title              TEXT NOT NULL,
  message            TEXT NOT NULL,
  type               TEXT DEFAULT 'stage_update',
  related_case_id    TEXT DEFAULT '',
  related_case_name  TEXT DEFAULT '',
  triggered_by       TEXT DEFAULT '',
  is_read            BOOLEAN DEFAULT FALSE,
  read_at            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Inventory ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  category            TEXT NOT NULL,
  sku                 TEXT DEFAULT '',
  description         TEXT DEFAULT '',
  unit                TEXT DEFAULT 'pcs',
  stock               NUMERIC NOT NULL DEFAULT 0,
  reserved            NUMERIC DEFAULT 0,
  low_stock_threshold NUMERIC DEFAULT 10,
  reorder_level       NUMERIC DEFAULT 5,
  unit_price          NUMERIC DEFAULT 0,
  is_active           BOOLEAN DEFAULT TRUE,
  created_by          TEXT DEFAULT '',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ─── Inventory Dispatches ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory_dispatches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id           TEXT NOT NULL,
  customer_name     TEXT DEFAULT '',
  dispatched_by     TEXT NOT NULL,
  dispatched_by_role TEXT DEFAULT 'store',
  dispatch_date     TIMESTAMPTZ DEFAULT NOW(),
  status            TEXT DEFAULT 'Packed'
                      CHECK (status IN ('Packed','Dispatched','Delivered','Returned')),
  vehicle_number    TEXT DEFAULT '',
  driver_name       TEXT DEFAULT '',
  delivery_address  TEXT DEFAULT '',
  notes             TEXT DEFAULT '',
  received_by       TEXT DEFAULT '',
  received_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cases_case_id        ON public.cases (case_id);
CREATE INDEX IF NOT EXISTS idx_cases_status         ON public.cases (status);
CREATE INDEX IF NOT EXISTS idx_cases_current_stage  ON public.cases (current_stage);
CREATE INDEX IF NOT EXISTS idx_case_history_case_id ON public.case_history (case_id);
CREATE INDEX IF NOT EXISTS idx_case_comments_case_id ON public.case_comments (case_id);
CREATE INDEX IF NOT EXISTS idx_quotations_id        ON public.quotations (quotation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_role   ON public.notifications (recipient_role, is_read, created_at DESC);

-- ─── Row Level Security ───────────────────────────────────
-- RLS is enabled; Edge Functions use the service_role key which bypasses RLS.
-- The anon/public key used by the frontend JS client is blocked from direct table access.

ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_history          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_comments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_dispatches  ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow authenticated users to read their notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = recipient_id OR recipient_role = 'all');

-- Block all other direct access — all data goes through Edge Functions (service role)
-- ============================================================

-- ─── Cron Jobs ────────────────────────────────────────────
-- Enable pg_cron extension to allow scheduling background jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule a daily job to delete Rejected quotations older than 7 days
SELECT cron.schedule(
  'delete_rejected_quotations',
  '0 0 * * *', -- Run daily at midnight
  $$
    DELETE FROM public.quotations 
    WHERE status = 'Rejected' 
    AND updated_at < NOW() - INTERVAL '7 days';
  $$
);

-- ─── Storage Buckets ──────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('quotations', 'quotations', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for Documents bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'documents' );

CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'documents' AND auth.role() = 'authenticated' );

-- Policies for Quotations bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'quotations' );

CREATE POLICY "Authenticated users can upload quotations"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'quotations' AND auth.role() = 'authenticated' );
