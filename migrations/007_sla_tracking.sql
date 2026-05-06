-- ═══════════════════════════════════════════════════════════════
-- KASPER OS — SLA Tracking (Status Changes)
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════

-- 1. Add last_status_changed_at column
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_status_changed_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create trigger to ONLY update last_status_changed_at when status changes
CREATE OR REPLACE FUNCTION update_last_status_changed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.last_status_changed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS jobs_status_changed ON jobs;
CREATE TRIGGER jobs_status_changed
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_last_status_changed_at();

-- 3. Backfill existing rows
UPDATE jobs SET last_status_changed_at = updated_at WHERE last_status_changed_at IS NULL;
