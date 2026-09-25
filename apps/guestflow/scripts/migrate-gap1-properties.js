/**
 * Gap-point-1 property cleanup (demo lodges).
 *
 * Default: counts only. Never prints guest names or codes.
 * --apply: deletes unreferenced demo property rows (Riverside Lodge,
 * Mountain View Suites, Coastal Retreat) on local SQLite only.
 * Refuses remote Turso. Not run on deploy.
 *
 * Usage:
 *   node scripts/migrate-gap1-properties.js
 *   node scripts/migrate-gap1-properties.js --apply
 */

const path = require('path')

const APPLY = process.argv.includes('--apply')
const dbUrl = process.env.DATABASE_URL || path.join(__dirname, '../data/guestflow.db')
const isRemote = /^libsql:\/\//i.test(dbUrl) || /^https?:\/\//i.test(dbUrl)
const DEMO_NAMES = ['Riverside Lodge', 'Mountain View Suites', 'Coastal Retreat']

async function main() {
  console.log('migrate-gap1-properties:', APPLY ? 'apply (local only)' : 'dry-run counts')
  if (isRemote) {
    console.log('refusing remote Turso URL (no Production writes)')
    process.exit(APPLY ? 1 : 0)
  }

  const Database = require('better-sqlite3')
  const file = String(dbUrl).replace(/^file:/, '')
  const db = new Database(file, { fileMustExist: false })
  try {
    const propertiesExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='properties'`)
      .get()
    if (!propertiesExists) {
      console.log('properties table missing; nothing to count')
      return
    }

    const placeholders = DEMO_NAMES.map(() => '?').join(',')
    const demoRows = db
      .prepare(`SELECT id, name FROM properties WHERE name IN (${placeholders})`)
      .all(...DEMO_NAMES)
    console.log('demo_property_rows:', demoRows.length)

    let unreferenced = 0
    for (const row of demoRows) {
      let refs = 0
      try {
        refs = Number(
          db.prepare(`SELECT COUNT(*) AS c FROM bookings WHERE property_id = ?`).get(row.id)?.c || 0
        )
      } catch {
        refs = 0
      }
      if (refs === 0) unreferenced += 1
    }
    console.log('unreferenced_demo_rows:', unreferenced)

    if (!APPLY) {
      console.log('dry-run: no rows deleted')
      return
    }

    let deleted = 0
    for (const row of demoRows) {
      let refs = 0
      try {
        refs = Number(
          db.prepare(`SELECT COUNT(*) AS c FROM bookings WHERE property_id = ?`).get(row.id)?.c || 0
        )
      } catch {
        refs = 0
      }
      if (refs === 0) {
        db.prepare(`DELETE FROM properties WHERE id = ?`).run(row.id)
        deleted += 1
      }
    }
    console.log('deleted_unreferenced_demo_rows:', deleted)
  } finally {
    db.close()
  }
}

main().catch((error) => {
  console.error('migrate-gap1-properties failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
