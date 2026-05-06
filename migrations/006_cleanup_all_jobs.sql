-- ================================================================
-- 006: CLEANUP ALL EXISTING JOBS FOR FRESH TESTING
-- Run this in Supabase SQL Editor to wipe all job data
-- ================================================================
-- WARNING: This deletes ALL jobs including fleet_seed driver records.
-- After running this, vendors will need to re-add their drivers.
-- ================================================================

-- Delete all jobs
DELETE FROM jobs;

-- Verify cleanup
SELECT COUNT(*) AS remaining_jobs FROM jobs;
