-- ═══════════════════════════════════════════════════════════════
-- KASPER OS — Phase 1: Vendor Marketplace Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- 
-- This migration is NON-DESTRUCTIVE. All new columns are nullable.
-- Existing jobs, vendors, and workflows continue to work unchanged.
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1. New table: vendor_rfqs
--    One row per vendor per RFQ broadcast.
--    Lifecycle: sent → quoted → accepted | rejected | expired
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendor_rfqs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  vendor_id       UUID        NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  status          TEXT        NOT NULL DEFAULT 'sent',
  -- ↑ sent = waiting for vendor | quoted = vendor responded | accepted = ops picked this vendor | rejected = not selected | expired
  vendor_price    NUMERIC,
  vendor_notes    TEXT,
  sent_at         TIMESTAMPTZ DEFAULT NOW(),
  quoted_at       TIMESTAMPTZ,
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent duplicate RFQs to the same vendor for the same job
  UNIQUE(job_id, vendor_id)
);

-- Auto-update updated_at on vendor_rfqs
CREATE OR REPLACE FUNCTION update_vendor_rfqs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vendor_rfqs_updated_at ON vendor_rfqs;
CREATE TRIGGER vendor_rfqs_updated_at
  BEFORE UPDATE ON vendor_rfqs
  FOR EACH ROW EXECUTE FUNCTION update_vendor_rfqs_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 2. Add marketplace columns to jobs table
-- ─────────────────────────────────────────────────────────────

-- The vendor who WON the RFQ and is executing this job
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS vendor_id_assigned UUID REFERENCES vendors(id);

-- Kasper's buy price (what we pay the vendor)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS vendor_price NUMERIC;

-- Has Kasper issued the purchase order to the vendor?
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS vendor_po_sent BOOLEAN DEFAULT false;

-- Kasper's margin = what client pays minus what we pay vendor
-- Using a regular column instead of GENERATED ALWAYS AS because
-- Supabase REST API can't insert/update rows with generated columns easily.
-- We'll compute this in the application layer instead.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS kasper_margin NUMERIC;


-- ─────────────────────────────────────────────────────────────
-- 3. RLS for vendor_rfqs (permissive for MVP)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE vendor_rfqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read rfqs" ON vendor_rfqs;
CREATE POLICY "Public read rfqs"
  ON vendor_rfqs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert rfqs" ON vendor_rfqs;
CREATE POLICY "Public insert rfqs"
  ON vendor_rfqs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update rfqs" ON vendor_rfqs;
CREATE POLICY "Public update rfqs"
  ON vendor_rfqs FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public delete rfqs" ON vendor_rfqs;
CREATE POLICY "Public delete rfqs"
  ON vendor_rfqs FOR DELETE USING (true);

-- ─────────────────────────────────────────────────────────────
-- 4. Enable Realtime on vendor_rfqs
-- ─────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE vendor_rfqs;

-- ─────────────────────────────────────────────────────────────
-- 5. Seed: Add more vendor companies for demo
-- ─────────────────────────────────────────────────────────────
INSERT INTO vendors (id, company_name, logo_text, brand_color, contact_phone, contact_email)
VALUES
  ('33333333-3333-3333-3333-333333333333', 'Gulf Express Transport', '🚛 GULF EXPRESS', '#F59E0B', '+971504500001', 'ops@gulfexpress.ae'),
  ('44444444-4444-4444-4444-444444444444', 'RAK Heavy Movers', '⚙ RAK MOVERS', '#8B5CF6', '+971507700002', 'dispatch@rakmovers.ae'),
  ('55555555-5555-5555-5555-555555555555', 'Sharjah Crane Services', '🏗 SCS', '#EC4899', '+971509900003', 'book@scs.ae')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- STATUS PIPELINE (updated for marketplace):
-- enquiry → rfq_sent → quoted → po_pending → confirmed 
--   → vendor_po_sent → assigned → in_transit → delivered 
--   → epod_pending → invoiced → paid
--
-- New states:
--   rfq_sent       = RFQs broadcast to vendors, waiting for quotes
--   vendor_po_sent = Client approved, vendor PO issued, waiting for driver assignment
-- ═══════════════════════════════════════════════════════════════
