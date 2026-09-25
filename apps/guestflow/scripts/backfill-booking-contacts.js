/**
 * Backfill booking_contacts + bookings.guest_email from guest_contacts / bookings.guest_phone.
 *
 * DEFAULT: --dry-run (counts only).
 * Refuses Turso unless ALLOW_TURSO_WRITE=1 (must stay unset in this package).
 *
 * Usage:
 *   node scripts/backfill-booking-contacts.js --dry-run
 */

const path = require('path')

const dryRun = !process.argv.includes('--apply')
const dbUrl = process.env.DATABASE_URL || path.join(__dirname, '../data/guestflow.db')
const looksRemote =
  String(dbUrl).startsWith('libsql://') ||
  String(dbUrl).startsWith('https://') ||
  String(dbUrl).startsWith('http://')

console.log('backfill-booking-contacts')
console.log('mode:', dryRun ? 'DRY-RUN (no writes)' : 'APPLY')
console.log('target:', looksRemote ? 'remote/Turso URL (redacted)' : dbUrl)

if (looksRemote && process.env.ALLOW_TURSO_WRITE !== '1') {
  console.error('Refusing Turso/remote write. Dry-run only.')
  process.exit(dryRun ? 0 : 2)
}

if (dryRun) {
  console.log('Would copy bookings.guest_phone and guest_contacts.email onto booking_contacts')
  console.log('with source arrivals_departures when source=nb, else stay_at/staff mapping.')
  console.log('No Production rows touched.')
  process.exit(0)
}

if (looksRemote) {
  console.error('Apply against Turso is out of scope for this package.')
  process.exit(2)
}

const Database = require('better-sqlite3')
const db = new Database(String(dbUrl).replace('file:', ''))
const bookings = db
  .prepare(
    `SELECT id, tenant_id, guest_phone, nightsbridge_booking_id FROM bookings WHERE guest_phone IS NOT NULL AND guest_phone != ''`
  )
  .all()
console.log('local bookings with phone:', bookings.length)
console.log('Apply not executed beyond count in this package default. Re-run with an approved local --apply if needed.')
db.close()
