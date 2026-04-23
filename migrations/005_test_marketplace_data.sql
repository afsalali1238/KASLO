-- ═══════════════════════════════════════════════════════════════
-- KASPER — Test Data for Vendor Marketplace Flow
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- 
-- This creates dummy data to test all marketplace scenarios:
--   1. Jobs at various pipeline stages
--   2. RFQs sent to vendors (some quoted, some pending)
--   3. Ensures vendor table has entries for the demo
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1. Verify vendors exist (check + insert if missing)
-- ─────────────────────────────────────────────────────────────
INSERT INTO vendors (id, company_name, logo_text, brand_color, contact_phone, contact_email)
VALUES
  ('22222222-2222-2222-2222-222222222222', 'Al Hamd Heavy Transport', '🚚 AL HAMD', '#FF6B00', '+971501234567', 'ops@alhamd.ae'),
  ('33333333-3333-3333-3333-333333333333', 'Gulf Express Transport', '🚛 GULF EXPRESS', '#F59E0B', '+971504500001', 'ops@gulfexpress.ae'),
  ('44444444-4444-4444-4444-444444444444', 'RAK Heavy Movers', '⚙ RAK MOVERS', '#8B5CF6', '+971507700002', 'dispatch@rakmovers.ae'),
  ('55555555-5555-5555-5555-555555555555', 'Sharjah Crane Services', '🏗 SCS', '#EC4899', '+971509900003', 'book@scs.ae')
ON CONFLICT (id) DO UPDATE SET 
  company_name = EXCLUDED.company_name,
  contact_phone = EXCLUDED.contact_phone,
  contact_email = EXCLUDED.contact_email;

-- ─────────────────────────────────────────────────────────────
-- 2. Job: FRESH ENQUIRY (no RFQs yet — test broadcast)
-- ─────────────────────────────────────────────────────────────
INSERT INTO jobs (id, job_code, status, service_type, client_name, client_email, client_phone,
  company_name, origin, destination, cargo_type, pickup_date, quoted_price,
  vendor_id)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'KSP-TEST-ENQUIRY-01',
  'enquiry',
  'logistics',
  'Test Client - Fresh Enquiry',
  'test@client.com',
  '+971551234567',
  'ABC Construction LLC',
  'Jebel Ali Free Zone',
  'Al Quoz Industrial Area 3',
  'Steel Beams (12m)',
  '2026-04-25',
  NULL,
  '11111111-1111-1111-1111-111111111111'
) ON CONFLICT (id) DO UPDATE SET status = 'enquiry', vendor_price = NULL, vendor_id_assigned = NULL, quoted_price = NULL, kasper_margin = NULL;

-- ─────────────────────────────────────────────────────────────
-- 3. Job: RFQ SENT (RFQs broadcast, vendors quoting)
-- ─────────────────────────────────────────────────────────────
INSERT INTO jobs (id, job_code, status, service_type, client_name, client_email, client_phone,
  company_name, origin, destination, cargo_type, pickup_date,
  vendor_id)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'KSP-TEST-RFQSENT-01',
  'rfq_sent',
  'logistics',
  'Test Client - RFQ Active',
  'rfq-test@client.com',
  '+971552222222',
  'XYZ Developers',
  'Dubai Marina',
  'Business Bay',
  'Office Furniture (3 pallets)',
  '2026-04-26',
  '11111111-1111-1111-1111-111111111111'
) ON CONFLICT (id) DO UPDATE SET status = 'rfq_sent', vendor_price = NULL, vendor_id_assigned = NULL, quoted_price = NULL;

-- RFQs for the rfq_sent job: 2 vendors, 1 quoted, 1 still waiting
INSERT INTO vendor_rfqs (id, job_id, vendor_id, status, vendor_price, vendor_notes, quoted_at)
VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '22222222-2222-2222-2222-222222222222',
   'quoted', 850, 'Can do same-day if needed. Have a 7-ton available.', NOW()),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '33333333-3333-3333-3333-333333333333',
   'sent', NULL, NULL, NULL)
ON CONFLICT (job_id, vendor_id) DO UPDATE SET 
  status = EXCLUDED.status,
  vendor_price = EXCLUDED.vendor_price,
  vendor_notes = EXCLUDED.vendor_notes;

-- ─────────────────────────────────────────────────────────────
-- 4. Job: VENDOR SELECTED, waiting for client quote (margin calc)
-- ─────────────────────────────────────────────────────────────
INSERT INTO jobs (id, job_code, status, service_type, client_name, client_email, client_phone,
  company_name, origin, destination, cargo_type, pickup_date,
  vendor_id, vendor_price, vendor_id_assigned)
VALUES (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'KSP-TEST-MARGIN-01',
  'rfq_sent',
  'logistics',
  'Test Client - Margin Calc',
  'margin-test@client.com',
  '+971553333333',
  'DEF Industries',
  'Sharjah Industrial',
  'Dubai Investment Park',
  'Generator Set (2.5T)',
  '2026-04-27',
  '11111111-1111-1111-1111-111111111111',
  750,
  '44444444-4444-4444-4444-444444444444'
) ON CONFLICT (id) DO UPDATE SET status = 'rfq_sent', vendor_price = 750, vendor_id_assigned = '44444444-4444-4444-4444-444444444444', quoted_price = NULL;

-- ─────────────────────────────────────────────────────────────
-- 5. Job: CONFIRMED with vendor assigned (test Vendor PO send)
-- ─────────────────────────────────────────────────────────────
INSERT INTO jobs (id, job_code, status, service_type, client_name, client_email, client_phone,
  company_name, origin, destination, cargo_type, pickup_date,
  vendor_id, vendor_price, vendor_id_assigned, quoted_price, kasper_margin, vendor_po_sent)
VALUES (
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'KSP-TEST-VENDORPO-01',
  'confirmed',
  'logistics',
  'Test Client - Vendor PO',
  'vpo-test@client.com',
  '+971554444444',
  'GHI Contractors',
  'Abu Dhabi ICAD',
  'Khalifa Industrial Zone',
  'Crane Parts',
  '2026-04-28',
  '11111111-1111-1111-1111-111111111111',
  1200,
  '22222222-2222-2222-2222-222222222222',
  1800,
  600,
  false
) ON CONFLICT (id) DO UPDATE SET status = 'confirmed', vendor_price = 1200, vendor_id_assigned = '22222222-2222-2222-2222-222222222222', quoted_price = 1800, kasper_margin = 600, vendor_po_sent = false;

-- ─────────────────────────────────────────────────────────────
-- 6. Job: VENDOR_PO_SENT (vendor needs to assign driver)
-- ─────────────────────────────────────────────────────────────
INSERT INTO jobs (id, job_code, status, service_type, client_name, client_email, client_phone,
  company_name, origin, destination, cargo_type, pickup_date,
  vendor_id, vendor_price, vendor_id_assigned, quoted_price, kasper_margin, vendor_po_sent)
VALUES (
  '11111111-aaaa-bbbb-cccc-dddddddddddd',
  'KSP-TEST-DRIVERASSIGN-01',
  'vendor_po_sent',
  'logistics',
  'Test Client - Driver Assign',
  'driver-test@client.com',
  '+971555555555',
  'JKL Real Estate',
  'DIFC',
  'Al Barsha South',
  'IT Equipment (Server Racks)',
  '2026-04-29',
  '11111111-1111-1111-1111-111111111111',
  900,
  '33333333-3333-3333-3333-333333333333',
  1400,
  500,
  true
) ON CONFLICT (id) DO UPDATE SET status = 'vendor_po_sent', vendor_price = 900, vendor_id_assigned = '33333333-3333-3333-3333-333333333333', quoted_price = 1400, kasper_margin = 500, vendor_po_sent = true;

-- ─────────────────────────────────────────────────────────────
-- 7. Job: COMPLETED job (test payments tab in vendor portal)
-- ─────────────────────────────────────────────────────────────
INSERT INTO jobs (id, job_code, status, service_type, client_name, client_email, client_phone,
  company_name, origin, destination, cargo_type, pickup_date,
  vendor_id, vendor_price, vendor_id_assigned, quoted_price, kasper_margin, vendor_po_sent,
  driver_name, driver_phone, vehicle_plate)
VALUES (
  '22222222-aaaa-bbbb-cccc-dddddddddddd',
  'KSP-TEST-PAYMENT-01',
  'invoiced',
  'logistics',
  'Test Client - Payment',
  'payment-test@client.com',
  '+971556666666',
  'MNO Logistics',
  'Dubai Silicon Oasis',
  'Ajman Free Zone',
  'Electronic Components',
  '2026-04-20',
  '11111111-1111-1111-1111-111111111111',
  650,
  '22222222-2222-2222-2222-222222222222',
  1000,
  350,
  true,
  'Rashid Al Maktoum',
  '+971501112233',
  'Dubai F 99887'
) ON CONFLICT (id) DO UPDATE SET status = 'invoiced', vendor_price = 650, vendor_id_assigned = '22222222-2222-2222-2222-222222222222', quoted_price = 1000, kasper_margin = 350;

-- ─────────────────────────────────────────────────────────────
-- 8. Additional Completed Jobs (to seed Vendor Fleet drop-downs)
-- ─────────────────────────────────────────────────────────────
INSERT INTO jobs (id, job_code, status, service_type, client_name, client_email, client_phone,
  origin, destination, cargo_type, pickup_date,
  vendor_id_assigned, vendor_price, driver_name, driver_phone, vehicle_plate)
VALUES 
(
  'dddddddd-1111-2222-3333-444444444444',
  'KSP-TEST-FLEET-01',
  'delivered',
  'logistics',
  'Fleet Seed Client 1',
  'seed1@client.com',
  '+971550000001',
  'Jebel Ali Freezone',
  'Dubai Marina',
  'Pallet Freight',
  '2026-04-10',
  '33333333-3333-3333-3333-333333333333', -- Sharjah Crane Services
  850,
  'Omar Farooq',
  '+971501234567',
  'SHJ C 7788'
),
(
  'eeeeeeee-1111-2222-3333-444444444444',
  'KSP-TEST-FLEET-02',
  'delivered',
  'equipment',
  'Fleet Seed Client 2',
  'seed2@client.com',
  '+971550000002',
  'Al Quoz Ind 3',
  'Business Bay',
  'Forklift 3-Ton',
  '2026-04-15',
  '33333333-3333-3333-3333-333333333333', -- Sharjah Crane Services
  1200,
  'Ali Reza',
  '+971559876543',
  'SHJ D 9900'
),
(
  'ffffffff-1111-2222-3333-444444444444',
  'KSP-TEST-FLEET-03',
  'delivered',
  'logistics',
  'Fleet Seed Client 3',
  'seed3@client.com',
  '+971550000003',
  'Sharjah Ind 5',
  'Ras Al Khaimah',
  'Building Materials',
  '2026-04-18',
  '22222222-2222-2222-2222-222222222222', -- Al Hamd
  700,
  'Tariq Mahmoud',
  '+971508889999',
  'DXB K 1122'
) ON CONFLICT (id) DO UPDATE SET driver_name = EXCLUDED.driver_name, vehicle_plate = EXCLUDED.vehicle_plate, driver_phone = EXCLUDED.driver_phone;

-- ─────────────────────────────────────────────────────────────
-- 9. RFQ for vendor portal testing (sent to Al Hamd, not yet quoted)
-- ─────────────────────────────────────────────────────────────
INSERT INTO vendor_rfqs (id, job_id, vendor_id, status)
VALUES
  ('eeeeeeee-1111-2222-3333-444444444444',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '22222222-2222-2222-2222-222222222222',
   'sent')
ON CONFLICT (job_id, vendor_id) DO UPDATE SET status = 'sent', vendor_price = NULL;

-- ═══════════════════════════════════════════════════════════════
-- TEST SCENARIOS COVERED:
-- ═══════════════════════════════════════════════════════════════
-- 1. KSP-TEST-ENQUIRY-01     → Ops can broadcast RFQ (Option B)
-- 2. KSP-TEST-RFQSENT-01     → Ops sees vendor responses (1 quoted, 1 pending)  
-- 3. KSP-TEST-MARGIN-01      → Ops sets margin after vendor selected
-- 4. KSP-TEST-VENDORPO-01    → Ops sends vendor PO (profitability card visible)
-- 5. KSP-TEST-DRIVERASSIGN-01→ Vendor assigns driver in vendor.html
-- 6. KSP-TEST-PAYMENT-01     → Vendor sees completed job in Payments tab
-- 7. KSP-TEST-FLEET-01/02/03 → Historical jobs seeding Vendor Fleet dropdowns
-- 8. Al Hamd has 1 pending RFQ → visible in vendor portal RFQs tab
-- ═══════════════════════════════════════════════════════════════
