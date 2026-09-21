-- Migration: Phase 17 Hotfix - Ensure updated_at column exists
-- 
-- This SQL file can be run directly on Turso Production if updated_at is missing.
-- It mirrors the ALTER ADD IF MISSING pattern from ensurePhase17Columns().
--
-- Usage:
--   turso db shell <DB_NAME> < apps/guestflow/scripts/migrate-phase17-updated-at.sql
--
-- Or execute each statement manually if your Turso version doesn't support IF NOT EXISTS for columns.

-- Add missing Phase 17 columns (IF NOT EXISTS requires Turso CLI; adjust if not supported)
ALTER TABLE bookings ADD COLUMN guest_name_norm TEXT;
ALTER TABLE bookings ADD COLUMN suite_or_unit_norm TEXT;
ALTER TABLE bookings ADD COLUMN nightsbridge_booking_id TEXT;
ALTER TABLE bookings ADD COLUMN last_import_at DATETIME;
ALTER TABLE bookings ADD COLUMN import_batch_id TEXT;
ALTER TABLE bookings ADD COLUMN source TEXT DEFAULT 'nb';
ALTER TABLE bookings ADD COLUMN last_seen_import_at DATETIME;
ALTER TABLE bookings ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Create indexes (IF NOT EXISTS is safe)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_nbid 
  ON bookings(tenant_id, nightsbridge_booking_id) 
  WHERE nightsbridge_booking_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_natural_key 
  ON bookings(tenant_id, guest_name_norm, check_in, check_out, suite_or_unit_norm);

-- Verify the column exists
SELECT name FROM pragma_table_info('bookings') WHERE name = 'updated_at';
