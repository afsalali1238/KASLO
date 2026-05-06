-- ═══════════════════════════════════════════════════════════════
-- KASPER OS — Driver Authentication (PIN-based)
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════

-- 1. Create Drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  phone         TEXT,
  pin           TEXT NOT NULL DEFAULT '1234',
  vehicle_plate TEXT,
  vendor_id     UUID REFERENCES vendors(id),
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Auto-update updated_at
CREATE OR REPLACE FUNCTION update_drivers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS drivers_updated_at ON drivers;
CREATE TRIGGER drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_drivers_updated_at();

-- 3. RLS — open for MVP (same as jobs table)
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read drivers" ON drivers;
CREATE POLICY "Public read drivers"
  ON drivers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert drivers" ON drivers;
CREATE POLICY "Public insert drivers"
  ON drivers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update drivers" ON drivers;
CREATE POLICY "Public update drivers"
  ON drivers FOR UPDATE USING (true) WITH CHECK (true);

-- 4. Seed existing drivers from jobs table (deduplicated)
-- All drivers get PIN 1234 as default
INSERT INTO drivers (name, phone, vehicle_plate, pin, vendor_id)
SELECT DISTINCT ON (j.driver_name)
  j.driver_name,
  j.driver_phone,
  j.vehicle_plate,
  '1234',
  j.vendor_id_assigned
FROM jobs j
WHERE j.driver_name IS NOT NULL
  AND j.driver_name != ''
ON CONFLICT DO NOTHING;

-- 5. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE drivers;
