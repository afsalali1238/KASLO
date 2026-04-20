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
