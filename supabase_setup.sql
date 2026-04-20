-- ═══════════════════════════════════════════════════════════════
-- KASPER LOGISTICS — SUPABASE SCHEMA
-- Run this entire file in: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════

-- Drop existing table if re-running (CAREFUL in production)
-- DROP TABLE IF EXISTS jobs;

CREATE TABLE IF NOT EXISTS jobs (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  job_code          TEXT        UNIQUE NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'enquiry',
  service_type      TEXT        NOT NULL, -- 'equipment' | 'logistics'

  -- Client contact (added to booking form)
  client_name       TEXT,
  client_phone      TEXT,
  client_email      TEXT,
  company_name      TEXT,

  -- Equipment booking fields
  equipment_type    TEXT,
  duration          TEXT,
  start_date        DATE,
  emirate           TEXT,
  site_address      TEXT,

  -- Logistics booking fields
  origin            TEXT,
  destination       TEXT,
  cargo_type        TEXT,
  pickup_date       DATE,

  -- Ops: quote
  quoted_price      NUMERIC,
  quote_notes       TEXT,
  quote_sent_at     TIMESTAMPTZ,

  -- Client: approval
  approval_timestamp TIMESTAMPTZ,

  -- Ops: driver assignment
  driver_name       TEXT,
  driver_phone      TEXT,
  vehicle_plate     TEXT,
  traccar_link      TEXT,

  -- Live GPS tracking (from driver's phone)
  driver_lat        DOUBLE PRECISION,
  driver_lng        DOUBLE PRECISION,
  driver_location_updated_at TIMESTAMPTZ,

  -- ePOD
  epod_driver_done  BOOLEAN     DEFAULT false,
  epod_client_done  BOOLEAN     DEFAULT false,
  epod_client_link  TEXT,
  epod_photo_url    TEXT,
  epod_notes        TEXT,
  epod_timestamp    TIMESTAMPTZ,

  -- Finance
  invoice_url       TEXT,
  payment_status    TEXT        DEFAULT 'unpaid',

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Auto-update updated_at ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS jobs_updated_at ON jobs;
CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Row Level Security ───────────────────────────────────────────
-- For prototype: allow all with anon key.
-- For production: restrict PATCH/DELETE to authenticated ops users.
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read" ON jobs;
CREATE POLICY "Public read"
  ON jobs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert" ON jobs;
CREATE POLICY "Public insert"
  ON jobs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update" ON jobs;
CREATE POLICY "Public update"
  ON jobs FOR UPDATE USING (true) WITH CHECK (true);

-- ── Sample seed data (optional — delete before go-live) ─────────
INSERT INTO jobs (job_code, status, service_type, client_name, client_phone, client_email, company_name,
  origin, destination, cargo_type, pickup_date, quoted_price, driver_name, vehicle_plate)
VALUES
  ('KSP-20260419-0042', 'in_transit', 'logistics', 'Ahmed Al Rashidi', '050 123 4567', 'ahmed@alhamd.ae',
   'Al Hamd Construction LLC', 'Khor Fakkan Port, Gate 3', 'Al Quoz Industrial, Dubai', 'container',
   '2026-04-19', 1200, 'Kareem Al Sayed', 'Dubai A 12345'),
  ('KSP-20260419-0039', 'assigned', 'equipment', 'Mohammed Hassan', '055 987 6543', 'mh@gulfsteel.ae',
   'Gulf Steel Industries', NULL, NULL, NULL, '2026-04-19', 5400, 'Sanjay Kumar', 'Abu Dhabi B 54321'),
  ('KSP-20260419-0035', 'epod_pending', 'logistics', 'Ali Al Mansoori', '056 111 2222', 'ali@emiratescement.ae',
   'Emirates Cement Co.', 'Fujairah Port', 'Mussafah Industrial, Abu Dhabi', 'materials',
   '2026-04-18', 950, NULL, NULL);
