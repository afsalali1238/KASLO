-- ═══════════════════════════════════════════════════════════════
-- KASPER OS — Job Events Timeline
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════

-- 1. Create job_events table
CREATE TABLE IF NOT EXISTS job_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID REFERENCES jobs(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL, -- e.g., 'status_change', 'driver_assigned', 'epod_submitted'
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS policies
ALTER TABLE job_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read job events" ON job_events;
CREATE POLICY "Public read job events"
  ON job_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert job events" ON job_events;
CREATE POLICY "Public insert job events"
  ON job_events FOR INSERT WITH CHECK (true);

-- 3. Trigger to auto-create events on status change
CREATE OR REPLACE FUNCTION log_job_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO job_events (job_id, event_type, note)
    VALUES (
      NEW.id,
      'status_change',
      'Status updated to ' || NEW.status
    );
  END IF;
  
  -- Also log driver assignment specifically if it changes from null
  IF OLD.driver_name IS NULL AND NEW.driver_name IS NOT NULL THEN
    INSERT INTO job_events (job_id, event_type, note)
    VALUES (
      NEW.id,
      'driver_assigned',
      'Driver ' || NEW.driver_name || ' assigned to booking'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS jobs_event_logger ON jobs;
CREATE TRIGGER jobs_event_logger
  AFTER UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION log_job_status_change();

-- 4. Initial seed for existing jobs (so the timeline isn't completely empty)
INSERT INTO job_events (job_id, event_type, note, created_at)
SELECT id, 'status_change', 'Status updated to ' || status, created_at
FROM jobs
ON CONFLICT DO NOTHING;
