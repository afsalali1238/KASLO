-- ═══════════════════════════════════════════════════════════════
-- KASPER — Comprehensive Seed Data (All Pipeline Steps)
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════

-- This will insert 7 new jobs representing every stage of the pipeline.
-- It uses fresh job codes so it will NOT conflict with existing data.

INSERT INTO jobs (job_code, status, service_type, client_name, client_phone, client_email, company_name,
  origin, destination, cargo_type, pickup_date, quoted_price, quote_notes, quote_sent_at, driver_name, vehicle_plate, epod_driver_done, epod_client_done, invoice_url)
VALUES
  -- 1. ENQUIRY (New booking, needs Ops action)
  ('KSP-20260420-0101', 'enquiry', 'logistics', 'Hassan Ali', '050 111 2222', 'hassan@buildtech.ae',
   'BuildTech LLC', 'Sharjah Industrial 3', 'JVT, Dubai', 'Building Materials',
   '2026-04-21', NULL, NULL, NULL, NULL, NULL, false, false, NULL),

  -- 2. QUOTED (Ops sent price, waiting for Client approval)
  ('KSP-20260420-0102', 'quoted', 'equipment', 'Sarah Connor', '055 333 4444', 'sarah@skyline.ae',
   'Skyline Developers', NULL, NULL, NULL,
   '2026-04-22', 1500, 'Boom truck 10T for 1 day', NOW(), NULL, NULL, false, false, NULL),

  -- 3. CONFIRMED (Client approved/Force approved, waiting for Ops to Assign Driver)
  ('KSP-20260420-0103', 'confirmed', 'logistics', 'Omer Farooq', '056 555 6666', 'omer@desertgroup.ae',
   'Desert Group', 'Jebel Ali Freezone', 'Dubai Marina', 'Pallets',
   '2026-04-20', 800, 'Standard run', NOW(), NULL, NULL, false, false, NULL),

  -- 4. ASSIGNED (Driver pending/waiting to start trip)
  ('KSP-20260420-0104', 'assigned', 'logistics', 'Tariq Saeed', '052 777 8888', 'tariq@gulfsteel.ae',
   'Gulf Steel', 'Mussafah, Abu Dhabi', 'DIP, Dubai', 'Steel Rebar',
   '2026-04-20', 1200, 'Heavy load', NOW(), 'Ahmed Al Rashidi', 'Dubai A 12345', false, false, NULL),

  -- 5. IN_TRANSIT (Driver clicked Start Trip, Client can live track)
  ('KSP-20260420-0105', 'in_transit', 'equipment', 'Liam Neeson', '058 999 0000', 'liam@actionbuild.ae',
   'Action Build', NULL, NULL, NULL,
   '2026-04-20', 2500, 'Lowbed movement', NOW(), 'Ahmed Al Rashidi', 'Dubai A 12345', false, false, NULL),

  -- 6. EPOD_PENDING (Driver released ePOD, waiting for Client sign-off)
  ('KSP-20260420-0106', 'epod_pending', 'logistics', 'John Smith', '054 123 9876', 'john@rapidlogistics.ae',
   'Rapid Logistics', 'Khor Fakkan Port', 'Al Quoz, Dubai', 'Import Container',
   '2026-04-19', 1100, NULL, NOW(), 'Ahmed Al Rashidi', 'Dubai A 12345', true, false, NULL),

  -- 7. INVOICED (Completed & invoiced by Ops)
  ('KSP-20260420-0107', 'invoiced', 'logistics', 'Ali Raza', '055 456 1234', 'ali@apex.ae',
   'Apex Construction', 'Fujairah Port', 'Business Bay', 'Cement Bags',
   '2026-04-18', 950, NULL, NOW(), 'Kareem Al Sayed', 'Sharjah 54321', true, true, 'https://example.com/invoice.pdf');
