/**
 * Read-only BLOCK marker confirmation.
 *
 * Counts bookings whose guest_name is BLOCK (upper/trim).
 * Never prints guest names, phones, or codes.
 * Never writes. Not run on deploy.
 *
 * Usage (local / Preview only — do not point at Production Turso):
 *   node scripts/count-owner-blocks.js
 *   DATABASE_URL=file:./data/guestflow.db node scripts/count-owner-blocks.js
 */

const path = require('path')

const dbUrl = process.env.DATABASE_URL || path.join(__dirname, '../data/guestflow.db')
const isRemote = /^libsql:\/\//i.test(dbUrl) || /^https?:\/\//i.test(dbUrl)

const COUNT_SQL = `
  SELECT COUNT(*) AS count
  FROM bookings
  WHERE UPPER(TRIM(COALESCE(guest_name, ''))) = 'BLOCK'
`

async function main() {
  console.log('count-owner-blocks: dry-run / read-only')
  console.log('marker: upper(trim(guest_name)) = BLOCK')
  if (isRemote) {
    console.log('refusing remote Turso URL (no Production reads from this script)')
    console.log('count: (not queried)')
    process.exit(0)
  }

  const Database = require('better-sqlite3')
  const file = String(dbUrl).replace(/^file:/, '')
  const db = new Database(file, { readonly: true, fileMustExist: false })
  try {
    const row = db.prepare(COUNT_SQL).get()
    console.log('count:', Number(row?.count || 0))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/no such table/i.test(message)) {
      console.log('count: 0 (bookings table missing)')
    } else {
      throw error
    }
  } finally {
    db.close()
  }
}

main().catch((error) => {
  console.error('count-owner-blocks failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
