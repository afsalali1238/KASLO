-- ═══════════════════════════════════════════════════════════════
-- KASPER OS — SaaS Pivot: Multi-Tenant Architecture
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════

-- 1. Create the Vendors table (Tenants)
CREATE TABLE IF NOT EXISTS vendors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name    TEXT NOT NULL,
  logo_text       TEXT,
  logo_url        TEXT,
  brand_color     TEXT DEFAULT '#10B981', -- default teal
  contact_email   TEXT,
  contact_phone   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert Default Kasper Tenant & "Al Hamd" demo tenant
INSERT INTO vendors (id, company_name, logo_text, brand_color)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Kasper Logistics', '⬢ KASPER', '#10B981'),
  ('22222222-2222-2222-2222-222222222222', 'Al Hamd Cargo', '🚚 AL HAMD', '#3B82F6')
ON CONFLICT DO NOTHING;

-- 3. Alter Jobs table to include the vendor reference
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id);

-- 4. Assign all existing "legacy" jobs to Kasper Logistics so they do not break
UPDATE jobs SET vendor_id = '11111111-1111-1111-1111-111111111111' WHERE vendor_id IS NULL;

-- 5. Enable Realtime on Vendors (if we need to listen for profile updates)
ALTER PUBLICATION supabase_realtime ADD TABLE vendors;

-- ═══════════════════════════════════════════════════════════════
-- 6. Seed Data for Al Hamd Cargo (Partner Vendor Demo)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO jobs (job_code, status, service_type, client_name, client_phone, client_email, company_name, origin, destination, cargo_type, pickup_date, vendor_id)
VALUES
  ('AHC-20260420-0001','enquiry','logistics','Rashid Al Maktoum','+971504001001','rashid@almaari.ae','Al Maari Construction','Sharjah','Ajman','container','2026-04-22','22222222-2222-2222-2222-222222222222'),
  ('AHC-20260420-0002','quoted','logistics','Fatima Hassan','+971505002002','fatima@gulfbuild.ae','Gulf Build LLC','Dubai','Sharjah','materials','2026-04-23','22222222-2222-2222-2222-222222222222'),
  ('AHC-20260420-0003','confirmed','logistics','Omar Saeed','+971506003003','omar@skyline.ae','Skyline Contracting','Fujairah','Sharjah','steel','2026-04-24','22222222-2222-2222-2222-222222222222'),
  ('AHC-20260420-0004','in_transit','logistics','Noura Al Ali','+971507004004','noura@emiratesbuild.ae','Emirates Build Co','Khor Fakkan','Dubai','container','2026-04-21','22222222-2222-2222-2222-222222222222'),
  ('AHC-20260420-0005','delivered','logistics','Ahmed Khalifa','+971508005005','ahmed@masdar.ae','Masdar Projects','Abu Dhabi','Sharjah','equipment','2026-04-20','22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

-- Add driver + price to the in_transit and delivered jobs
UPDATE jobs SET quoted_price=1800, driver_name='Salim Khoury', vehicle_plate='Sharjah C 44521', driver_phone='+971559887766'
  WHERE job_code='AHC-20260420-0004';
UPDATE jobs SET quoted_price=2200, driver_name='Salim Khoury', vehicle_plate='Sharjah C 44521', driver_phone='+971559887766'
  WHERE job_code='AHC-20260420-0005';
UPDATE jobs SET quoted_price=1500 WHERE job_code='AHC-20260420-0002';
UPDATE jobs SET quoted_price=2800, approval_timestamp=NOW() WHERE job_code='AHC-20260420-0003';
npm config set strict-ssl false