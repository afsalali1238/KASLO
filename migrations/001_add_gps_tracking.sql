-- ═══════════════════════════════════════════════════════════════
-- KASPER — Add Live GPS Tracking Columns
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════

-- Add GPS columns to existing jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS driver_lat DOUBLE PRECISION;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS driver_lng DOUBLE PRECISION;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS driver_location_updated_at TIMESTAMPTZ;

-- Enable realtime on jobs table (needed for live tracking subscriptions)
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
